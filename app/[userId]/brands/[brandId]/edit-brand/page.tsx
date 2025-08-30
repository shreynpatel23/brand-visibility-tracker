import { Suspense } from "react";
import Loading from "@/components/loading";
import EditBrand from ".";

type Params = Promise<{ userId: string; brandId: string }>;

function SuspenseFallback() {
  return <Loading message="Loading reset password page..." />;
}
export default async function Page({ params }: { params: Params }) {
  const { userId, brandId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <EditBrand userId={userId} brandId={brandId} />
    </Suspense>
  );
}
