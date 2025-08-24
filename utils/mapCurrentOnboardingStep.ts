import { VERIFY_EMAIL, CREATE_BRAND } from "@/constants/onboarding-constants";
import { IUser } from "@/context/userContext";

export function redirectToCurrentOnboardingStep(
  currentOnboardingStep: string,
  data: IUser
) {
  switch (currentOnboardingStep) {
    case VERIFY_EMAIL:
      return `/verify-email?email=${encodeURIComponent(data.email)}`;
    case CREATE_BRAND:
      return "/onboarding";
    default:
      return "/brand/dashboard";
  }
}
