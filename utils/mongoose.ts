import { Types } from "mongoose";
import z from "zod";

// validators
export const ObjectIdString = z
  .string()
  .refine((v) => Types.ObjectId.isValid(v), "Invalid ObjectId")
  .transform((v) => new Types.ObjectId(v));

// Roles & status enums (adjust to your app)
export const RoleSchema = z.enum(["owner", "admin", "editor", "viewer"]);
export const StatusSchema = z.enum(["active", "suspended"]).default("active");
