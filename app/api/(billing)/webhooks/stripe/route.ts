import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { StripeService } from "@/lib/services/stripeService";
import connect from "@/lib/db";
import Stripe from "stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    if (!signature) {
      return new NextResponse("Missing stripe-signature header", {
        status: 400,
      });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not set");
      return new NextResponse("Webhook secret not configured", { status: 500 });
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = StripeService.verifyWebhookSignature(
        body,
        signature,
        webhookSecret
      );
    } catch (error) {
      console.error("Webhook signature verification failed:", error);
      return new NextResponse("Invalid signature", { status: 400 });
    }

    await connect();

    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment succeeded:", paymentIntent.id);

        try {
          await StripeService.handlePaymentSuccess(paymentIntent);
          console.log(
            "Credits added successfully for payment:",
            paymentIntent.id
          );
        } catch (error) {
          console.error("Error handling payment success:", error);
          return new NextResponse("Error processing payment", { status: 500 });
        }
        break;
      }

      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id);

        try {
          await StripeService.handleCheckoutSuccess(session);
          console.log(
            "Credits added successfully for checkout session:",
            session.id
          );
        } catch (error) {
          console.error("Error handling checkout success:", error);
          return new NextResponse("Error processing checkout", { status: 500 });
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("Payment failed:", paymentIntent.id);
        // You might want to notify the user or log this for analytics
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        console.log("Dispute created:", dispute.id);
        // Handle dispute - you might want to freeze credits or notify admins
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new NextResponse("Webhook processed successfully", { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new NextResponse(
      JSON.stringify({
        message: "Webhook processing failed",
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500 }
    );
  }
}
