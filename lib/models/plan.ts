import { Schema, model, models } from "mongoose";

const PlanSchema = new Schema(
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
  },
  {
    timestamps: true,
  }
);

const Plan = models.Plan || model("Plan", PlanSchema);
export default Plan;
