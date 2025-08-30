import { Suspense } from "react";
import Loading from "@/components/loading";
import AcceptInvitePage from ".";

type Params = Promise<{ brandId: string }>;

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex iems-center justify-center">
      <Loading message="Loading accept invite page..." />
    </div>
  );
}

export default async function Page({ params }: { params: Params }) {
  const { brandId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <AcceptInvitePage brandId={brandId} />
    </Suspense>
  );
}
