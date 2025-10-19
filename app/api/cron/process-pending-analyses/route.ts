import { NextRequest, NextResponse } from "next/server";
import { AnalysisQueueService } from "@/lib/services/analysisQueueService";
import { CronLockService } from "@/lib/services/cronLockService";
import connect from "@/lib/db";
import AnalysisStatus from "@/lib/models/analysisStatus";

const LOCK_NAME = "process-pending-analyses";
const LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

// This cron job processes pending analyses that might have been interrupted
export async function GET(request: NextRequest) {
  const cronStartTime = Date.now();
  const cronId = `cron-${cronStartTime}`;
  let lockInstanceId: string | null = null;

  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log(`[${cronId}] Unauthorized cron request`);
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Try to acquire distributed lock to prevent overlapping executions
    lockInstanceId = await CronLockService.acquireLock(
      LOCK_NAME,
      LOCK_DURATION
    );

    if (!lockInstanceId) {
      console.log(
        `[${cronId}] Could not acquire lock - another cron instance is running`
      );

      // Check lock status for debugging
      const lockStatus = await CronLockService.checkLock(LOCK_NAME);

      return new NextResponse(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "Cron job skipped - lock held by another instance",
          lockStatus,
          cronId,
        }),
        { status: 200 }
      );
    }

    console.log(
      `[${cronId}] Acquired lock ${lockInstanceId}, starting cron job to process stuck analyses at ${new Date().toISOString()}`
    );

    // Connect to database and check for stuck analyses first
    await connect();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const stuckCount = await AnalysisStatus.countDocuments({
      status: "running",
      started_at: { $lt: tenMinutesAgo },
    });

    console.log(`[${cronId}] Found ${stuckCount} potentially stuck analyses`);

    if (stuckCount === 0) {
      console.log(`[${cronId}] No stuck analyses found, completing cron job`);
      return new NextResponse(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "No stuck analyses found",
          executionTime: Date.now() - cronStartTime,
          cronId,
          lockInstanceId,
        }),
        { status: 200 }
      );
    }

    // Extend lock if we expect processing to take a while
    if (stuckCount > 1) {
      await CronLockService.extendLock(
        LOCK_NAME,
        lockInstanceId,
        LOCK_DURATION
      );
    }

    // Use the queue service to resume stuck analyses
    const processedCount = await AnalysisQueueService.resumeStuckAnalyses();
    const executionTime = Date.now() - cronStartTime;

    console.log(
      `[${cronId}] Completed cron job. Processed ${processedCount} analyses in ${executionTime}ms`
    );

    return new NextResponse(
      JSON.stringify({
        success: true,
        processed: processedCount,
        message: `Processed ${processedCount} stuck analyses`,
        executionTime,
        cronId,
        lockInstanceId,
      }),
      { status: 200 }
    );
  } catch (error) {
    const executionTime = Date.now() - cronStartTime;
    console.error(
      `[${cronId}] Cron job error after ${executionTime}ms:`,
      error
    );
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime,
        cronId,
        lockInstanceId,
      }),
      { status: 500 }
    );
  } finally {
    // Always release the distributed lock
    if (lockInstanceId) {
      await CronLockService.releaseLock(LOCK_NAME, lockInstanceId);
      console.log(`[${cronId}] Released lock ${lockInstanceId}`);
    }
  }
}
