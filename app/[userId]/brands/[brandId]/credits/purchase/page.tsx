"use client";

import { useParams } from "next/navigation";
import { CreditPurchase } from "@/components/credit-purchase";
import { CreditBalance } from "@/components/credit-balance";
import { useUserContext } from "@/context/userContext";
import Loading from "@/components/loading";

export default function CreditPurchasePage() {
  const params = useParams();
  const { userId, brandId } = params;
  const { user } = useUserContext();

  if (!user || !user._id) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loading message="Loading user data..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Current Credits
          </h1>
        </div>
      </div>

      {/* Current Balance */}
      <div className="max-w-md">
        <CreditBalance
          userId={user._id}
          showPurchaseButton={false}
          compact={false}
        />
      </div>

      {/* Purchase Component */}
      <CreditPurchase
        userId={user._id}
        successUrl={`${window.location.origin}/${userId}/brands/${brandId}/credits/success`}
        cancelUrl={`${window.location.origin}/${userId}/brands/${brandId}/credits/cancel`}
        onPurchaseStart={() => {
          console.log("Purchase started");
        }}
      />
    </div>
  );
}
