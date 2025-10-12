import { NextResponse } from "next/server";
import connect from "@/lib/db";
import { Types } from "mongoose";
import Brand from "@/lib/models/brand";
import MultiPromptAnalysis from "@/lib/models/multiPromptAnalysis";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { Membership } from "@/lib/models/membership";
import { AIService } from "@/lib/services/aiService";
import { DataOrganizationService } from "@/lib/services/dataOrganizationService";
import { z } from "zod";
import { RouteParams, BrandParams } from "@/types/api";
import { AIModel, AnalysisStage } from "@/types/brand";
import User from "@/lib/models/user";
import { sendEmail } from "@/utils/sendEmail";
import { analysisCompletionEmailTemplate } from "@/utils/analysisCompletionEmailTemplate";
import { CreditService } from "@/lib/services/creditService";

const LogsQuerySchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  page: z.string().optional().default("1"),
  limit: z.string().optional().default("50"),
  model: z
    .enum(["all", "ChatGPT", "Claude", "Gemini"])
    .optional()
    .default("all"),
  stage: z
    .enum(["all", "TOFU", "MOFU", "BOFU", "EVFU"])
    .optional()
    .default("all"),
  status: z
    .enum(["all", "success", "error", "warning"])
    .optional()
    .default("all"),
  search: z.string().optional().default(""),
  sortBy: z
    .enum(["createdAt", "overallScore", "weightedScore", "successRate"])
    .optional()
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

const TriggerAnalysisSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  models: z.array(z.enum(["ChatGPT", "Claude", "Gemini"])).optional(),
  stages: z.array(z.enum(["TOFU", "MOFU", "BOFU", "EVFU"])).optional(),
});

// Background analysis function
async function runAnalysisInBackground(
  brandId: string,
  userId: string,
  modelsToAnalyze: AIModel[],
  stagesToAnalyze: AnalysisStage[]
) {
  try {
    console.log(`Starting background analysis for brand ${brandId}`);

    // Re-establish database connection for background process
    await connect();

    // Get brand and user details
    const brand = await Brand.findById(brandId);
    const user = await User.findById(userId);

    if (!brand || !user) {
      console.error("Brand or user not found for background analysis");
      return;
    }

    const analysisStartTime = Date.now();
    const comprehensiveResults =
      await AIService.comprehensiveMultiPromptAnalysis(
        brand,
        modelsToAnalyze,
        stagesToAnalyze
      );

    const analysisResults = [];

    // Process and save each result
    for (const { model, stage, result } of comprehensiveResults) {
      try {
        // Validate result data before processing
        if (
          !result ||
          typeof result.overallScore !== "number" ||
          typeof result.weightedScore !== "number"
        ) {
          console.error(`Invalid result data for ${model}-${stage}:`, result);
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
      } catch (saveError) {
        console.error(
          `Error processing analysis for ${model}-${stage}:`,
          saveError
        );
      }
    }

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

// Helper function to update daily metrics (currently unused)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function updateDailyMetrics(brandId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's multi-prompt analysis data
  const todaysAnalyses = await MultiPromptAnalysis.find({
    brand_id: brandId,
    createdAt: { $gte: today, $lt: tomorrow },
    status: "success",
  });

  if (todaysAnalyses.length === 0) return;

  // Calculate aggregated metrics using weighted scores
  const totalAnalyses = todaysAnalyses.length;
  const avgWeightedScore =
    todaysAnalyses.reduce((sum, item) => sum + item.weighted_score, 0) /
    totalAnalyses;
  const avgResponseTime =
    todaysAnalyses.reduce((sum, item) => sum + item.total_response_time, 0) /
    totalAnalyses;
  const successRate =
    todaysAnalyses.reduce((sum, item) => sum + item.success_rate, 0) /
    totalAnalyses;

  // Calculate model breakdown using weighted scores
  const modelBreakdown = {
    ChatGPT: { score: 0, prompts: 0, avgResponseTime: 0, successRate: 0 },
    Claude: { score: 0, prompts: 0, avgResponseTime: 0, successRate: 0 },
    Gemini: { score: 0, prompts: 0, avgResponseTime: 0, successRate: 0 },
  };

  todaysAnalyses.forEach((analysis) => {
    const model = analysis.model as keyof typeof modelBreakdown;
    modelBreakdown[model].score += analysis.weighted_score; // Use weighted score
    modelBreakdown[model].prompts += 1;
    modelBreakdown[model].avgResponseTime += analysis.total_response_time;
    modelBreakdown[model].successRate += analysis.success_rate;
  });

  // Calculate averages for each model
  Object.keys(modelBreakdown).forEach((modelKey) => {
    const model = modelKey as keyof typeof modelBreakdown;
    if (modelBreakdown[model].prompts > 0) {
      modelBreakdown[model].score =
        modelBreakdown[model].score / modelBreakdown[model].prompts;
      modelBreakdown[model].avgResponseTime =
        modelBreakdown[model].avgResponseTime / modelBreakdown[model].prompts;
      modelBreakdown[model].successRate =
        modelBreakdown[model].successRate / modelBreakdown[model].prompts;
    }
  });

  // Calculate stage breakdown
  const stageBreakdown = { TOFU: 0, MOFU: 0, BOFU: 0, EVFU: 0 };
  const stageCounts = { TOFU: 0, MOFU: 0, BOFU: 0, EVFU: 0 };

  todaysAnalyses.forEach((analysis) => {
    const stage = analysis.stage as keyof typeof stageBreakdown;
    stageBreakdown[stage] += analysis.weighted_score; // Use weighted score
    stageCounts[stage] += 1;
  });

  Object.keys(stageBreakdown).forEach((stageKey) => {
    const stage = stageKey as keyof typeof stageBreakdown;
    if (stageCounts[stage] > 0) {
      stageBreakdown[stage] = stageBreakdown[stage] / stageCounts[stage];
    }
  });

  // Calculate sentiment breakdown
  const sentimentBreakdown = {
    positive: 0,
    neutral: 0,
    negative: 0,
    strongly_positive: 0,
  };
  todaysAnalyses.forEach((analysis) => {
    sentimentBreakdown.positive +=
      analysis.aggregated_sentiment.distribution.positive;
    sentimentBreakdown.neutral +=
      analysis.aggregated_sentiment.distribution.neutral;
    sentimentBreakdown.negative +=
      analysis.aggregated_sentiment.distribution.negative;
    sentimentBreakdown.strongly_positive +=
      analysis.aggregated_sentiment.distribution.strongly_positive;
  });

  // Calculate averages
  Object.keys(sentimentBreakdown).forEach((key) => {
    const sentimentKey = key as keyof typeof sentimentBreakdown;
    sentimentBreakdown[sentimentKey] =
      sentimentBreakdown[sentimentKey] / totalAnalyses;
  });

  // Note: Daily metrics aggregation removed - using MultiPromptAnalysis directly
  console.log(`Updated daily metrics for brand ${brandId}:`, {
    totalAnalyses,
    avgWeightedScore,
    avgResponseTime,
    successRate,
    modelBreakdown,
    stageBreakdown,
  });
}

// Brand analysis logs API
export const GET = async (
  request: Request,
  context: { params: RouteParams<BrandParams> }
) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    const { brandId } = await context.params;
    const url = new URL(request.url);

    // Validate brandId
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    // Parse query parameters
    const queryParams = {
      userId: url.searchParams.get("userId"),
      page: url.searchParams.get("page"),
      limit: url.searchParams.get("limit"),
      model: url.searchParams.get("model"),
      stage: url.searchParams.get("stage"),
      status: url.searchParams.get("status"),
      search: url.searchParams.get("search"),
      sortBy: url.searchParams.get("sortBy"),
      sortOrder: url.searchParams.get("sortOrder"),
    };

    const parse = LogsQuerySchema.safeParse(queryParams);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid query parameters!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    const {
      userId,
      page,
      limit,
      model,
      stage,
      status,
      search,
      sortBy,
      sortOrder,
    } = parse.data;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Establish database connection
    await connect();

    // Check if brand exists and user has access
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return new NextResponse(JSON.stringify({ message: "Brand not found!" }), {
        status: 404,
      });
    }

    // Check user permissions (owner or member)
    const membership = await Membership.findOne({
      brand_id: brandId,
      user_id: userId,
      status: "active",
    });

    const isOwner = brand.ownerId.toString() === userId;
    if (!isOwner && !membership) {
      return new NextResponse(
        JSON.stringify({ message: "Access denied to this brand!" }),
        { status: 403 }
      );
    }

    // Build filter
    const filter: any = {
      brand_id: brandId,
    };

    if (model !== "all") {
      filter.model = model;
    }
    if (stage !== "all") {
      filter.stage = stage;
    }
    if (status !== "all") {
      filter.status = status;
    }

    // Add search functionality (search in prompt results)
    if (search) {
      filter.$or = [
        { "prompt_results.prompt_text": { $regex: search, $options: "i" } },
        { "prompt_results.response": { $regex: search, $options: "i" } },
      ];
    }

    // Build sort options for multi-prompt analysis
    const sortOptions: any = {};
    if (sortBy === "createdAt") {
      sortOptions.createdAt = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "overallScore") {
      sortOptions.overall_score = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "weightedScore") {
      sortOptions.weighted_score = sortOrder === "asc" ? 1 : -1;
    } else if (sortBy === "successRate") {
      sortOptions.success_rate = sortOrder === "asc" ? 1 : -1;
    }

    // Get logs with pagination
    const [logs, totalCount] = await Promise.all([
      MultiPromptAnalysis.find(filter)
        .populate({
          path: "metadata.user_id",
          select: "full_name email",
        })
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      MultiPromptAnalysis.countDocuments(filter),
    ]);

    // Transform logs to match frontend expectations for multi-prompt analysis
    const transformedLogs = logs.map((log) => ({
      id: (log._id as any)?.toString?.() ?? "",
      timestamp:
        log.createdAt instanceof Date ? log.createdAt.toISOString() : "",
      model: log.model,
      stage: log.stage,
      score: log.overall_score,
      weightedScore: log.weighted_score,
      responseTime: log.total_response_time,
      successRate: log.success_rate,
      status: log.status,
      sentiment: {
        overall: log.aggregated_sentiment.overall,
        confidence: log.aggregated_sentiment.confidence,
        distribution: {
          positive: log.aggregated_sentiment.distribution.positive,
          neutral: log.aggregated_sentiment.distribution.neutral,
          negative: log.aggregated_sentiment.distribution.negative,
          stronglyPositive:
            log.aggregated_sentiment.distribution.strongly_positive,
        },
      },
      promptResults: log.prompt_results.map((result: any) => ({
        promptId: result.prompt_id,
        promptText: result.prompt_text,
        score: result.score,
        weightedScore: result.weighted_score,
        mentionPosition: result.mention_position,
        response: result.response,
        responseTime: result.response_time,
        sentiment: {
          overall: result.sentiment.overall,
          confidence: result.sentiment.confidence,
          distribution: {
            positive: result.sentiment.distribution.positive,
            neutral: result.sentiment.distribution.neutral,
            negative: result.sentiment.distribution.negative,
            stronglyPositive: result.sentiment.distribution.strongly_positive,
          },
        },
        status: result.status,
      })),
      metadata: {
        userId:
          log.metadata.user_id._id?.toString() ||
          log.metadata.user_id.toString(),
        userName: log.metadata.user_id.full_name || "Unknown User",
        userEmail: log.metadata.user_id.email || "",
        triggerType: log.metadata.trigger_type,
        version: log.metadata.version,
        totalPrompts: log.metadata.total_prompts,
        successfulPrompts: log.metadata.successful_prompts,
      },
    }));

    // Get filter options
    const [availableModels, availableStages, availableStatuses] =
      await Promise.all([
        MultiPromptAnalysis.distinct("model", { brand_id: brandId }),
        MultiPromptAnalysis.distinct("stage", { brand_id: brandId }),
        MultiPromptAnalysis.distinct("status", { brand_id: brandId }),
      ]);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limitNum);
    const hasMore = pageNum < totalPages;
    const hasPrevious = pageNum > 1;

    const response = {
      logs: transformedLogs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasMore,
        hasPrevious,
      },
      filters: {
        model,
        stage,
        status,
        search,
        sortBy,
        sortOrder,
        availableModels: ["all", ...availableModels],
        availableStages: ["all", ...availableStages],
        availableStatuses: ["all", ...availableStatuses],
        availableSortBy: [
          "createdAt",
          "overallScore",
          "weightedScore",
          "successRate",
        ],
        availableSortOrder: ["asc", "desc"],
      },
      summary: {
        totalLogs: totalCount,
        currentPage: pageNum,
        totalPages,
        showingFrom: skip + 1,
        showingTo: Math.min(skip + limitNum, totalCount),
      },
    };

    return new NextResponse(
      JSON.stringify({
        message: "Logs fetched successfully!",
        data: response,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error("Logs API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching logs",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};

// Trigger new analysis API
export const POST = async (
  request: Request,
  context: { params: RouteParams<BrandParams> }
) => {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    const { brandId } = await context.params;

    // Validate brandId
    if (!brandId || !Types.ObjectId.isValid(brandId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid or missing brandId!" }),
        { status: 400 }
      );
    }

    const requestBody = await request.json();

    const parse = TriggerAnalysisSchema.safeParse(requestBody);
    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid request body!",
          data: `${parse.error.issues[0]?.path} - ${parse.error.issues[0]?.message}`,
        }),
        { status: 400 }
      );
    }

    // Establish database connection
    await connect();

    // Check if brand exists and user has access
    const brand = await Brand.findById(brandId);
    if (!brand) {
      return new NextResponse(JSON.stringify({ message: "Brand not found!" }), {
        status: 404,
      });
    }

    const { userId, models, stages } = parse.data;

    // Check user permissions (owner or member with appropriate role)
    const membership = await Membership.findOne({
      brand_id: brandId,
      user_id: userId,
      status: "active",
    });

    const isOwner = brand.ownerId.toString() === userId;
    const canTriggerAnalysis =
      isOwner || (membership && ["owner", "admin"].includes(membership.role));

    if (!canTriggerAnalysis) {
      return new NextResponse(
        JSON.stringify({
          message: "Insufficient permissions to trigger analysis!",
        }),
        { status: 403 }
      );
    }

    // Default to all models and stages if not specified
    const modelsToAnalyze: AIModel[] = models || [
      "ChatGPT",
      "Claude",
      "Gemini",
    ];
    const stagesToAnalyze: AnalysisStage[] = stages || [
      "TOFU",
      "MOFU",
      "BOFU",
      "EVFU",
    ];

    // Validate analysis request and check credits
    const validation = CreditService.validateAnalysisRequest(modelsToAnalyze);

    if (!validation.isValid) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid analysis request!",
          errors: validation.errors,
        }),
        { status: 400 }
      );
    }

    // Check if user has enough credits
    const creditCheck = await CreditService.hasEnoughCredits(
      userId,
      validation.creditsNeeded
    );

    if (!creditCheck.hasEnough) {
      return new NextResponse(
        JSON.stringify({
          message: "Insufficient credits for this analysis!",
          data: {
            required: validation.creditsNeeded,
            available: creditCheck.currentBalance,
            breakdown: validation.breakdown,
          },
        }),
        { status: 402 } // Payment Required
      );
    }

    // Generate analysis ID for tracking
    const analysisId = `multi-${brandId}-${Date.now()}`;

    // Deduct credits before starting analysis
    try {
      await CreditService.deductCredits(
        userId,
        validation.creditsNeeded,
        analysisId,
        `Analysis for brand: ${brand.name} (${modelsToAnalyze.join(
          ", "
        )} - ${stagesToAnalyze.join(", ")})`
      );
    } catch (error) {
      console.error("Error deducting credits:", error);
      return new NextResponse(
        JSON.stringify({
          message: "Error processing credits. Please try again.",
        }),
        { status: 500 }
      );
    }

    // Start analysis in background
    console.log(`Triggering background analysis for brand ${brand.name}`);

    // Don't await - let it run in background
    setImmediate(() => {
      runAnalysisInBackground(
        brandId,
        userId,
        modelsToAnalyze,
        stagesToAnalyze
      );
    });

    // Return immediate response
    return new NextResponse(
      JSON.stringify({
        success: true,
        message:
          "Analysis started successfully! You will receive an email notification once the analysis is complete.",
        data: {
          analysisId,
          status: "started",
          estimatedCompletionTime: "5-10 minutes",
          notificationEmail:
            "You will receive an email when analysis is complete",
          creditsUsed: validation.creditsNeeded,
          modelsAnalyzed: modelsToAnalyze,
          stagesAnalyzed: stagesToAnalyze,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Trigger Analysis API Error:", err);
    return new NextResponse(
      JSON.stringify({
        message: "Error triggering analysis",
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
};
