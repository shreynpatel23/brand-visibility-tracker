import { Suspense } from "react";
import Loading from "@/components/loading";
import EmailVerificationPage from ".";

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex iems-center justify-center">
      <Loading message="Loading email verification page..." />;
    </div>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <EmailVerificationPage />
    </Suspense>
  );
}
