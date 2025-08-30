import { Suspense } from "react";
import Loading from "@/components/loading";
import BrandList from ".";

type Params = Promise<{ userId: string }>;

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex iems-center justify-center">
      <Loading message="Loading brand list page..." />;
    </div>
  );
}
export default async function Page({ params }: { params: Params }) {
  const { userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <BrandList userId={userId} />
    </Suspense>
  );
}
