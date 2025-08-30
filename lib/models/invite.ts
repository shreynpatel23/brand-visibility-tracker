import { Schema, Types, model, models } from "mongoose";
import { Role } from "./membership";

export interface IInvite {
  _id: Types.ObjectId;
  brand_id: Types.ObjectId;
  email: string;
  role: Role;
  invited_by: Types.ObjectId;
  verify_token?: string;
  verify_token_expire?: Date;
  accepted_at?: Date | null;
  revoked_at?: Date | null;
  status: "pending" | "accepted" | "expired" | "revoked";
  createdAt: Date;
  updatedAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    brand_id: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, index: true },
    role: {
      type: String,
      enum: ["owner", "admin", "editor", "viewer"],
      required: true,
    },
    invited_by: { type: Schema.Types.ObjectId, ref: "User", required: true },
    verify_token: { type: String, required: true },
    verify_token_expire: { type: Date, required: true, index: true },
    accepted_at: { type: Date, default: null },
    revoked_at: { type: Date, default: null },
    status: {
      type: String,
      enum: ["pending", "accepted", "expired", "revoked"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

// Prevent duplicate active invites to the same brand/email:
InviteSchema.index(
  { brand_id: 1, email: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: "pending" } }
);

export const Invite = models.Invite || model<IInvite>("Invite", InviteSchema);
