import { Schema, model, models } from "mongoose";
import { IBrand } from "@/types/brand";

const BrandSchema = new Schema<IBrand>(
  {
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
    },
    region: {
      type: String,
    },
    use_case: {
      type: String,
    },
    target_audience: {
      type: [String],
    },
    competitors: {
      type: [String],
    },
    feature_list: {
      type: [String],
    },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

const Brand = models.Brand || model<IBrand>("Brand", BrandSchema);
export default Brand;
