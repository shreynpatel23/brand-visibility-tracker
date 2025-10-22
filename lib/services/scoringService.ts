import { AnalysisStage } from "@/types/brand";

export interface ScoringWeights {
  base_weight: number;
  position_weights: {
    first: number;
    second: number;
    third: number;
    fourth: number;
    fifth: number;
    absent: number;
  };
  stage_specific_weights: {
    mofu_positive: number;
    mofu_conditional: number;
    mofu_neutral: number;
    mofu_negative: number;
    mofu_absent: number;
    bofu_yes: number;
    bofu_partial: number;
    bofu_unclear: number;
    bofu_no: number;
    bofu_absent: number;
    evfu_recommend: number;
    evfu_caveat: number;
    evfu_neutral: number;
    evfu_negative: number;
    evfu_absent: number;
  };
}

export interface ScoringResult {
  raw_score: number;
  position_weighted_score: number;
  mention_position: number;
  stage_specific_classification?: string;
}

export class ScoringService {
  /**
   * Apply stage-specific weighting based on CSV configuration
   */
  public static applyStageSpecificWeighting(
    stage: AnalysisStage,
    sentiment: {
      overall: "positive" | "neutral" | "negative";
      confidence: number;
    }
  ): number {
    let stageMultiplier = 1.0;

    switch (stage) {
      case "MOFU":
        stageMultiplier = this.getStageSpecificMultiplier(sentiment);
        break;

      case "BOFU":
        stageMultiplier = this.getStageSpecificMultiplier(sentiment);
        break;

      case "EVFU":
        stageMultiplier = this.getStageSpecificMultiplier(sentiment);
        break;
    }

    return stageMultiplier;
  }

  /**
   * Get stage-specific multiplier based on sentiment
   */
  private static getStageSpecificMultiplier(sentiment: {
    overall: "positive" | "neutral" | "negative";
    confidence: number;
  }): number {
    switch (sentiment.overall) {
      case "positive":
        return 1.0;
      case "neutral":
        return 0.5;
      case "negative":
        return 0.3;
      default:
        return 0;
    }
  }

  /**
   * Get stage-specific classification for better insights
   */
  private static getStageSpecificClassification(
    stage: AnalysisStage,
    sentiment: { overall: "positive" | "neutral" | "negative" },
    mentionPosition: number
  ): string {
    if (mentionPosition === 0) return "not_mentioned";

    switch (stage) {
      case "TOFU":
        if (mentionPosition <= 2) return "high_awareness";
        if (mentionPosition <= 3) return "moderate_awareness";
        return "low_awareness";

      case "MOFU":
        switch (sentiment.overall) {
          case "positive":
            return "strong_consideration";
          case "neutral":
            return "conditional_consideration";
          case "negative":
            return "weak_consideration";
        }
        break;

      case "BOFU":
        switch (sentiment.overall) {
          case "positive":
            return "purchase_ready";
          case "neutral":
            return "purchase_uncertain";
          case "negative":
            return "purchase_unlikely";
        }
        break;

      case "EVFU":
        switch (sentiment.overall) {
          case "positive":
            return "strong_advocacy";
          case "neutral":
            return "neutral_experience";
          case "negative":
            return "poor_experience";
        }
        break;
    }

    return "unknown";
  }

  /**
   * Calculate aggregate scores for multiple prompts
   */
  public static calculateAggregateScores(scoringResults: ScoringResult[]): {
    overall_score: number;
    weighted_score: number;
    mention_rate: number;
    top_position_rate: number;
  } {
    if (scoringResults.length === 0) {
      return {
        overall_score: 0,
        weighted_score: 0,
        mention_rate: 0,
        top_position_rate: 0,
      };
    }

    // Filter out any results with NaN values
    const validResults = scoringResults.filter(
      (r) => !isNaN(r.raw_score) && !isNaN(r.position_weighted_score)
    );

    if (validResults.length === 0) {
      return {
        overall_score: 0,
        weighted_score: 0,
        mention_rate: 0,
        top_position_rate: 0,
      };
    }

    const totalResults = validResults.length;
    const mentionedResults = validResults.filter((r) => r.mention_position > 0);
    const topPositionResults = validResults.filter(
      (r) => r.mention_position <= 2
    );

    const overall_score =
      validResults.reduce(
        (sum, r) => sum + (isNaN(r.raw_score) ? 0 : r.raw_score),
        0
      ) / totalResults;
    const weighted_score =
      validResults.reduce(
        (sum, r) =>
          sum +
          (isNaN(r.position_weighted_score) ? 0 : r.position_weighted_score),
        0
      ) / totalResults;
    const mention_rate = (mentionedResults.length / totalResults) * 100;
    const top_position_rate = (topPositionResults.length / totalResults) * 100;

    return {
      overall_score: isNaN(overall_score)
        ? 0
        : Math.round(overall_score * 100) / 100,
      weighted_score: isNaN(weighted_score)
        ? 0
        : Math.round(weighted_score * 100) / 100,
      mention_rate: isNaN(mention_rate)
        ? 0
        : Math.round(mention_rate * 100) / 100,
      top_position_rate: isNaN(top_position_rate)
        ? 0
        : Math.round(top_position_rate * 100) / 100,
    };
  }

  /**
   * Generate insights based on scoring results
   */
  public static generateInsights(
    scoringResults: ScoringResult[],
    stage: AnalysisStage
  ): {
    primary_insight: string;
    recommendations: string[];
    performance_level: "excellent" | "good" | "fair" | "poor";
  } {
    const aggregates = this.calculateAggregateScores(scoringResults);
    const avgWeightedScore = aggregates.weighted_score;
    const mentionRate = aggregates.mention_rate;
    const topPositionRate = aggregates.top_position_rate;

    let performance_level: "excellent" | "good" | "fair" | "poor";
    let primary_insight: string;
    const recommendations: string[] = [];

    // Determine performance level
    if (avgWeightedScore >= 80 && mentionRate >= 70) {
      performance_level = "excellent";
    } else if (avgWeightedScore >= 60 && mentionRate >= 50) {
      performance_level = "good";
    } else if (avgWeightedScore >= 40 && mentionRate >= 30) {
      performance_level = "fair";
    } else {
      performance_level = "poor";
    }

    // Generate stage-specific insights
    switch (stage) {
      case "TOFU":
        primary_insight = `Brand awareness is ${performance_level} with ${mentionRate.toFixed(
          1
        )}% mention rate and ${topPositionRate.toFixed(1)}% top-position rate.`;
        if (mentionRate < 50)
          recommendations.push("Increase brand awareness campaigns");
        if (topPositionRate < 30)
          recommendations.push("Focus on becoming a category leader");
        break;

      case "MOFU":
        primary_insight = `Brand consideration is ${performance_level} with weighted score of ${avgWeightedScore.toFixed(
          1
        )}.`;
        if (avgWeightedScore < 60)
          recommendations.push("Improve product differentiation");
        if (mentionRate < 40)
          recommendations.push("Enhance thought leadership content");
        break;

      case "BOFU":
        primary_insight = `Purchase intent is ${performance_level} with ${avgWeightedScore.toFixed(
          1
        )} weighted score.`;
        if (avgWeightedScore < 70)
          recommendations.push("Optimize conversion funnel");
        if (mentionRate < 60)
          recommendations.push("Improve sales enablement materials");
        break;

      case "EVFU":
        primary_insight = `Customer advocacy is ${performance_level} with ${avgWeightedScore.toFixed(
          1
        )} weighted score.`;
        if (avgWeightedScore < 70)
          recommendations.push("Focus on customer success initiatives");
        if (mentionRate < 50)
          recommendations.push("Implement referral programs");
        break;
    }

    return {
      primary_insight,
      recommendations,
      performance_level,
    };
  }
}
