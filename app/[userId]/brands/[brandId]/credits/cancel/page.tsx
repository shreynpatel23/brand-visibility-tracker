"use client";

import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { XCircle, ArrowLeft, CreditCard } from "lucide-react";

export default function CreditPurchaseCancelPage() {
  const router = useRouter();
  const params = useParams();
  const { userId, brandId } = params;

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl text-red-800">
            Purchase Cancelled
          </CardTitle>
          <CardDescription>
            Your credit purchase was cancelled. No charges were made.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600">
              You can try purchasing credits again or return to your dashboard
              to continue using your existing credits.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              onClick={() =>
                router.push(`/${userId}/brands/${brandId}/credits/purchase`)
              }
              className="w-full"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <Button
              onClick={() =>
                router.push(`/${userId}/brands/${brandId}/dashboard`)
              }
              variant="outline"
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
