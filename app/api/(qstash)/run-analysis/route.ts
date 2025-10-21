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
import AnalysisPair from "@/lib/models/analysisPair";
import { qstash } from "@/lib/qstash";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { Types } from "mongoose";

// Background analysis function
async function runAnalysisInBackground({
  brandId,
  userId,
  currentPair,
  remainingPairs,
  analysisId,
  analysisStartedAt,
}: {
  brandId: string;
  userId: string;
  currentPair: {
    model: AIModel;
    stage: AnalysisStage;
  };
  remainingPairs: {
    model: AIModel;
    stage: AnalysisStage;
  }[];
  analysisId: string;
  analysisStartedAt: Date;
}) {
  try {
    console.log(
      `🚀 Running analysis ${analysisId}: ${currentPair.model}-${currentPair.stage}`
    );
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

    try {
      // update the analysis progress current task to the current pair
      await AnalysisStatus.findOneAndUpdate(
        { analysis_id: analysisId },
        {
          $set: {
            "progress.current_task": `Running analysis for ${currentPair.model}-${currentPair.stage}`,
          },
        }
      );

      // Mark pair as running
      await AnalysisPair.findOneAndUpdate(
        {
          analysis_id: analysisId,
          model: currentPair.model,
          stage: currentPair.stage,
        },
        { status: "running" }
      );

      // Run actual AI analysis
      const result = await AIService.analyzeWithMultiplePrompts(
        brand,
        currentPair.model,
        currentPair.stage
      );
      if (!result) throw new Error("AI result empty");

      await DataOrganizationService.processAndStoreAnalysis(
        brandId,
        currentPair.model,
        currentPair.stage,
        result,
        userId,
        "manual"
      );

      // Mark pair completed
      await AnalysisPair.findOneAndUpdate(
        {
          analysis_id: analysisId,
          model: currentPair.model,
          stage: currentPair.stage,
        },
        { status: "completed" }
      );

      // Update global progress
      const status = await AnalysisStatus.findOne({ analysis_id: analysisId });
      const completedTasks = (status?.progress?.completed_tasks || 0) + 1;

      await AnalysisStatus.findOneAndUpdate(
        { analysis_id: analysisId },
        {
          $set: {
            "progress.completed_tasks": completedTasks,
            "progress.current_task": `Completed analysis for ${currentPair.model}-${currentPair.stage}`,
          },
        }
      );

      console.log(
        `✅ Finished ${currentPair.model}-${currentPair.stage} (${completedTasks}/${status.progress.total_tasks})`
      );

      // Trigger next pair if any
      if (remainingPairs && remainingPairs.length > 0) {
        const [nextPair, ...nextRemaining] = remainingPairs;

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
        const webhookUrl = `${baseUrl}/api/run-analysis`;

        console.log(
          `Scheduling next pair: ${nextPair.model}-${nextPair.stage}`
        );
        await qstash.publishJSON({
          url: webhookUrl,
          body: {
            brandName: brand.name,
            brandId,
            userId,
            analysisId,
            currentPair: nextPair,
            remainingPairs: nextRemaining,
            analysisStartedAt,
          },
        });

        console.log(
          `🔁 Triggered next pair: ${nextPair.model}-${nextPair.stage}`
        );
      } else {
        // All done — mark analysis complete
        await AnalysisStatus.findOneAndUpdate(
          { analysis_id: analysisId },
          {
            $set: {
              status: "completed",
              "progress.current_task": "All analyses completed",
            },
          }
        );

        // fetch the analysis result from the database which are created after the analysis started at
        const analysisResults = await MultiPromptAnalysis.find({
          brand_id: new Types.ObjectId(brandId),
          createdAt: { $gte: analysisStartedAt },
        });

        // Calculate summary statistics
        const totalAnalyses = analysisResults.length;
        const totalAnalysisTime = Date.now() - currentAnalysis.started_at;
        const avgScore =
          analysisResults.length > 0
            ? analysisResults.reduce((sum, r) => sum + r.overall_score, 0) /
              analysisResults.length
            : 0;
        const avgWeightedScore =
          analysisResults.length > 0
            ? analysisResults.reduce((sum, r) => sum + r.weighted_score, 0) /
              analysisResults.length
            : 0;

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

        console.log(`🎉 Analysis ${analysisId} completed successfully!`);
      }

      return NextResponse.json({ success: true });
    } catch (err) {
      console.error(
        `❌ Error processing ${currentPair.model}-${currentPair.stage}:`,
        err
      );

      await AnalysisPair.findOneAndUpdate(
        {
          analysis_id: analysisId,
          model: currentPair.model,
          stage: currentPair.stage,
        },
        { status: "failed" }
      );

      return NextResponse.json(
        { message: "Error", error: err },
        { status: 500 }
      );
    }
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
    brandId,
    userId,
    analysisId,
    currentPair,
    remainingPairs,
    analysisStartedAt,
  } = body;

  // Run analysis in background
  runAnalysisInBackground({
    brandId,
    userId,
    currentPair,
    remainingPairs,
    analysisId,
    analysisStartedAt,
  });

  return NextResponse.json({ status: "done" });
}

export const POST = verifySignatureAppRouter(handler);
