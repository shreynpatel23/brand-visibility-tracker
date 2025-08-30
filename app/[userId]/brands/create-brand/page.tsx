import { Suspense } from "react";
import Loading from "@/components/loading";
import CreateBrand from ".";

type Params = Promise<{ userId: string }>;

function SuspenseFallback() {
  return (
    <div className="w-screen h-screen flex iems-center justify-center">
      <Loading message="Loading create brand page..." />
    </div>
  );
}
export default async function Page({ params }: { params: Params }) {
  const { userId } = await params;
  return (
    <Suspense fallback={<SuspenseFallback />}>
      <CreateBrand userId={userId} />
    </Suspense>
  );
}
