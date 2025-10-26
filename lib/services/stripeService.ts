import Stripe from "stripe";
import { CreditService } from "./creditService";
import User from "@/lib/models/user";
import { CreditPackage } from "@/types/services";

// Validate Stripe configuration on module load
if (!process.env.STRIPE_PRIVATE_KEY) {
  throw new Error("STRIPE_PRIVATE_KEY is not set in environment variables");
}

// Initialize Stripe client with private key
const stripe = new Stripe(process.env.STRIPE_PRIVATE_KEY);

/**
 * Stripe Payment Service
 *
 * Handles all Stripe-related payment operations for credit purchases:
 * - Customer management and creation
 * - Payment intent creation for card payments
 * - Checkout session management for hosted payment flows
 * - Webhook handling for payment confirmations
 * - Refund processing and payment history
 *
 * This service integrates with the CreditService to automatically
 * add credits to user accounts upon successful payments.
 */
export class StripeService {
  /**
   * Predefined credit packages with pricing and configuration
   *
   * Each package includes:
   * - Credit amount and pricing in cents (USD)
   * - Stripe price ID for checkout sessions
   * - Marketing flags (popular packages)
   * - Bonus credits for promotional offers
   */
  public static readonly CREDIT_PACKAGES: CreditPackage[] = [
    {
      id: "small_pack",
      name: "Small Pack",
      credits: 100,
      price: 4000,
      priceId: process.env.STRIPE_PRICE_ID_100_CREDITS || "",
      description: "100 credits - Perfect for small brands",
    },
    {
      id: "medium_pack",
      name: "Medium Pack",
      credits: 250,
      price: 8000,
      priceId: process.env.STRIPE_PRICE_ID_250_CREDITS || "",
      description: "250 credits - Great for growing businesses",
    },
    {
      id: "large_pack",
      name: "Large Pack",
      credits: 500,
      price: 14000,
      popular: true,
      priceId: process.env.STRIPE_PRICE_ID_500_CREDITS || "",
      description: "500 credits - Most popular for agencies",
    },
    {
      id: "xl_pack",
      name: "XL Pack",
      credits: 2500,
      price: 40000,
      priceId: process.env.STRIPE_PRICE_ID_2500_CREDITS || "",
      description: "2500 credits - Enterprise solution",
    },
    {
      id: "xxl_pack",
      name: "XXL Pack",
      credits: 10000,
      price: 100000,
      priceId: process.env.STRIPE_PRICE_ID_10000_CREDITS || "",
      description: "10000 credits - Maximum value",
    },
    {
      id: "xxxl_pack",
      name: "XXXL Pack",
      credits: 50000,
      price: 300000,
      popular: true,
      priceId: process.env.STRIPE_PRICE_ID_50000_CREDITS || "",
      description: "50000 credits - Ultimate package",
    },
  ];

  /**
   * Create or retrieve Stripe customer
   */
  public static async createOrGetCustomer(
    userId: string,
    email: string,
    name: string
  ): Promise<string> {
    const user = await User.findById(userId);

    if (user?.stripe_customer_id) {
      // Verify customer exists in Stripe
      try {
        await stripe.customers.retrieve(user.stripe_customer_id);
        return user.stripe_customer_id;
      } catch (error) {
        console.error("Stripe customer not found, creating new one:", error);
      }
    }

    // Create new customer
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId,
      },
    });

    // Update user with customer ID
    await User.findByIdAndUpdate(userId, {
      stripe_customer_id: customer.id,
    });

    return customer.id;
  }

  /**
   * Create payment intent for credit purchase
   */
  public static async createPaymentIntent(
    userId: string,
    packageId: string,
    userEmail: string,
    userName: string
  ): Promise<{
    clientSecret: string;
    paymentIntentId: string;
    amount: number;
    credits: number;
  }> {
    const creditPackage = this.CREDIT_PACKAGES.find(
      (pkg) => pkg.id === packageId
    );
    if (!creditPackage) {
      throw new Error("Invalid credit package");
    }

    const customerId = await this.createOrGetCustomer(
      userId,
      userEmail,
      userName
    );

    const paymentIntent = await stripe.paymentIntents.create({
      amount: creditPackage.price,
      currency: "usd",
      customer: customerId,
      metadata: {
        userId,
        packageId,
        credits: creditPackage.credits.toString(),
        bonusCredits: (creditPackage.bonusCredits || 0).toString(),
      },
      description: `${creditPackage.name} - ${creditPackage.credits} credits`,
    });

    return {
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
      amount: creditPackage.price,
      credits: creditPackage.credits + (creditPackage.bonusCredits || 0),
    };
  }

  /**
   * Handle successful payment webhook
   */
  public static async handlePaymentSuccess(
    paymentIntent: Stripe.PaymentIntent
  ): Promise<void> {
    const { userId, packageId, credits, bonusCredits } = paymentIntent.metadata;

    if (!userId || !packageId || !credits) {
      throw new Error("Missing required metadata in payment intent");
    }

    const totalCredits = parseInt(credits) + parseInt(bonusCredits || "0");
    const creditPackage = this.CREDIT_PACKAGES.find(
      (pkg) => pkg.id === packageId
    );

    if (!creditPackage) {
      throw new Error("Invalid credit package in payment metadata");
    }

    // Add credits to user account
    await CreditService.addCredits(
      userId,
      totalCredits,
      "purchase",
      `Credit purchase: ${creditPackage.name}`,
      paymentIntent.id
    );
  }

  /**
   * Create Stripe checkout session (alternative to payment intents)
   */
  public static async createCheckoutSession(
    userId: string,
    packageId: string,
    userEmail: string,
    userName: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const creditPackage = this.CREDIT_PACKAGES.find(
      (pkg) => pkg.id === packageId
    );
    if (!creditPackage) {
      throw new Error("Invalid credit package");
    }

    const customerId = await this.createOrGetCustomer(
      userId,
      userEmail,
      userName
    );

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: creditPackage.priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId,
        packageId,
        credits: creditPackage.credits.toString(),
        bonusCredits: (creditPackage.bonusCredits || 0).toString(),
      },
    });

    return {
      sessionId: session.id,
      url: session.url!,
    };
  }

  /**
   * Handle successful checkout session
   */
  public static async handleCheckoutSuccess(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    const { userId, packageId, credits, bonusCredits } = session.metadata || {};

    if (!userId || !packageId || !credits) {
      throw new Error("Missing required metadata in checkout session");
    }

    const totalCredits = parseInt(credits) + parseInt(bonusCredits || "0");
    const creditPackage = this.CREDIT_PACKAGES.find(
      (pkg) => pkg.id === packageId
    );

    if (!creditPackage) {
      throw new Error("Invalid credit package in session metadata");
    }

    // Add credits to user account
    await CreditService.addCredits(
      userId,
      totalCredits,
      "purchase",
      `Credit purchase: ${creditPackage.name}`,
      session.payment_intent as string
    );
  }

  /**
   * Get customer's payment methods
   */
  public static async getCustomerPaymentMethods(customerId: string) {
    return await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });
  }

  /**
   * Get customer's payment history
   */
  public static async getCustomerPayments(
    customerId: string,
    limit: number = 10
  ) {
    return await stripe.paymentIntents.list({
      customer: customerId,
      limit,
    });
  }

  /**
   * Refund a payment
   */
  public static async refundPayment(
    paymentIntentId: string,
    amount?: number,
    reason?: string
  ): Promise<Stripe.Refund> {
    const refundData: Stripe.RefundCreateParams = {
      payment_intent: paymentIntentId,
    };

    if (amount) {
      refundData.amount = amount;
    }

    if (reason) {
      refundData.reason = reason as Stripe.RefundCreateParams.Reason;
    }

    return await stripe.refunds.create(refundData);
  }

  /**
   * Verify webhook signature
   */
  public static verifyWebhookSignature(
    payload: string | Buffer,
    signature: string,
    secret: string
  ): Stripe.Event {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }
}
