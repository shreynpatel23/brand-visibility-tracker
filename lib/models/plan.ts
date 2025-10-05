import { Schema, model, models } from "mongoose";
import { IPlan } from "@/types/plans";

const PlanSchema = new Schema<IPlan>(
  {
    plan_id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    max_brands: {
      type: Number,
    },
    ai_models_supported: {
      type: Number,
    },
    price: {
      type: Number,
      required: true,
    },
    features: {
      type: Array<string>,
    },
    credits_included: {
      type: Number,
      default: 0,
    },
    is_credit_based: {
      type: Boolean,
      default: false,
    },
    stripe_price_id: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

const Plan = models.Plan || model("Plan", PlanSchema);
export default Plan;
