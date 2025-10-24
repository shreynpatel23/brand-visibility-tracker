import { Suspense } from "react";
import Loading from "@/components/loading";
import BrandList from ".";

import { RouteParams, UserParams } from "@/types/api";

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <Loading message="Loading brand list page..." />;
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
      <BrandList userId={userId} />
    </Suspense>
  );
}
