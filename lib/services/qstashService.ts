import { Client } from "@upstash/qstash";
import {
  BackgroundAnalysisService,
  AnalysisJob,
} from "./backgroundAnalysisService";
import connect from "@/lib/db";
import AnalysisStatus from "@/lib/models/analysisStatus";

export class QStashService {
  private static client: Client | null = null;

  private static getClient(): Client {
    if (!this.client) {
      if (!process.env.QSTASH_TOKEN) {
        throw new Error("QSTASH_TOKEN environment variable is required");
      }
      this.client = new Client({
        token: process.env.QSTASH_TOKEN,
      });
    }
    return this.client;
  }

  /**
   * Schedule an analysis job to be processed immediately in the background
   * @param job - The analysis job to process
   * @returns Promise<string> - The message ID from QStash
   */
  static async scheduleAnalysisJob(job: AnalysisJob): Promise<string> {
    try {
      // First check if this analysis is already being processed to prevent duplicates
      await connect();
      const existingAnalysis = await AnalysisStatus.findOne({
        analysis_id: job.analysisId,
      });

      if (!existingAnalysis) {
        throw new Error(`Analysis ${job.analysisId} not found in database`);
      }

      if (existingAnalysis.status !== "running") {
        console.log(
          `Analysis ${job.analysisId} is not in running state (${existingAnalysis.status}), skipping QStash scheduling`
        );
        throw new Error(`Analysis ${job.analysisId} is not in running state`);
      }

      // Check if it's already being processed
      if (existingAnalysis.progress?.current_task?.startsWith("PROCESSING:")) {
        console.log(
          `Analysis ${job.analysisId} is already being processed, skipping duplicate QStash job`
        );
        throw new Error(
          `Analysis ${job.analysisId} is already being processed`
        );
      }

      const client = this.getClient();

      // Get the base URL for the webhook endpoint
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      if (!baseUrl) {
        throw new Error("Base URL not configured for QStash webhooks");
      }

      const webhookUrl = `${baseUrl}/api/qstash/process-analysis`;

      console.log(`Scheduling analysis job ${job.analysisId} via QStash`);
      console.log(`Webhook URL: ${webhookUrl}`);
      console.log(`Job data:`, JSON.stringify(job, null, 2));

      const result = await client.publishJSON({
        url: webhookUrl,
        body: job,
        headers: {
          "Content-Type": "application/json",
        },
        // Add retry configuration
        retries: 3,
        // Process immediately
        delay: 0,
        // Add deduplication ID to prevent duplicate messages
        deduplicationId: `analysis-${job.analysisId}-${Date.now()}`,
      });

      console.log(
        `Analysis job ${job.analysisId} scheduled with QStash message ID: ${result.messageId}`
      );
      console.log(`QStash result:`, JSON.stringify(result, null, 2));
      return result.messageId;
    } catch (error) {
      console.error("Error scheduling analysis job with QStash:", error);
      throw error;
    }
  }

  /**
   * Schedule a job to check for stuck analyses (replaces the cron job)
   * @param delaySeconds - Delay in seconds before processing (default: 10 minutes)
   * @returns Promise<string> - The message ID from QStash
   */
  static async scheduleStuckAnalysisCheck(
    delaySeconds: number = 600
  ): Promise<string> {
    try {
      const client = this.getClient();

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      if (!baseUrl) {
        throw new Error("Base URL not configured for QStash webhooks");
      }

      const webhookUrl = `${baseUrl}/api/qstash/check-stuck-analyses`;

      console.log(`Scheduling stuck analysis check in ${delaySeconds} seconds`);

      const result = await client.publishJSON({
        url: webhookUrl,
        body: {
          timestamp: new Date().toISOString(),
          checkType: "stuck-analyses",
        },
        headers: {
          "Content-Type": "application/json",
        },
        delay: delaySeconds,
        retries: 2,
        // Use a consistent deduplication ID to prevent multiple check cycles
        deduplicationId: `stuck-check-${Math.floor(Date.now() / (120 * 1000))}`, // Changes every 2 minutes
      });

      console.log(
        `Stuck analysis check scheduled with QStash message ID: ${result.messageId}`
      );
      return result.messageId;
    } catch (error) {
      console.error(
        "Error scheduling stuck analysis check with QStash:",
        error
      );
      throw error;
    }
  }

  /**
   * Process a stuck analysis check (replaces the cron job functionality)
   * @returns Promise<number> - Number of analyses identified and scheduled for resumption
   */
  static async processStuckAnalysisCheck(): Promise<number> {
    try {
      console.log("Processing stuck analysis check via QStash");

      // Resume incomplete analyses using the new service
      const resumedCount =
        await BackgroundAnalysisService.resumeIncompleteAnalyses();

      console.log(`Resumed ${resumedCount} incomplete analyses`);

      // Schedule the next check (every 2 minutes for more frequent monitoring)
      await this.scheduleStuckAnalysisCheck(120);

      return resumedCount;
    } catch (error) {
      console.error("Error processing stuck analysis check:", error);

      // Still try to schedule the next check even if this one failed
      try {
        await this.scheduleStuckAnalysisCheck(120);
      } catch (scheduleError) {
        console.error(
          "Failed to schedule next stuck analysis check:",
          scheduleError
        );
      }

      throw error;
    }
  }

  /**
   * Schedule resumption of a specific stuck analysis
   * @param analysisId - The ID of the analysis to resume
   * @returns Promise<string> - The message ID from QStash
   */
  static async scheduleAnalysisResumption(analysisId: string): Promise<string> {
    try {
      const client = this.getClient();

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      if (!baseUrl) {
        throw new Error("Base URL not configured for QStash webhooks");
      }

      const webhookUrl = `${baseUrl}/api/qstash/resume-analysis`;

      console.log(
        `Scheduling resumption for analysis ${analysisId} via QStash`
      );

      const result = await client.publishJSON({
        url: webhookUrl,
        body: { analysisId },
        headers: {
          "Content-Type": "application/json",
        },
        retries: 2,
        delay: 0, // Process immediately
      });

      console.log(
        `Analysis resumption ${analysisId} scheduled with QStash message ID: ${result.messageId}`
      );
      return result.messageId;
    } catch (error) {
      console.error(
        `Error scheduling analysis resumption for ${analysisId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Initialize stuck analysis checking (idempotent - safe to call multiple times)
   * This starts the recurring check cycle if it's not already running
   */
  static async initializeStuckAnalysisChecking(): Promise<void> {
    try {
      // Check if there's already a recent stuck analysis check scheduled
      // We do this by trying to schedule one - QStash deduplication will prevent duplicates
      await this.scheduleStuckAnalysisCheck(120); // Start first check in 2 minutes
      console.log("✅ Stuck analysis checking initialized");
    } catch (error) {
      console.error("❌ Failed to initialize stuck analysis checking:", error);
      // Don't throw - this is optional functionality
    }
  }

  /**
   * Schedule periodic status updates for frontend polling optimization
   * This reduces the load on the frontend by batching status checks
   */
  static async scheduleStatusUpdates(
    analysisId: string,
    userId: string
  ): Promise<void> {
    try {
      const client = this.getClient();

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      if (!baseUrl) {
        throw new Error("Base URL not configured for QStash webhooks");
      }

      const webhookUrl = `${baseUrl}/api/qstash/status-update`;

      // Schedule status updates every 30 seconds for 10 minutes (20 updates)
      for (let i = 1; i <= 20; i++) {
        await client.publishJSON({
          url: webhookUrl,
          body: { analysisId, userId },
          headers: {
            "Content-Type": "application/json",
          },
          delay: i * 30, // 30s, 60s, 90s, etc.
          retries: 1,
          deduplicationId: `status-${analysisId}-${i}`,
        });
      }

      console.log(`Scheduled 20 status updates for analysis ${analysisId}`);
    } catch (error) {
      console.error(
        `Error scheduling status updates for ${analysisId}:`,
        error
      );
    }
  }

  /**
   * Cancel a scheduled message
   * @param messageId - The QStash message ID to cancel
   * @returns Promise<void>
   */
  static async cancelMessage(messageId: string): Promise<void> {
    try {
      const client = this.getClient();
      await client.messages.delete(messageId);
      console.log(`Cancelled QStash message: ${messageId}`);
    } catch (error) {
      console.error(`Error cancelling QStash message ${messageId}:`, error);
      throw error;
    }
  }

  /**
   * Get message details
   * @param messageId - The QStash message ID
   * @returns Promise<any> - Message details
   */
  static async getMessageDetails(messageId: string): Promise<any> {
    try {
      const client = this.getClient();
      const message = await client.messages.get(messageId);
      return message;
    } catch (error) {
      console.error(
        `Error getting QStash message details ${messageId}:`,
        error
      );
      throw error;
    }
  }
}
