import User from "@/lib/models/user";
import CreditTransaction from "@/lib/models/creditTransaction";
import { AIModel } from "@/types/plans";

export class CreditService {
  // Credit costs per model (for all stages)
  private static readonly CREDIT_COSTS = {
    per_model_all_stages: 10,
  };

  /**
   * Calculate credits needed for analysis
   * Now calculates based on models only (all stages included)
   */
  public static calculateCreditsNeeded(models: AIModel[]): number {
    return models.length * this.CREDIT_COSTS.per_model_all_stages;
  }

  /**
   * Check if user has enough credits for analysis
   */
  public static async hasEnoughCredits(
    userId: string,
    requiredCredits: number
  ): Promise<{ hasEnough: boolean; currentBalance: number }> {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentBalance = user.credits_balance || 0;
    return {
      hasEnough: currentBalance >= requiredCredits,
      currentBalance,
    };
  }

  /**
   * Deduct credits for analysis
   */
  public static async deductCredits(
    userId: string,
    amount: number,
    analysisId: string,
    description: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const session = await User.startSession();

    try {
      await session.withTransaction(async () => {
        // Check current balance
        const user = await User.findById(userId).session(session);
        if (!user) {
          throw new Error("User not found");
        }

        const currentBalance = user.credits_balance || 0;
        if (currentBalance < amount) {
          throw new Error("Insufficient credits");
        }

        // Update user balance
        const newBalance = currentBalance - amount;
        await User.findByIdAndUpdate(
          userId,
          {
            credits_balance: newBalance,
            total_credits_used: (user.total_credits_used || 0) + amount,
          },
          { session }
        );

        // Record transaction
        await new CreditTransaction({
          user_id: userId,
          type: "usage",
          amount: -amount, // Negative for deduction
          description,
          analysis_id: analysisId,
        }).save({ session });
      });

      // Get updated balance
      const updatedUser = await User.findById(userId);
      return {
        success: true,
        newBalance: updatedUser?.credits_balance || 0,
      };
    } catch (error) {
      console.error("Error deducting credits:", error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Add credits to user account
   */
  public static async addCredits(
    userId: string,
    amount: number,
    type: "purchase" | "bonus" | "refund",
    description: string,
    stripePaymentIntentId?: string
  ): Promise<{ success: boolean; newBalance: number }> {
    const session = await User.startSession();

    try {
      await session.withTransaction(async () => {
        const user = await User.findById(userId).session(session);
        if (!user) {
          throw new Error("User not found");
        }

        const currentBalance = user.credits_balance || 0;
        const newBalance = currentBalance + amount;

        const updateData: any = {
          credits_balance: newBalance,
        };

        if (type === "purchase") {
          updateData.total_credits_purchased =
            (user.total_credits_purchased || 0) + amount;
        }

        await User.findByIdAndUpdate(userId, updateData, { session });

        // Record transaction
        await new CreditTransaction({
          user_id: userId,
          type,
          amount,
          description,
          stripe_payment_intent_id: stripePaymentIntentId,
        }).save({ session });
      });

      // Get updated balance
      const updatedUser = await User.findById(userId);
      return {
        success: true,
        newBalance: updatedUser?.credits_balance || 0,
      };
    } catch (error) {
      console.error("Error adding credits:", error);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Assign free credits to new user
   */
  public static async assignFreeCredits(userId: string): Promise<void> {
    const FREE_CREDITS = 50; // Enough for 12+ analyses (4 credits per model, 3 models = 12 credits per full analysis)

    await this.addCredits(
      userId,
      FREE_CREDITS,
      "bonus",
      "Welcome bonus - Free credits for new users"
    );
  }

  /**
   * Get user's credit history
   */
  public static async getCreditHistory(
    userId: string,
    limit: number = 50,
    skip: number = 0,
    filters?: {
      type?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    // Build query object
    const query: any = { user_id: userId };

    // Add type filter
    if (filters?.type) {
      query.type = filters.type;
    }

    // Add date range filters
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};

      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        // Add 1 day to end date to include the entire end date
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        query.createdAt.$lt = endDate;
      }
    }

    return await CreditTransaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Get count of user's credit history with filters
   */
  public static async getCreditHistoryCount(
    userId: string,
    filters?: {
      type?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<number> {
    // Build query object (same as getCreditHistory)
    const query: any = { user_id: userId };

    // Add type filter
    if (filters?.type) {
      query.type = filters.type;
    }

    // Add date range filters
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};

      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }

      if (filters.endDate) {
        // Add 1 day to end date to include the entire end date
        const endDate = new Date(filters.endDate);
        endDate.setDate(endDate.getDate() + 1);
        query.createdAt.$lt = endDate;
      }
    }

    return await CreditTransaction.countDocuments(query);
  }

  /**
   * Get user's credit balance
   */
  public static async getCreditBalance(userId: string): Promise<number> {
    const user = await User.findById(userId);
    return user?.credits_balance || 0;
  }

  /**
   * Get credit usage statistics for user
   */
  public static async getCreditStats(userId: string) {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const totalPurchased = user.total_credits_purchased || 0;
    const totalUsed = user.total_credits_used || 0;
    const currentBalance = user.credits_balance || 0;

    // Get recent transactions
    const recentTransactions = await CreditTransaction.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return {
      currentBalance,
      totalPurchased,
      totalUsed,
      recentTransactions,
    };
  }

  /**
   * Validate analysis request and return credit requirements
   */
  public static validateAnalysisRequest(models: AIModel[]): {
    isValid: boolean;
    creditsNeeded: number;
    breakdown: { model: AIModel; credits: number; stages: string }[];
    errors?: string[];
  } {
    const errors: string[] = [];
    const breakdown: {
      model: AIModel;
      credits: number;
      stages: string;
    }[] = [];

    // Validate models
    const validModels: AIModel[] = ["ChatGPT", "Claude", "Gemini"];
    const invalidModels = models.filter((m) => !validModels.includes(m));
    if (invalidModels.length > 0) {
      errors.push(`Invalid models: ${invalidModels.join(", ")}`);
    }

    // Calculate breakdown (each model runs through all stages)
    for (const model of models) {
      if (validModels.includes(model)) {
        breakdown.push({
          model,
          credits: this.CREDIT_COSTS.per_model_all_stages,
          stages: "All funnel stages (TOFU, MOFU, BOFU, EVFU)",
        });
      }
    }

    const creditsNeeded = breakdown.reduce(
      (sum, item) => sum + item.credits,
      0
    );

    return {
      isValid: errors.length === 0,
      creditsNeeded,
      breakdown,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
