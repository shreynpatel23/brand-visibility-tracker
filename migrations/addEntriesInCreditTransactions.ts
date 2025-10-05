import mongoose from "mongoose";
import dotenv from "dotenv";
import CreditTransaction from "../lib/models/creditTransaction";
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

  // find all users with plan_id
  const users = await User.find({ plan_id: { $exists: true } });

  console.log(`Found ${users.length} users with plan_id`);

  const result = await CreditTransaction.insertMany(
    users.map((user) => ({
      user_id: user._id,
      type: "bonus",
      amount: 50,
      description: "Welcome bonus - Free credits for existing users",
    }))
  );

  console.log(`Migration complete: ${result.length} documents inserted`);

  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed", err);
  process.exit(1);
});
