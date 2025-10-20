import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import {
  BackgroundAnalysisService,
  AnalysisJob,
} from "@/lib/services/backgroundAnalysisService";

async function handler(request: NextRequest) {
  try {
    console.log("QStash analysis processing webhook triggered");

    // Parse the job data from the request body
    const job: AnalysisJob = await request.json();

    console.log(
      `Processing analysis job ${job.analysisId} for brand ${job.brandId}`
    );

    // Process the analysis job using the new background service
    await BackgroundAnalysisService.runAnalysisInBackground(job);

    console.log(`Successfully processed analysis job ${job.analysisId}`);

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: `Analysis job ${job.analysisId} processed successfully`,
        analysisId: job.analysisId,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing analysis job via QStash:", error);

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
