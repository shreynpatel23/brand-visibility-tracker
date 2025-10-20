import { NextRequest, NextResponse } from "next/server";
import { QStashService } from "@/lib/services/qstashService";

// This endpoint can be called to initialize the QStash stuck analysis checking
// It should be called once when the application starts or when needed
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate request (you can add authentication here)
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.QSTASH_INIT_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      console.log("Unauthorized QStash init request");
      return new NextResponse(JSON.stringify({ message: "Unauthorized" }), {
        status: 401,
      });
    }

    console.log("Initializing QStash stuck analysis checking");

    // Schedule the first stuck analysis check
    const messageId = await QStashService.scheduleStuckAnalysisCheck(120); // 2 minutes

    console.log(
      `QStash stuck analysis checking initialized with message ID: ${messageId}`
    );

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "QStash stuck analysis checking initialized",
        messageId,
        nextCheckIn: "2 minutes",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error initializing QStash stuck analysis checking:", error);

    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}

// Also allow GET for easy testing
export async function GET(request: NextRequest) {
  return POST(request);
}
