"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Plus, TrendingUp, TrendingDown } from "lucide-react";
import { useRouter } from "next/navigation";
import formatCredits from "@/utils/formatCredits";

interface CreditStats {
  currentBalance: number;
  totalPurchased: number;
  totalUsed: number;
}

interface CreditBalanceProps {
  creditData: CreditStats;
  showPurchaseButton?: boolean;
  compact?: boolean;
  purchaseUrl?: string;
}

export function CreditBalance({
  creditData,
  showPurchaseButton = true,
  compact = false,
  purchaseUrl,
}: CreditBalanceProps) {
  const router = useRouter();

  const handlePurchaseClick = () => {
    if (purchaseUrl) {
      router.push(purchaseUrl);
    }
  };

  const { currentBalance, totalPurchased, totalUsed } = creditData;
  const isLowBalance = currentBalance < 10;
  const balanceColor = isLowBalance
    ? "text-red-600"
    : currentBalance < 50
    ? "text-yellow-600"
    : "text-green-600";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Coins className="h-4 w-4 text-gray-500" />
          <p className="text-sm text-gray-500">Available Credits:</p>
          <span className={`font-semibold ${balanceColor}`}>
            {formatCredits(currentBalance)}
          </span>
        </div>
        {showPurchaseButton && isLowBalance && (
          <Button size="sm" variant="outline" onClick={handlePurchaseClick}>
            <Plus className="h-3 w-3 mr-1" />
            Buy
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:bg-gradient-to-r dark:from-blue-900 dark:to-purple-900">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-full">
            <Coins className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-200">
              Credit Balance
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-200">
              Available for analysis
            </p>
          </div>
        </div>
        {showPurchaseButton && (
          <Button onClick={handlePurchaseClick} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Buy Credits
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${balanceColor}`}>
            {formatCredits(currentBalance)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-200">
            Available
          </div>
          {isLowBalance && (
            <Badge variant="destructive" className="mt-1 text-xs">
              Low Balance
            </Badge>
          )}
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            {formatCredits(totalPurchased)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-200">
            Purchased
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-200 flex items-center justify-center gap-2">
            <TrendingDown className="h-4 w-4 text-orange-500" />
            {formatCredits(totalUsed)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-200">Used</div>
        </div>
      </div>

      {isLowBalance && (
        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800 dark:bg-yellow-900 dark:border-yellow-800 dark:text-yellow-200">
          ⚠️ Low credit balance. Consider purchasing more credits to continue
          analysis.
        </div>
      )}
    </div>
  );
}
