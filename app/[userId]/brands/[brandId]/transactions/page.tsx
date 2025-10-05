import { Suspense } from "react";
import Loading from "@/components/loading";
import { RouteParams, UserBrandParams } from "@/types/api";
import TransactionHistoryPage from ".";

function SuspenseFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loading message="Loading transactions page..." />
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
      <TransactionHistoryPage userId={userId} brandId={brandId} />
    </Suspense>
  );
}
