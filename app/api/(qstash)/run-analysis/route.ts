// app/api/process-job/route.ts
import { NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { AIModel, AnalysisStage } from "@/types/brand";
import connect from "@/lib/db";
import Brand from "@/lib/models/brand";
import User from "@/lib/models/user";
import { AIService } from "@/lib/services/aiService";
import { DataOrganizationService } from "@/lib/services/dataOrganizationService";
import { analysisCompletionEmailTemplate } from "@/utils/analysisCompletionEmailTemplate";
import { sendEmail } from "@/utils/sendEmail";
import AnalysisStatus from "@/lib/models/analysisStatus";

// Background analysis function
async function runAnalysisInBackground(
  brandId: string,
  userId: string,
  models: AIModel[],
  stages: AnalysisStage[],
  analysisId: string
) {
  try {
    console.log(`🚀 Starting background analysis ${analysisId}`);
    await connect();

    // Get current analysis status
    const currentAnalysis = await AnalysisStatus.findOne({
      analysis_id: analysisId,
    });

    if (!currentAnalysis) {
      console.log(`❌ Analysis ${analysisId} not found`);
      return;
    }

    if (currentAnalysis.status !== "running") {
      console.log(
        `⏹️ Analysis ${analysisId} is not running (${currentAnalysis.status})`
      );
      return;
    }

    // Get brand and user details
    const brand = await Brand.findById(brandId);
    const user = await User.findById(userId);

    if (!brand || !user) {
      throw new Error("Brand or user not found for background analysis");
    }

    const totalTasks = models.length * stages.length;
    let completedTasks = currentAnalysis.progress?.completed_tasks || 0;
    const analysisResults = [];

    console.log(
      `📊 Analysis progress: ${completedTasks}/${totalTasks} tasks completed`
    );

    // Create all model-stage combinations
    const allCombinations = [];
    for (const model of models) {
      for (const stage of stages) {
        allCombinations.push({ model, stage });
      }
    }

    // Process from where we left off
    for (let i = completedTasks; i < allCombinations.length; i++) {
      const { model, stage } = allCombinations[i];

      try {
        console.log(
          `🔄 Processing ${model} - ${stage} (${i + 1}/${totalTasks})`
        );

        // Update progress before starting this task
        await AnalysisStatus.findOneAndUpdate(
          { analysis_id: analysisId, status: "running" },
          {
            $set: {
              "progress.current_task": `Analyzing ${model} - ${stage}...`,
              "progress.completed_tasks": i,
              updatedAt: new Date(),
            },
          }
        );

        // Check if analysis is still running
        const statusCheck = await AnalysisStatus.findOne({
          analysis_id: analysisId,
        });

        if (!statusCheck || statusCheck.status !== "running") {
          console.log(`⏹️ Analysis ${analysisId} was stopped, exiting`);
          return;
        }

        // Run the actual AI analysis
        const result = await AIService.analyzeWithMultiplePrompts(
          brand,
          model,
          stage
        );

        // Validate result
        if (
          !result ||
          typeof result.overallScore !== "number" ||
          typeof result.weightedScore !== "number"
        ) {
          console.error(`❌ Invalid result for ${model}-${stage}:`, result);
          continue;
        }

        // Store the analysis result
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

        // Update progress after completing this task
        completedTasks = i + 1;
        await AnalysisStatus.findOneAndUpdate(
          { analysis_id: analysisId, status: "running" },
          {
            $set: {
              "progress.completed_tasks": completedTasks,
              "progress.current_task": `Completed ${model}-${stage} (${completedTasks}/${totalTasks})`,
              updatedAt: new Date(),
            },
          }
        );

        console.log(
          `✅ Completed ${model} - ${stage} (${completedTasks}/${totalTasks})`
        );
      } catch (taskError) {
        console.error(`❌ Error processing ${model}-${stage}:`, taskError);

        // Still update progress even if this task failed
        completedTasks = i + 1;
        await AnalysisStatus.findOneAndUpdate(
          { analysis_id: analysisId, status: "running" },
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

    // Calculate summary statistics
    const totalAnalyses = analysisResults.length;
    const totalAnalysisTime = Date.now() - currentAnalysis.started_at;
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
    const dashboardLink = `${process.env.NEXT_PUBLIC_BASE_URL}/${userId}/brands/${brandId}/dashboard`;
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
  } catch (error) {
    console.error("Background analysis error:", error);

    // Try to send error notification email
    try {
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
    } catch (emailError) {
      console.error("Failed to send error notification email:", emailError);
    }
  }
}

async function handler(req: Request) {
  const body = await req.json();

  // extract brandId, userId, modelsToAnalyse and stagesToAnalyse
  const {
    brandName,
    brandId,
    userId,
    modelsToAnalyze,
    stagesToAnalyze,
    analysisId,
  } = body;

  // Start analysis in background
  console.log(`Triggering background analysis for brand ${brandName}`);

  // Run analysis in background
  runAnalysisInBackground(
    brandId,
    userId,
    modelsToAnalyze,
    stagesToAnalyze,
    analysisId
  );

  return NextResponse.json({ status: "done" });
}

export const POST = verifySignatureAppRouter(handler);
