import { Schema, model, models } from "mongoose";
import { IMembership } from "@/types/membership";

const MembershipSchema = new Schema<IMembership>(
  {
    brand_id: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: true,
      index: true,
    },
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "viewer"],
      required: true,
    },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    created_by: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const Membership =
  models.Membership || model<IMembership>("Membership", MembershipSchema);
