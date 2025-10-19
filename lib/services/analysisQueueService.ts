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

      // Check if analysis is already completed or being processed by another instance
      const currentStatus = await AnalysisStatus.findOne({
        analysis_id: analysisId,
      });

      if (!currentStatus) {
        console.log(`Analysis ${analysisId} not found, skipping processing`);
        return;
      }

      if (currentStatus.status !== "running") {
        console.log(
          `Analysis ${analysisId} is no longer running (status: ${currentStatus.status}), skipping processing`
        );
        return;
      }

      // Check if another instance is actively processing this analysis (updated within last 2 minutes)
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      if (
        currentStatus.updatedAt > twoMinutesAgo &&
        currentStatus.progress?.current_task &&
        !currentStatus.progress.current_task.startsWith("RESUMING:")
      ) {
        console.log(
          `Analysis ${analysisId} appears to be actively processing by another instance, skipping`
        );
        return;
      }

      // Atomically claim this analysis for processing
      const claimedAnalysis = await AnalysisStatus.findOneAndUpdate(
        {
          analysis_id: analysisId,
          status: "running",
        },
        {
          $set: {
            "progress.current_task": "Connecting to AI services...",
            updatedAt: new Date(),
          },
        },
        { new: true }
      );

      if (!claimedAnalysis) {
        console.log(
          `Could not claim analysis ${analysisId} for processing, skipping`
        );
        return;
      }

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

            // Check if analysis is still running before processing each task
            const statusCheck = await AnalysisStatus.findOne({
              analysis_id: analysisId,
            });
            if (!statusCheck || statusCheck.status !== "running") {
              console.log(
                `Analysis ${analysisId} is no longer running, stopping processing`
              );
              return;
            }

            // Update progress before starting each task with atomic operation
            const progressUpdate = await AnalysisStatus.findOneAndUpdate(
              {
                analysis_id: analysisId,
                status: "running", // Only update if still running
              },
              {
                $set: {
                  "progress.current_task": `Analyzing ${model} - ${stage}...`,
                  "progress.completed_tasks": completedTasks,
                  updatedAt: new Date(),
                },
              },
              { new: true }
            );

            if (!progressUpdate) {
              console.log(
                `Could not update progress for analysis ${analysisId}, stopping processing`
              );
              return;
            }

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

            // Update progress after completing each task with atomic operation
            completedTasks++;
            await AnalysisStatus.findOneAndUpdate(
              {
                analysis_id: analysisId,
                status: "running", // Only update if still running
              },
              {
                $set: {
                  "progress.completed_tasks": completedTasks,
                  "progress.current_task": `Completed ${model}-${stage} (${completedTasks}/${totalTasks})`,
                  updatedAt: new Date(),
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
              {
                analysis_id: analysisId,
                status: "running", // Only update if still running
              },
              {
                $set: {
                  "progress.completed_tasks": completedTasks,
                  "progress.current_task": `Error in ${model}-${stage} (${completedTasks}/${totalTasks})`,
                  updatedAt: new Date(),
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
   * Check for and resume stuck analyses with atomic locking to prevent duplicates
   */
  static async resumeStuckAnalyses(): Promise<number> {
    try {
      await connect();

      // Find analyses that have been running for more than 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const maxProcessingAttempts = 3; // Limit concurrent processing
      let processedCount = 0;

      console.log(
        `Checking for stuck analyses older than ${tenMinutesAgo.toISOString()}`
      );

      // Process stuck analyses one by one with atomic locking
      for (let i = 0; i < maxProcessingAttempts; i++) {
        // Use findOneAndUpdate to atomically claim a stuck analysis
        // This prevents multiple cron instances from processing the same analysis
        const claimedAnalysis = await AnalysisStatus.findOneAndUpdate(
          {
            status: "running",
            started_at: { $lt: tenMinutesAgo },
            // Ensure we don't process analyses that are already being resumed
            // by checking if the progress.current_task doesn't indicate resumption
            $or: [
              { "progress.current_task": { $exists: false } },
              { "progress.current_task": { $not: /^RESUMING:/ } },
            ],
          },
          {
            $set: {
              "progress.current_task": `RESUMING: Claimed by cron at ${new Date().toISOString()}`,
              updatedAt: new Date(),
            },
          },
          {
            new: true, // Return the updated document
            sort: { started_at: 1 }, // Process oldest first
          }
        );

        // If no analysis was claimed, break the loop
        if (!claimedAnalysis) {
          console.log(
            `No more stuck analyses to process (attempt ${
              i + 1
            }/${maxProcessingAttempts})`
          );
          break;
        }

        console.log(
          `Claimed stuck analysis ${claimedAnalysis.analysis_id} for processing`
        );

        try {
          const job: AnalysisJob = {
            brandId: claimedAnalysis.brand_id.toString(),
            userId: claimedAnalysis.user_id.toString(),
            models: claimedAnalysis.models,
            stages: claimedAnalysis.stages,
            analysisId: claimedAnalysis.analysis_id,
          };

          // Process the stuck analysis
          await this.processAnalysisJob(job);
          processedCount++;

          console.log(
            `Successfully resumed analysis ${claimedAnalysis.analysis_id}`
          );
        } catch (processingError) {
          console.error(
            `Failed to process claimed analysis ${claimedAnalysis.analysis_id}:`,
            processingError
          );

          // Mark the analysis as failed since we couldn't process it
          await this.failAnalysis(
            claimedAnalysis.analysis_id,
            processingError,
            claimedAnalysis.user_id.toString(),
            claimedAnalysis.brand_id.toString()
          );
        }
      }

      console.log(
        `Cron job completed. Processed ${processedCount} stuck analyses.`
      );
      return processedCount;
    } catch (error) {
      console.error("Error resuming stuck analyses:", error);
      return 0;
    }
  }
}
