import { PlanTypes } from "@/types";
import { IUser } from "@/types/auth";

export function isPaidUser(user: IUser | undefined) {
  return (
    user?.plan_id?.plan_id.toLowerCase() !== PlanTypes.STARTER.toLowerCase()
  );
}
