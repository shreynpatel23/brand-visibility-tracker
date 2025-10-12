import { Schema, model, models } from "mongoose";
import { IUser } from "@/types/auth";

const UserSchema = new Schema<IUser>(
  {
    full_name: {
      type: String,
      required: true,
    },
    email: {
      unique: true,
      type: String,
      required: true,
    },
    password: {
      type: String,
    },
    is_verified: {
      type: Boolean,
      default: false,
    },
    number_of_retries: {
      type: Number,
    },
    verify_token: {
      type: String,
    },
    verify_token_expire: {
      type: Date,
    },
    reset_password_token: {
      type: String,
    },
    reset_password_expire: {
      type: Date,
    },
    current_onboarding_step: {
      type: String,
      default: null,
    },
    credits_balance: {
      type: Number,
      default: 0,
    },
    total_credits_purchased: {
      type: Number,
      default: 0,
    },
    total_credits_used: {
      type: Number,
      default: 0,
    },
    stripe_customer_id: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model<IUser>("User", UserSchema);
export default User;
