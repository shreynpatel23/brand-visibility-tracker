import { Suspense } from "react";
import Loading from "@/components/loading";
import AcceptInvitePage from ".";

type Params = Promise<{ brandId: string }>;

function SuspenseFallback() {
  return <Loading message="Loading reset password page..." />;
}

export default async function Page({ params }: { params: Params }) {
  const { brandId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <AcceptInvitePage brandId={brandId} />
    </Suspense>
  );
}
