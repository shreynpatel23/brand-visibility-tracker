import connect from "@/lib/db";
import CronLock from "@/lib/models/cronLock";
import { randomUUID } from "crypto";

export class CronLockService {
  /**
   * Attempt to acquire a distributed lock for a cron job
   * @param lockName - Unique name for the lock (e.g., "process-pending-analyses")
   * @param lockDurationMs - How long the lock should be held (default: 5 minutes)
   * @returns Lock instance identifier if successful, null if lock is already held
   */
  static async acquireLock(
    lockName: string,
    lockDurationMs: number = 5 * 60 * 1000 // 5 minutes default
  ): Promise<string | null> {
    try {
      await connect();

      const instanceId = randomUUID();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + lockDurationMs);

      // Try to create a new lock or update an expired one
      const result = await CronLock.findOneAndUpdate(
        {
          _id: lockName,
          $or: [
            { expires_at: { $lt: now } }, // Lock has expired
            { expires_at: { $exists: false } }, // No expiration set (shouldn't happen)
          ],
        },
        {
          $set: {
            locked_at: now,
            locked_by: instanceId,
            expires_at: expiresAt,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );

      // Verify we actually got the lock (in case of race condition)
      if (result && result.locked_by === instanceId) {
        console.log(
          `Acquired lock "${lockName}" with instance ${instanceId}, expires at ${expiresAt.toISOString()}`
        );
        return instanceId;
      }

      console.log(
        `Failed to acquire lock "${lockName}" - already held by another instance`
      );
      return null;
    } catch (error) {
      // If there's a duplicate key error, it means another instance got the lock first
      if (error instanceof Error && error.message.includes("duplicate key")) {
        console.log(
          `Lock "${lockName}" already held by another instance (duplicate key)`
        );
        return null;
      }

      console.error(`Error acquiring lock "${lockName}":`, error);
      return null;
    }
  }

  /**
   * Release a distributed lock
   * @param lockName - Name of the lock to release
   * @param instanceId - Instance identifier that holds the lock
   * @returns True if successfully released, false otherwise
   */
  static async releaseLock(
    lockName: string,
    instanceId: string
  ): Promise<boolean> {
    try {
      await connect();

      const result = await CronLock.findOneAndDelete({
        _id: lockName,
        locked_by: instanceId,
      });

      if (result) {
        console.log(
          `Released lock "${lockName}" held by instance ${instanceId}`
        );
        return true;
      }

      console.log(
        `Could not release lock "${lockName}" - not held by instance ${instanceId}`
      );
      return false;
    } catch (error) {
      console.error(`Error releasing lock "${lockName}":`, error);
      return false;
    }
  }

  /**
   * Check if a lock is currently held
   * @param lockName - Name of the lock to check
   * @returns Lock information if held, null if available
   */
  static async checkLock(lockName: string): Promise<{
    isLocked: boolean;
    lockedBy?: string;
    lockedAt?: Date;
    expiresAt?: Date;
  }> {
    try {
      await connect();

      const lock = await CronLock.findById(lockName);
      const now = new Date();

      if (!lock || lock.expires_at < now) {
        return { isLocked: false };
      }

      return {
        isLocked: true,
        lockedBy: lock.locked_by,
        lockedAt: lock.locked_at,
        expiresAt: lock.expires_at,
      };
    } catch (error) {
      console.error(`Error checking lock "${lockName}":`, error);
      return { isLocked: false };
    }
  }

  /**
   * Extend the expiration time of a held lock
   * @param lockName - Name of the lock to extend
   * @param instanceId - Instance identifier that holds the lock
   * @param extensionMs - Additional time to add to the lock (default: 5 minutes)
   * @returns True if successfully extended, false otherwise
   */
  static async extendLock(
    lockName: string,
    instanceId: string,
    extensionMs: number = 5 * 60 * 1000
  ): Promise<boolean> {
    try {
      await connect();

      const now = new Date();
      const newExpiresAt = new Date(now.getTime() + extensionMs);

      const result = await CronLock.findOneAndUpdate(
        {
          _id: lockName,
          locked_by: instanceId,
          expires_at: { $gt: now }, // Only extend if lock is still valid
        },
        {
          $set: {
            expires_at: newExpiresAt,
          },
        },
        { new: true }
      );

      if (result) {
        console.log(
          `Extended lock "${lockName}" for instance ${instanceId} until ${newExpiresAt.toISOString()}`
        );
        return true;
      }

      console.log(
        `Could not extend lock "${lockName}" - not held by instance ${instanceId} or expired`
      );
      return false;
    } catch (error) {
      console.error(`Error extending lock "${lockName}":`, error);
      return false;
    }
  }
}
