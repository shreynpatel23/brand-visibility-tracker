import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "../lib/models/user";
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

  // Find users that still have plan_id field
  const usersWithPlanId = await User.countDocuments({
    plan_id: { $exists: true },
  });
  console.log(`Found ${usersWithPlanId} users with plan_id field`);

  // Remove plan_id field from all users that have it
  const result = await User.updateMany(
    { plan_id: { $exists: true } },
    { $unset: { plan_id: "" } },
    { strict: false }
  );

  console.log(`Migration complete: ${result.modifiedCount} documents updated`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
