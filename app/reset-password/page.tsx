import { Suspense } from "react";
import ResetPassword from ".";
import Loading from "@/components/loading";

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Loading message="Loading reset password page..." />;
    </div>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <ResetPassword />
    </Suspense>
  );
}
