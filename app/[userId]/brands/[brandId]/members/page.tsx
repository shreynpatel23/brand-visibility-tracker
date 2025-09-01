import { Suspense } from "react";
import Loading from "@/components/loading";
import MembersPage from ".";
import { RouteParams, UserBrandParams } from "@/types/api";

function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loading message="Loading members page..." />
    </div>
  );
}

export default async function Page({
  params,
}: {
  params: RouteParams<UserBrandParams>;
}) {
  const { brandId, userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <MembersPage userId={userId} brandId={brandId} />
    </Suspense>
  );
}
