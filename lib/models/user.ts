import { Schema, model, models } from "mongoose";

export interface IUser {
  _id: string;
  full_name: string;
  email: string;
  password?: string;
  is_verified: boolean;
  verify_token?: string;
  verify_token_expire?: Date;
  current_onboarding_step?: string | null;
  number_of_retries?: number;
  reset_password_token?: string;
  reset_password_expire?: Date;
  plan_id: {
    _id: string;
    plan_id: string;
    plan_name: string;
  };
}

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
    plan_id: {
      type: Schema.Types.ObjectId,
      ref: "Plan",
    },
  },
  {
    timestamps: true,
  }
);

const User = models.User || model<IUser>("User", UserSchema);
export default User;
