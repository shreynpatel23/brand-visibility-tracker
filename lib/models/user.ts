import { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
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
    plan_id: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model("User", UserSchema);
export default User;
