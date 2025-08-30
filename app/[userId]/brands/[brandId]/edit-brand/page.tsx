import { Suspense } from "react";
import Loading from "@/components/loading";
import EditBrand from ".";

type Params = Promise<{ userId: string; brandId: string }>;

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex iems-center justify-center">
      <Loading message="Loading edit brand page..." />
    </div>
  );
}
export default async function Page({ params }: { params: Params }) {
  const { userId, brandId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <EditBrand userId={userId} brandId={brandId} />
    </Suspense>
  );
}
