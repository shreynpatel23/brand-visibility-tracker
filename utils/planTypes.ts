import { PlanTypes } from "@/constants/plan-types";
import { IUser } from "@/context/userContext";

export function isPaidUser(user: IUser | undefined) {
  return (
    user?.plan_id?.plan_id.toLowerCase() !== PlanTypes.STARTER.toLowerCase()
  );
}
