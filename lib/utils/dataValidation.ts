/**
 * Utility functions for validating and sanitizing data before database storage
 */

export class DataValidation {
  /**
   * Sanitize a score to ensure it's within 0-100 range
   */
  static sanitizeScore(value: any): number {
    if (typeof value !== "number" || isNaN(value)) {
      return 0;
    }
    return Math.min(Math.max(value, 0), 100);
  }

  /**
   * Sanitize a confidence score to ensure it's within 0-100 range
   */
  static sanitizeConfidence(value: any): number {
    if (typeof value !== "number" || isNaN(value)) {
      return 50; // Default confidence
    }
    return Math.min(Math.max(value, 0), 100);
  }

  /**
   * Sanitize mention position to ensure it's within 0-5 range
   */
  static sanitizeMentionPosition(value: any): number {
    if (typeof value !== "number" || isNaN(value)) {
      return 0;
    }
    return Math.min(Math.max(Math.floor(value), 0), 5);
  }

  /**
   * Sanitize response time to ensure it's positive
   */
  static sanitizeResponseTime(value: any): number {
    if (typeof value !== "number" || isNaN(value)) {
      return 0;
    }
    return Math.max(value, 0);
  }

  /**
   * Sanitize sentiment distribution to ensure all values are 0-100 and sum to reasonable total
   */
  static sanitizeSentimentDistribution(distribution: any): {
    positive: number;
    neutral: number;
    negative: number;
    strongly_positive: number;
  } {
    const positive = this.sanitizeScore(distribution?.positive);
    const neutral = this.sanitizeScore(distribution?.neutral);
    const negative = this.sanitizeScore(distribution?.negative);
    const strongly_positive = this.sanitizeScore(
      distribution?.strongly_positive
    );

    // If all values are 0, set neutral to 100 as default
    if (
      positive === 0 &&
      neutral === 0 &&
      negative === 0 &&
      strongly_positive === 0
    ) {
      return {
        positive: 0,
        neutral: 100,
        negative: 0,
        strongly_positive: 0,
      };
    }

    return {
      positive,
      neutral,
      negative,
      strongly_positive,
    };
  }

  /**
   * Validate and sanitize overall sentiment
   */
  static sanitizeSentiment(
    sentiment: any
  ): "positive" | "neutral" | "negative" {
    if (typeof sentiment === "string") {
      const normalized = sentiment.toLowerCase();
      if (["positive", "neutral", "negative"].includes(normalized)) {
        return normalized as "positive" | "neutral" | "negative";
      }
    }
    return "neutral"; // Default fallback
  }

  /**
   * Validate and sanitize analysis status
   */
  static sanitizeStatus(status: any): "success" | "error" | "warning" {
    if (typeof status === "string") {
      const normalized = status.toLowerCase();
      if (["success", "error", "warning"].includes(normalized)) {
        return normalized as "success" | "error" | "warning";
      }
    }
    return "success"; // Default fallback
  }

  /**
   * Comprehensive validation for analysis result before database storage
   */
  static validateAnalysisResult(data: any): {
    isValid: boolean;
    errors: string[];
    sanitizedData: any;
  } {
    const errors: string[] = [];

    try {
      const sanitizedData = {
        overall_score: this.sanitizeScore(data.overall_score),
        weighted_score: this.sanitizeScore(data.weighted_score),
        total_response_time: this.sanitizeResponseTime(
          data.total_response_time
        ),
        success_rate: this.sanitizeScore(data.success_rate),
        aggregated_sentiment: {
          overall: this.sanitizeSentiment(data.aggregated_sentiment?.overall),
          confidence: this.sanitizeConfidence(
            data.aggregated_sentiment?.confidence
          ),
          distribution: this.sanitizeSentimentDistribution(
            data.aggregated_sentiment?.distribution
          ),
        },
        prompt_results: (data.prompt_results || []).map((result: any) => ({
          prompt_id: result.prompt_id || "unknown",
          prompt_text: result.prompt_text || "No prompt text",
          score: this.sanitizeScore(result.score),
          weighted_score: this.sanitizeScore(result.weighted_score),
          mention_position: this.sanitizeMentionPosition(
            result.mention_position
          ),
          response: result.response || "No response",
          response_time: this.sanitizeResponseTime(result.response_time),
          sentiment: {
            overall: this.sanitizeSentiment(result.sentiment?.overall),
            confidence: this.sanitizeConfidence(result.sentiment?.confidence),
            distribution: this.sanitizeSentimentDistribution(
              result.sentiment?.distribution
            ),
          },
          status: this.sanitizeStatus(result.status),
        })),
        metadata: {
          user_id: data.metadata?.user_id,
          trigger_type: data.metadata?.trigger_type || "manual",
          version: data.metadata?.version || "1.0",
          total_prompts: Math.max(data.metadata?.total_prompts || 0, 0),
          successful_prompts: Math.max(
            data.metadata?.successful_prompts || 0,
            0
          ),
        },
        status: this.sanitizeStatus(data.status),
      };

      // Additional validation checks
      if (!sanitizedData.metadata.user_id) {
        errors.push("Missing user_id in metadata");
      }

      if (sanitizedData.prompt_results.length === 0) {
        errors.push("No prompt results provided");
      }

      return {
        isValid: errors.length === 0,
        errors,
        sanitizedData,
      };
    } catch (error) {
      errors.push(
        `Validation error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      return {
        isValid: false,
        errors,
        sanitizedData: null,
      };
    }
  }

  /**
   * Log validation warnings for debugging
   */
  static logValidationWarnings(
    originalData: any,
    sanitizedData: any,
    context: string = ""
  ) {
    const warnings: string[] = [];

    // Check for significant changes in scores
    if (
      Math.abs(
        (originalData.overall_score || 0) - sanitizedData.overall_score
      ) > 0.1
    ) {
      warnings.push(
        `Overall score changed from ${originalData.overall_score} to ${sanitizedData.overall_score}`
      );
    }

    if (
      Math.abs(
        (originalData.weighted_score || 0) - sanitizedData.weighted_score
      ) > 0.1
    ) {
      warnings.push(
        `Weighted score changed from ${originalData.weighted_score} to ${sanitizedData.weighted_score}`
      );
    }

    if (
      Math.abs(
        (originalData.aggregated_sentiment?.confidence || 50) -
          sanitizedData.aggregated_sentiment.confidence
      ) > 1
    ) {
      warnings.push(
        `Confidence changed from ${originalData.aggregated_sentiment?.confidence} to ${sanitizedData.aggregated_sentiment.confidence}`
      );
    }

    if (warnings.length > 0) {
      console.warn(
        `Data validation warnings${context ? ` for ${context}` : ""}:`,
        warnings
      );
    }
  }
}
