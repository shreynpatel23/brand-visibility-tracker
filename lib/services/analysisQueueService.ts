import connect from "@/lib/db";
import AnalysisStatus from "@/lib/models/analysisStatus";
import Brand from "@/lib/models/brand";
import User from "@/lib/models/user";
import { AIService } from "@/lib/services/aiService";
import { DataOrganizationService } from "@/lib/services/dataOrganizationService";
import { sendEmail } from "@/utils/sendEmail";
import { analysisCompletionEmailTemplate } from "@/utils/analysisCompletionEmailTemplate";
import { AIModel, AnalysisStage } from "@/types";

export interface AnalysisJob {
  brandId: string;
  userId: string;
  models: AIModel[];
  stages: AnalysisStage[];
  analysisId: string;
}

export class AnalysisQueueService {
  /**
   * Process a single analysis job with better error handling and timeout management
   */
  static async processAnalysisJob(job: AnalysisJob): Promise<void> {
    const { brandId, userId, models, stages, analysisId } = job;

    try {
      console.log(`Starting analysis job ${analysisId} for brand ${brandId}`);

      // Re-establish database connection
      await connect();

      // Update analysis status to indicate processing has started
      await AnalysisStatus.findOneAndUpdate(
        { analysis_id: analysisId },
        {
          $set: {
            "progress.current_task": "Connecting to AI services...",
          },
        }
      );

      // Get brand and user details
      const brand = await Brand.findById(brandId);
      const user = await User.findById(userId);

      if (!brand || !user) {
        throw new Error("Brand or user not found for background analysis");
      }

      const analysisStartTime = Date.now();
      const totalTasks = models.length * stages.length;
      let completedTasks = 0;
      const analysisResults = [];

      // Process each model-stage combination individually for better progress tracking
      for (const model of models) {
        for (const stage of stages) {
          try {
            console.log(
              `Processing ${model} - ${stage} for analysis ${analysisId}`
            );

            // Update progress before starting each task
            await AnalysisStatus.findOneAndUpdate(
              { analysis_id: analysisId },
              {
                $set: {
                  "progress.current_task": `Analyzing ${model} - ${stage}...`,
                  "progress.completed_tasks": completedTasks,
                },
              }
            );

            // Run analysis for this specific model-stage combination
            const result = await AIService.analyzeWithMultiplePrompts(
              brand,
              model,
              stage
            );

            // Validate result data before processing
            if (
              !result ||
              typeof result.overallScore !== "number" ||
              typeof result.weightedScore !== "number"
            ) {
              console.error(
                `Invalid result data for ${model}-${stage}:`,
                result
              );
              completedTasks++;
              continue;
            }

            // Use the enhanced data organization service
            const organizedData =
              await DataOrganizationService.processAndStoreAnalysis(
                brandId,
                model,
                stage,
                result,
                userId,
                "manual"
              );

            analysisResults.push({
              model,
              stage,
              result: {
                analysisId: organizedData.analysis_id,
                overallScore: organizedData.overall_score,
                weightedScore: organizedData.weighted_score,
                mentionRate: organizedData.mention_rate,
                topPositionRate: organizedData.top_position_rate,
                performanceLevel: organizedData.performance_level,
                primaryInsight: organizedData.primary_insight,
                recommendations: organizedData.recommendations,
                totalResponseTime: organizedData.metadata.total_processing_time,
                successRate:
                  (organizedData.metadata.successful_prompts /
                    organizedData.metadata.total_prompts) *
                  100,
                aggregatedSentiment: organizedData.sentiment_analysis,
              },
            });

            // Update progress after completing each task
            completedTasks++;
            await AnalysisStatus.findOneAndUpdate(
              { analysis_id: analysisId },
              {
                $set: {
                  "progress.completed_tasks": completedTasks,
                  "progress.current_task": `Completed ${model}-${stage} (${completedTasks}/${totalTasks})`,
                },
              }
            );

            console.log(
              `Completed ${model} - ${stage} for analysis ${analysisId}`
            );
          } catch (taskError) {
            console.error(
              `Error processing ${model}-${stage} for analysis ${analysisId}:`,
              taskError
            );

            // Still update progress even if this task failed
            completedTasks++;
            await AnalysisStatus.findOneAndUpdate(
              { analysis_id: analysisId },
              {
                $set: {
                  "progress.completed_tasks": completedTasks,
                  "progress.current_task": `Error in ${model}-${stage} (${completedTasks}/${totalTasks})`,
                },
              }
            );
          }
        }
      }

      // Complete the analysis
      await this.completeAnalysis(
        analysisId,
        analysisResults,
        analysisStartTime,
        brand,
        user
      );
    } catch (error) {
      console.error(`Analysis job ${analysisId} failed:`, error);
      await this.failAnalysis(analysisId, error, userId, brandId);
    }
  }

  /**
   * Complete the analysis and send notification
   */
  private static async completeAnalysis(
    analysisId: string,
    analysisResults: any[],
    analysisStartTime: number,
    brand: any,
    user: any
  ): Promise<void> {
    const totalAnalysisTime = Date.now() - analysisStartTime;

    // Calculate summary statistics
    const totalAnalyses = analysisResults.length;
    const avgScore =
      analysisResults.length > 0
        ? analysisResults.reduce((sum, r) => sum + r.result.overallScore, 0) /
          analysisResults.length
        : 0;
    const avgWeightedScore =
      analysisResults.length > 0
        ? analysisResults.reduce((sum, r) => sum + r.result.weightedScore, 0) /
          analysisResults.length
        : 0;

    // Update analysis status to completed
    await AnalysisStatus.findOneAndUpdate(
      { analysis_id: analysisId },
      {
        $set: {
          status: "completed",
          completed_at: new Date(),
          "progress.current_task": "Analysis completed successfully!",
        },
      }
    );

    // Send completion email
    const dashboardLink = `${process.env.NEXT_PUBLIC_BASE_URL}/${user._id}/brands/${brand._id}/dashboard`;
    const emailTemplate = analysisCompletionEmailTemplate(
      brand.name,
      dashboardLink,
      {
        totalAnalyses,
        averageScore: Math.round(avgScore * 100) / 100,
        averageWeightedScore: Math.round(avgWeightedScore * 100) / 100,
        completionTime: totalAnalysisTime,
      }
    );

    await sendEmail(
      user.email,
      `Analysis Complete - ${brand.name}`,
      emailTemplate
    );

    console.log(`Analysis ${analysisId} completed successfully`);
  }

  /**
   * Mark analysis as failed and send notification
   */
  private static async failAnalysis(
    analysisId: string,
    error: any,
    userId: string,
    brandId: string
  ): Promise<void> {
    try {
      // Update analysis status to failed
      await AnalysisStatus.findOneAndUpdate(
        { analysis_id: analysisId },
        {
          $set: {
            status: "failed",
            completed_at: new Date(),
            error_message:
              error instanceof Error ? error.message : "Unknown error",
            "progress.current_task": "Analysis failed",
          },
        }
      );

      // Try to send error notification email
      const user = await User.findById(userId);
      const brand = await Brand.findById(brandId);

      if (user && brand) {
        await sendEmail(
          user.email,
          `Analysis Failed - ${brand.name}`,
          `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
              <h2>Analysis Failed</h2>
              <p>Unfortunately, the analysis for <strong>${
                brand.name
              }</strong> failed to complete.</p>
              <p>Please try again or contact support if the issue persists.</p>
              <p>Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }</p>
            </div>
          `
        );
      }
    } catch (failureError) {
      console.error("Failed to handle analysis failure:", failureError);
    }
  }

  /**
   * Check for and resume stuck analyses
   */
  static async resumeStuckAnalyses(): Promise<number> {
    try {
      await connect();

      // Find analyses that have been running for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const stuckAnalyses = await AnalysisStatus.find({
        status: "running",
        started_at: { $lt: tenMinutesAgo },
      }).limit(3); // Process max 3 at a time

      console.log(`Found ${stuckAnalyses.length} stuck analyses to resume`);

      for (const analysis of stuckAnalyses) {
        const job: AnalysisJob = {
          brandId: analysis.brand_id.toString(),
          userId: analysis.user_id.toString(),
          models: analysis.models,
          stages: analysis.stages,
          analysisId: analysis.analysis_id,
        };

        // Process the stuck analysis
        await this.processAnalysisJob(job);
      }

      return stuckAnalyses.length;
    } catch (error) {
      console.error("Error resuming stuck analyses:", error);
      return 0;
    }
  }
}
