import { Suspense } from "react";
import Loading from "@/components/loading";
import OnboardingPage from ".";

type Params = Promise<{ userId: string }>;

function SuspenseFallback() {
  return <Loading message="Loading reset password page..." />;
}
export default async function Page({ params }: { params: Params }) {
  const { userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <OnboardingPage userId={userId} />
    </Suspense>
  );
}
