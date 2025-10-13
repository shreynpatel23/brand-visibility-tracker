import { NextRequest, NextResponse } from "next/server";
import { AnalysisQueueService } from "@/lib/services/analysisQueueService";

// This cron job processes pending analyses that might have been interrupted
export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    console.log("Starting cron job to process stuck analyses");

    // Use the queue service to resume stuck analyses
    const processedCount = await AnalysisQueueService.resumeStuckAnalyses();

    return new NextResponse(
      JSON.stringify({
        success: true,
        processed: processedCount,
        message: `Processed ${processedCount} stuck analyses`,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Cron job error:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
