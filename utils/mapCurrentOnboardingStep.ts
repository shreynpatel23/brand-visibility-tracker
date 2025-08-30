import { VERIFY_EMAIL, CREATE_BRAND } from "@/constants/onboarding-constants";
import { IUser } from "@/lib/models/user";

export function redirectToCurrentOnboardingStep({
  currentOnboardingStep,
  data,
}: {
  currentOnboardingStep: string;
  data: IUser;
}) {
  switch (currentOnboardingStep) {
    case VERIFY_EMAIL:
      return `/verify-email?email=${encodeURIComponent(data.email)}`;
    case CREATE_BRAND:
      return `/${data._id}/onboarding`;
    default:
      return "";
  }
}
