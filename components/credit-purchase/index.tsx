"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, Coins, Star, Check, Zap, Gift } from "lucide-react";
import { toast } from "sonner";
import Loading from "../loading";
import { fetchData, postData } from "@/utils/fetch";

interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  popular?: boolean;
  bonusCredits?: number;
  description: string;
  totalCredits: number;
  pricePerCredit: string;
}

interface CreditPurchaseProps {
  userId: string;
  onPurchaseStart?: () => void;
  successUrl?: string;
  cancelUrl?: string;
}

export function CreditPurchase({
  userId,
  onPurchaseStart,
  successUrl,
  cancelUrl,
}: CreditPurchaseProps) {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await fetchData("/api/credits/packages");
      const { data } = response;
      setPackages(data);
      setError(null);
    } catch (err) {
      console.log("Error fetching packages:", err);
      setError(err instanceof Error ? err.message : "Failed to load packages");
      toast.error("Failed to load credit packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handlePurchase = async (packageId: string) => {
    try {
      setPurchasing(packageId);

      if (onPurchaseStart) {
        onPurchaseStart();
      }

      // Create payment intent
      const response = await postData("/api/credits/purchase", {
        userId,
        packageId,
        paymentMethod: "checkout",
        successUrl: successUrl || `${window.location.origin}/credits/success`,
        cancelUrl: cancelUrl || `${window.location.origin}/credits/cancel`,
      });

      const { data } = response;
      // Redirect to Stripe Checkout
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      console.log("Error purchasing credits:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to start purchase"
      );
      setPurchasing(null);
    }
  };

  const formatPrice = (priceInCents: number) => {
    return `$${(priceInCents / 100).toFixed(2)}`;
  };

  if (loading) {
    return <Loading message="Loading credit packages..." />;
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <CreditCard className="h-12 w-12 mx-auto mb-2" />
          <p className="text-lg font-medium">Failed to load credit packages</p>
          <p className="text-sm">{error}</p>
        </div>
        <Button onClick={fetchPackages} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Purchase Credits
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Choose a credit package to power your brand analysis. Credits are
            used to run AI models across different funnel stages.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl">
        {packages.map((pkg) => (
          <Card
            key={pkg.id}
            className={`relative ${
              pkg.popular
                ? "border-accent shadow-lg scale-105"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            {pkg.popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-accent text-white px-3 py-1">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="text-xl font-bold">{pkg.name}</CardTitle>
              <CardDescription className="text-sm">
                {pkg.description}
              </CardDescription>

              <div className="pt-4">
                <div className="text-4xl font-bold text-foreground">
                  {formatPrice(pkg.price)}
                </div>
                <div className="text-sm text-gray-500">
                  {/* Total number of runs in this plan */}
                  {pkg.totalCredits / 10} runs (10 credits per run)
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Credits Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-accent" />
                    Base Credits
                  </span>
                  <span className="font-medium">{pkg.credits}</span>
                </div>

                {pkg.bonusCredits && pkg.bonusCredits > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Gift className="h-4 w-4 text-green-500" />
                      Bonus Credits
                    </span>
                    <span className="font-medium text-green-600">
                      +{pkg.bonusCredits}
                    </span>
                  </div>
                )}

                <div className="border-t pt-2">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-purple-500" />
                      Total Credits
                    </span>
                    <span className="text-lg">{pkg.totalCredits}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500" />
                  Run multiple AI models
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500" />
                  All funnel stages included
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Check className="h-4 w-4 text-green-500" />
                  Detailed analysis reports
                </div>
                {pkg.popular && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500" />
                    Best value for money
                  </div>
                )}
              </div>

              {/* Purchase Button */}
              <Button
                onClick={() => handlePurchase(pkg.id)}
                disabled={purchasing !== null}
                className={`w-full ${
                  pkg.popular ? "bg-accent hover:bg-accent/90" : ""
                }`}
                size="lg"
                variant={purchasing === pkg.id ? "outline" : "default"}
              >
                {purchasing === pkg.id ? (
                  <Loading message="Processing..." />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Purchase Credits
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      <div className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
        <p>
          Credits never expire and can be used across all your brands. Secure
          payments processed by Stripe. Need help? Contact our support team.
        </p>
      </div>
    </div>
  );
}
