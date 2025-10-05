import { NextRequest, NextResponse } from "next/server";
import { StripeService } from "@/lib/services/stripeService";

export async function GET(request: NextRequest) {
  try {
    // Return available credit packages
    const packages = StripeService.CREDIT_PACKAGES.map((pkg) => ({
      id: pkg.id,
      name: pkg.name,
      credits: pkg.credits,
      price: pkg.price,
      popular: pkg.popular,
      bonusCredits: pkg.bonusCredits,
      description: pkg.description,
      totalCredits: pkg.credits + (pkg.bonusCredits || 0),
      pricePerCredit: (
        pkg.price /
        (pkg.credits + (pkg.bonusCredits || 0))
      ).toFixed(2),
    }));

    return new NextResponse(
      JSON.stringify({
        success: true,
        data: packages,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Get credit packages API error:", error);
    return new NextResponse(
      JSON.stringify({
        message: "Error fetching credit packages",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
