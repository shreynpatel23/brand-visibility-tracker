import { Suspense } from "react";
import Loading from "@/components/loading";
import OnboardingPage from ".";

import { RouteParams, UserParams } from "@/types/api";

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Loading message="Loading onboarding form..." />
    </div>
  );
}
export default async function Page({
  params,
}: {
  params: RouteParams<UserParams>;
}) {
  const { userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <OnboardingPage userId={userId} />
    </Suspense>
  );
}
