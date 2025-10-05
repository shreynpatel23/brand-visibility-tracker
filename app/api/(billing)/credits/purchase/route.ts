import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { authMiddleware } from "@/middlewares/apis/authMiddleware";
import { StripeService } from "@/lib/services/stripeService";
import connect from "@/lib/db";
import { Types } from "mongoose";
import User from "@/lib/models/user";

const PurchaseCreditsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  packageId: z.string().min(1, "Package ID is required"),
  paymentMethod: z.enum(["payment_intent", "checkout"]).default("checkout"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await authMiddleware(request);
    if (!authResult.isValid) {
      return new NextResponse(
        JSON.stringify({ message: "Unauthorized access!" }),
        { status: 401 }
      );
    }

    const requestBody = await request.json();
    const parse = PurchaseCreditsSchema.safeParse(requestBody);

    if (!parse.success) {
      return new NextResponse(
        JSON.stringify({
          message: "Invalid request body!",
          errors: parse.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        }),
        { status: 400 }
      );
    }

    const { userId, packageId, paymentMethod, successUrl, cancelUrl } =
      parse.data;

    // Validate userId
    if (!Types.ObjectId.isValid(userId)) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid userId format!" }),
        { status: 400 }
      );
    }

    await connect();

    // Get user details
    const user = await User.findById(userId);
    if (!user) {
      return new NextResponse(JSON.stringify({ message: "User not found!" }), {
        status: 404,
      });
    }

    // Validate package exists
    const creditPackage = StripeService.CREDIT_PACKAGES.find(
      (pkg) => pkg.id === packageId
    );
    if (!creditPackage) {
      return new NextResponse(
        JSON.stringify({ message: "Invalid credit package!" }),
        { status: 400 }
      );
    }

    if (paymentMethod === "checkout") {
      // Create checkout session
      if (!successUrl || !cancelUrl) {
        return new NextResponse(
          JSON.stringify({
            message:
              "Success URL and Cancel URL are required for checkout method!",
          }),
          { status: 400 }
        );
      }

      const session = await StripeService.createCheckoutSession(
        userId,
        packageId,
        user.email,
        user.full_name,
        successUrl,
        cancelUrl
      );

      return new NextResponse(
        JSON.stringify({
          success: true,
          message: "Checkout session created successfully!",
          data: {
            sessionId: session.sessionId,
            url: session.url,
            package: creditPackage,
          },
        }),
        { status: 200 }
      );
    } else {
      // Create payment intent
      const paymentIntent = await StripeService.createPaymentIntent(
        userId,
        packageId,
        user.email,
        user.full_name
      );

      return new NextResponse(
        JSON.stringify({
          success: true,
          message: "Payment intent created successfully!",
          data: {
            clientSecret: paymentIntent.clientSecret,
            paymentIntentId: paymentIntent.paymentIntentId,
            amount: paymentIntent.amount,
            credits: paymentIntent.credits,
            package: creditPackage,
          },
        }),
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Credit purchase API error:", error);
    return new NextResponse(
      JSON.stringify({
        message: "Error processing credit purchase",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
