import { Suspense } from "react";
import Loading from "@/components/loading";
import CreateBrand from ".";

import { RouteParams, UserParams } from "@/types/api";

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex iems-center justify-center">
      <Loading message="Loading create brand page..." />
    </div>
  );
}
export default async function Page({
  params,
}: {
  params: RouteParams<UserParams>;
}) {
  const { userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <CreateBrand userId={userId} />
    </Suspense>
  );
}
