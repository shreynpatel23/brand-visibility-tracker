import { Suspense } from "react";
import Loading from "@/components/loading";
import ViewLogs from ".";

type Params = Promise<{ brandId: string; userId: string }>;

function SuspenseFallback() {
  return <Loading message="Loading reset password page..." />;
}
export default async function Page({ params }: { params: Params }) {
  const { brandId, userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <ViewLogs userId={userId} brandId={brandId} />
    </Suspense>
  );
}
