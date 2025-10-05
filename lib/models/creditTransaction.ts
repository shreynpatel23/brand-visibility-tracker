import { Schema, model, models } from "mongoose";
import { CreditTransaction } from "@/types/plans";

const CreditTransactionSchema = new Schema<CreditTransaction>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["purchase", "usage", "refund", "bonus"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    analysis_id: {
      type: String,
    },
    stripe_payment_intent_id: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for better query performance
CreditTransactionSchema.index({ user_id: 1, createdAt: -1 });
CreditTransactionSchema.index({ type: 1 });

const CreditTransactionModel =
  models.CreditTransaction ||
  model("CreditTransaction", CreditTransactionSchema);
export default CreditTransactionModel;
