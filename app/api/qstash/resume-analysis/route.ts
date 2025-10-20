import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { BackgroundAnalysisService } from "@/lib/services/backgroundAnalysisService";
import connect from "@/lib/db";
import AnalysisStatus from "@/lib/models/analysisStatus";

async function handler(request: NextRequest) {
  try {
    console.log("QStash analysis resumption webhook triggered");

    // Parse the request body to get the analysis ID
    const body = await request.json();
    const { analysisId } = body;

    if (!analysisId) {
      console.error("No analysisId provided in resumption request");
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: "analysisId is required",
        }),
        { status: 400 }
      );
    }

    console.log(`Resuming stuck analysis ${analysisId} via QStash`);

    // Get the analysis details and resume it
    await connect();
    const analysis = await AnalysisStatus.findOne({
      analysis_id: analysisId,
      status: "running",
    });

    if (!analysis) {
      console.log(`Analysis ${analysisId} not found or not running`);
      return new NextResponse(
        JSON.stringify({
          success: true,
          message: `Analysis ${analysisId} not found or not running`,
          analysisId,
        }),
        { status: 200 }
      );
    }

    const job = {
      brandId: analysis.brand_id.toString(),
      userId: analysis.user_id.toString(),
      models: analysis.models,
      stages: analysis.stages,
      analysisId: analysis.analysis_id,
    };

    // Resume the analysis
    await BackgroundAnalysisService.runAnalysisInBackground(job);
    const resumed = true;

    if (resumed) {
      console.log(`Successfully resumed analysis ${analysisId}`);
      return new NextResponse(
        JSON.stringify({
          success: true,
          message: `Analysis ${analysisId} resumed successfully`,
          analysisId,
        }),
        { status: 200 }
      );
    } else {
      console.log(
        `Could not resume analysis ${analysisId} - not stuck or already processing`
      );
      return new NextResponse(
        JSON.stringify({
          success: true,
          message: `Analysis ${analysisId} was not stuck or already being processed`,
          analysisId,
        }),
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error resuming analysis via QStash:", error);

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
