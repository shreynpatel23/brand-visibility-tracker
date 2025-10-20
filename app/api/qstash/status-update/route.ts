import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import connect from "@/lib/db";
import AnalysisStatus from "@/lib/models/analysisStatus";

async function handler(request: NextRequest) {
  try {
    console.log("🔄 QStash status update webhook triggered");

    const body = await request.json();
    const { analysisId, userId } = body;

    if (!analysisId || !userId) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "analysisId and userId are required",
        }),
        { status: 400 }
      );
    }

    await connect();

    // Get the current analysis status
    const analysis = await AnalysisStatus.findOne({
      analysis_id: analysisId,
      user_id: userId,
    });

    if (!analysis) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "Analysis not found",
        }),
        { status: 404 }
      );
    }

    // Return the current status
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: {
          analysisId: analysis.analysis_id,
          status: analysis.status,
          progress: analysis.progress,
          startedAt: analysis.started_at,
          completedAt: analysis.completed_at,
          errorMessage: analysis.error_message,
        },
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in status update webhook:", error);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

// Verify the signature and process the request
export const POST = verifySignatureAppRouter(handler);
