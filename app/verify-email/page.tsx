import { Suspense } from "react";
import Loading from "@/components/loading";
import EmailVerificationPage from ".";

function SuspenseFallback() {
  return <Loading message="Loading email verification page..." />;
}
export default function Page() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <EmailVerificationPage />
    </Suspense>
  );
}
