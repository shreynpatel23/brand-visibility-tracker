import { Schema, Types, model, models } from "mongoose";
export type Role = "owner" | "admin" | "viewer";
export type Status = "active" | "suspended";

export interface IMembership {
  _id: Types.ObjectId;
  brand_id: Types.ObjectId;
  user_id: Types.ObjectId;
  role: Role;
  status: "active" | "suspended";
  created_by?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

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
