import mongoose from "mongoose";
import dotenv from "dotenv";
import Plan from "../lib/models/plan";
dotenv.config({ path: ".env.local" });

const DB_URL = process.env.DB_URL;
const DATABASE_NAME = process.env.DATABASE_NAME;

async function migrate() {
  if (!DB_URL || !DATABASE_NAME) {
    throw new Error("DB_URL or DATABASE_NAME is not defined in .env");
  }

  await mongoose.connect(DB_URL, {
    dbName: DATABASE_NAME,
  });

  console.log("Connected to MongoDB");

  const result = await Plan.updateMany(
    { plan_id: { $in: ["starter", "professional", "enterprise"] } },
    {
      $set: {
        credits_included: 0,
        is_credit_based: true,
      },
    }
  );

  console.log(`Migration complete: ${result.modifiedCount} documents updated`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
