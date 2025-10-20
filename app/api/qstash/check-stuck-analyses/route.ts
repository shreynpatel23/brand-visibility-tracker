import { NextRequest, NextResponse } from "next/server";
import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { QStashService } from "@/lib/services/qstashService";

async function handler(request: NextRequest) {
  try {
    console.log("QStash stuck analysis check webhook triggered");

    // Parse the request body (contains timestamp and checkType)
    const body = await request.json();
    console.log("Stuck analysis check triggered at:", body.timestamp);

    // Process stuck analyses using QStash service
    const processedCount = await QStashService.processStuckAnalysisCheck();

    console.log(
      `Stuck analysis check completed. Processed ${processedCount} analyses`
    );

    return new NextResponse(
      JSON.stringify({
        success: true,
        processed: processedCount,
        message: `Processed ${processedCount} stuck analyses`,
        timestamp: new Date().toISOString(),
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in stuck analysis check via QStash:", error);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
      { status: 500 }
    );
  }
}

// Verify the signature and process the request
export const POST = verifySignatureAppRouter(handler);
