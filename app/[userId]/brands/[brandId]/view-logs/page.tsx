import { Suspense } from "react";
import Loading from "@/components/loading";
import ViewLogs from ".";

type Params = Promise<{ brandId: string; userId: string }>;

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex iems-center justify-center">
      <Loading message="Loading view logs page..." />
    </div>
  );
}
export default async function Page({ params }: { params: Params }) {
  const { brandId, userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <ViewLogs userId={userId} brandId={brandId} />
    </Suspense>
  );
}
