import { Schema, model, models } from "mongoose";

// Cron Lock Database Interface for distributed locking
interface ICronLock {
  _id: string; // Lock name (e.g., "process-pending-analyses")
  locked_at: Date;
  locked_by: string; // Instance identifier
  expires_at: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CronLockSchema = new Schema<ICronLock>(
  {
    _id: {
      type: String,
      required: true,
    },
    locked_at: {
      type: Date,
      required: true,
      index: true,
    },
    locked_by: {
      type: String,
      required: true,
    },
    expires_at: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    _id: false, // Use custom _id
  }
);

// TTL index to automatically clean up expired locks
CronLockSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });

const CronLock =
  models.CronLock || model<ICronLock>("CronLock", CronLockSchema);

export default CronLock;
export type { ICronLock };
