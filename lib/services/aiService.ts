import { AIModel, AnalysisStage, IBrand } from "@/types/brand";
import { LLMService } from "./llmService";
import { PromptService, StageSpecificWeights } from "./promptService";
import { AIAnalysisResults } from "./dataOrganizationService";

export class AIService {
  // AI API configuration
  private static readonly API_KEYS = {
    ChatGPT: process.env.OPENAI_API_KEY,
    Claude: process.env.CLAUDE_API_KEY,
    Gemini: process.env.GEMINI_API_KEY,
  };

  private static readonly AI_ENDPOINTS = {
    ChatGPT: process.env.OPENAI_API_URL!,
    Claude: process.env.CLAUDE_API_URL!,
    Gemini: process.env.GEMINI_API_URL!,
  };

  private static computeStageSpecificScore(
    stage: "TOFU" | "MOFU" | "BOFU" | "EVFU",
    value: string,
    weights: any,
    baseWeight: number
  ): { rawScore: number; weightedScore: number } {
    let stageMap: Record<string, number> = {};

    switch (stage) {
      case "TOFU":
        stageMap = weights.position_weights;
        break;
      case "MOFU":
        stageMap = weights.mofu_scale;
        break;
      case "BOFU":
        stageMap = weights.bofu_scale;
        break;
      case "EVFU":
        stageMap = weights.evfu_scale;
        break;
    }

    const rawScore = stageMap[value] ?? 0;
    const weightedScore = rawScore * baseWeight;
    return { rawScore, weightedScore };
  }

  /**
   * Get the system prompt for the given stage
   * @param response - The response from the AI model
   * @param stage - The stage of the marketing funnel to analyze
   * @param brandData - The brand data to use in the prompt
   * @returns The system prompt for the given stage
   */
  private static getStageSpeficAnalysisPrompt(
    prompt: string,
    response: string,
    stage: AnalysisStage,
    brandData: IBrand
  ): {
    systemMessage: string;
    prompt: string;
  } {
    const {
      name,
      category,
      region,
      target_audience,
      use_case,
      competitors,
      feature_list,
    } = brandData;

    // // Common dynamic info block
    const brandSummary = `
        Brand Context:
        - Brand Name: ${name || "Unknown Brand"}
        - Category: ${category || "General Business Services"}
        - Region: ${region || "Global"}
        - Target Audience: ${
          (target_audience && target_audience.join(", ")) || "Businesses"
        }
        - Use Case: ${use_case || "General Needs"}
        - Competitors: ${
          (competitors && competitors.join(", ")) || "None specified"
        }
        - Key Features: ${
          (feature_list && feature_list.slice(0, 3).join(", ")) ||
          "Core Offerings"
        }`;

    switch (stage) {
      case "TOFU":
        return {
          systemMessage: `
          You are a marketing analysis assistant.
          Your task is to evaluate a brand’s presence and visibility in the Top-Of-Funnel (TOFU) stage.

          TOFU focuses on awareness and recognition:
          - How visible is the brand online and within its industry?
          - Is the brand mentioned among top competitors or notable players?
          - How discoverable is it in search and social contexts?
        `,
          prompt: `
          Brand Context:
          ${brandSummary}

          Question asked:
          ${prompt}

          Response to Evaluate:
          ${response}

          When evaluating:
          - Identify if the brand is mentioned among industry leaders.
          - Assign a rank: first, second, third, fourth, fifth, or 'absent'.
          - Be concise and objective.

          Format strictly like this, Make sure all keys and strings are properly quoted and commas are placed correctly.
          Example:
          { 
            "brand_mentioned": true/false,
            "rank": "first|second|third|fourth|fifth|absent",
            "comment": "<short comment based on the question asked and the response to evaluate, if the brand is mentioned, provide a short comment on why it is mentioned in the given rank, if the brand is not mentioned, provide a short comment on why it is not mentioned and how it can be improved to be mentioned in the given rank>",
            "sentiment_distribution": {
              "overall": "positive|neutral|negative",
              "confidence": number <0-100>,
              "distribution": {
                "positive": number <0-100>,
                "neutral": number <0-100>,
                "negative": number <0-100>,
                "strongly_positive": number <0-100>,
              }
            }
          }`.trim(),
        };
      case "MOFU":
        return {
          systemMessage: `
          You are a marketing analysis assistant.
          Your task is to evaluate a brand’s performance in the Middle-Of-Funnel (MOFU) stage.

          MOFU focuses on evaluation and consideration:
          - How do people perceive the brand’s value, features, and credibility?
          - What is the sentiment around its offerings compared to competitors?
          `,
          prompt: `
          Brand Context:
          ${brandSummary}

          Question asked:
          ${prompt}

          Response to Evaluate:
          ${response}


          When evaluating:
          - Assign tone: positive, conditional, neutral, negative, or absent.
          - Provide short reasoning if relevant.

          Format strictly like this, Make sure all keys and strings are properly quoted and commas are placed correctly.
          Example:
          {
            "tone": "positive|conditional|neutral|negative|absent",
            "comment": "<short comment based on the question asked and the response to evaluate, if positive, provide a short comment on why it is positive, if conditional / neutral / negative/ absent, provide a short comment on why it is conditional / neutral / negative / absent and how it can be improved to be positive>",
            "sentiment_distribution": {
              "overall": "positive|neutral|negative",
              "confidence": number <0-100>,
              "distribution": {
                "positive": number <0-100>,
                "neutral": number <0-100>,
                "negative": number <0-100>,
                "strongly_positive": number <0-100>,
              }
            }
          }`.trim(),
        };
      case "BOFU":
        return {
          systemMessage: `
          You are a marketing analysis assistant.
          Your task is to evaluate a brand’s performance in the Bottom-Of-Funnel (BOFU) stage.

          BOFU focuses on purchase intent and reliability:
          - How likely is a customer to convert or buy?
          - Is the brand positioned clearly for conversion?
          `,
          prompt: `
          Brand Context:
          ${brandSummary}

          Question asked:
          ${prompt}

          Response to Evaluate:
          ${response}

          When evaluating:
          - Assign intent: yes, partial, unclear, no, or absent.
          - Provide short reasoning if relevant.

          Format strictly like this, Make sure all keys and strings are properly quoted and commas are placed correctly.
          Example:
          {
            "intent": "yes|partial|unclear|no|absent",
            "comment": "<short comment based on the question asked and the response to evaluate, if yes, provide a short comment on why it is yes, if partial / unclear / no / absent, provide a short comment on why it is partial / unclear / no / absent and how it can be improved to be yes>",
            "sentiment_distribution": {
              "overall": "positive|neutral|negative",
              "confidence": number <0-100>,
              "distribution": {
                "positive": number <0-100>,
                "neutral": number <0-100>,
                "negative": number <0-100>,
                "strongly_positive": number <0-100>,
              }
            }
          }`.trim(),
        };
      case "EVFU":
        return {
          systemMessage: `
          You are a marketing analysis assistant.
          Your task is to evaluate a brand’s performance in the End-Of-Funnel (EVFU) stage.

          EVFU focuses on post-purchase reputation, trust, and loyalty:
          - How do customers perceive their experience with the brand?
          - Would they recommend it to others?`,
          prompt: `
          Brand Context:
          ${brandSummary}

          Question asked:
          ${prompt}

          Response to Evaluate:
          ${response}

          When evaluating:
          - Assign sentiment: recommend, caveat, neutral, negative, or absent.
          - Provide short reasoning if relevant.

          Format strictly like this, Make sure all keys and strings are properly quoted and commas are placed correctly.
          Example:
          {
            "sentiment": "recommend|caveat|neutral|negative|absent",
            "comment": "<short comment based on the question asked and the response to evaluate, if recommend, provide a short comment on why it is recommend, if caveat / neutral / negative / absent, provide a short comment on why it is caveat / neutral / negative / absent and how it can be improved to be recommend>",
            "sentiment_distribution": {
              "overall": "positive|neutral|negative",
              "confidence": number <0-100>,
              "distribution": {
                "positive": number <0-100>,
                "neutral": number <0-100>,
                "negative": number <0-100>,
                "strongly_positive": number <0-100>,
              }
            }
          }`.trim(),
        };

      default:
        throw new Error(`Unknown analysis stage: ${stage}`);
    }
  }

  /**
   * Parse AI response to extract structured data with proper stage-specific scoring
   */
  private static async parseAIResponse(
    prompt: string,
    data: string,
    brandData: IBrand,
    stage?: string,
    weights?: StageSpecificWeights
  ): Promise<{
    score: number;
    position_weighted_score: number;
    mentionPosition: number | null;
    analysis: string;
    sentiment: {
      overall: "positive" | "neutral" | "negative";
      confidence: number;
      distribution: {
        positive: number;
        neutral: number;
        negative: number;
        strongly_positive: number;
      };
    };
    status: "success" | "error";
  }> {
    const aiResponse = await LLMService.callChatGPT(
      this.getStageSpeficAnalysisPrompt(
        prompt,
        data,
        stage as AnalysisStage,
        brandData
      ).prompt,
      this.getStageSpeficAnalysisPrompt(
        prompt,
        data,
        stage as AnalysisStage,
        brandData
      ).systemMessage
    );
    let response;
    try {
      response = JSON.parse(aiResponse.response);
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error("Raw AI response:", aiResponse.response);
      response = {
        score: 0,
        position_weighted_score: 0,
        mentionPosition: null,
        analysis: `JSON parsing failed. Raw response: ${aiResponse.response}`,
        sentiment: {
          overall: "neutral",
          confidence: 0,
          distribution: {
            positive: 0,
            neutral: 0,
            negative: 0,
            strongly_positive: 0,
          },
        },
        status: "error",
      };
    }

    if (response.status === "error") {
      return response;
    }

    let value = "";
    let mentionedPosition = null;
    switch (stage) {
      case "TOFU":
        value = response.rank;
        mentionedPosition =
          response.rank === "first"
            ? 1
            : response.rank === "second"
            ? 2
            : response.rank === "third"
            ? 3
            : response.rank === "fourth"
            ? 4
            : response.rank === "fifth"
            ? 5
            : 0;
        break;
      case "MOFU":
        value = response.tone;
        mentionedPosition =
          response.tone === "positive"
            ? 1
            : response.tone === "conditional"
            ? 2
            : response.tone === "neutral"
            ? 3
            : response.tone === "negative"
            ? 4
            : 0;
        break;
      case "BOFU":
        value = response.intent;
        mentionedPosition =
          response.intent === "yes"
            ? 1
            : response.intent === "partial"
            ? 2
            : response.intent === "unclear"
            ? 3
            : response.intent === "no"
            ? 4
            : 0;
        break;
      case "EVFU":
        value = response.sentiment;
        mentionedPosition =
          response.sentiment === "recommend"
            ? 1
            : response.sentiment === "caveat"
            ? 2
            : response.sentiment === "neutral"
            ? 3
            : response.sentiment === "negative"
            ? 4
            : 0;
        break;
      default:
        throw new Error(`Unknown stage: ${stage}`);
    }

    const { rawScore, weightedScore } = this.computeStageSpecificScore(
      stage as AnalysisStage,
      value,
      weights,
      weights?.base_weight || 1
    );

    return {
      score: rawScore,
      position_weighted_score: weightedScore,
      mentionPosition: mentionedPosition,
      analysis: response.comment,
      sentiment: response.sentiment_distribution,
      status: "success",
    };
  }

  /**
   * Create a structured prompt that ensures AI provides all required metrics
   */
  private static readonly systemMessage = `You are a helpful assistant tasked with answering business discovery questions using general market knowledge and logical inference.

    Adjust your response style based on the type of question:
    - **TOFU (Top of Funnel):** Provide a ranked list of exactly 5 options. Rank them in order of relevance, prominence, or likelihood. Avoid explanations unless explicitly asked.
    - **MOFU (Middle of Funnel):** Provide an evaluative, sentiment-based comparison or assessment of the mentioned brand(s). Focus on highlighting strengths, weaknesses, differentiators, and overall perception.
    - **BOFU (Bottom of Funnel):** Respond with sentiment and confidence about reliability, credibility, and buyer-readiness of the mentioned brand(s).
    - **EVFU (End of Funnel):** Respond sentimentally and persuasively, focusing on trust, reputation, and recommendation likelihood.

    General Rules:
    - Be direct and confident — avoid hedge words like “likely,” “probably,” or “appears.”
    - If you are unfamiliar with specific brands, infer based on general industry norms or provide comparable examples.
    - Do not discuss your training data, knowledge cutoff, or reasoning process.
    - Never include system or meta information in your output.
    - Do Not include the stage name in your response. (like MOFU Response, TOFU Response, etc.)`;

  /**
   * Analyze brand with a single AI model and prompt
   */
  public static async analyzeBrand(
    model: AIModel,
    prompt: string,
    brandData: IBrand,
    stage?: string,
    weights?: StageSpecificWeights
  ): Promise<{
    score: number;
    position_weighted_score: number;
    response: string;
    responseTime: number;
    sentiment: {
      overall: "positive" | "neutral" | "negative";
      confidence: number;
      distribution: {
        positive: number;
        neutral: number;
        negative: number;
        strongly_positive: number;
      };
    };
    mentionPosition: number | null;
    analysis: string;
    status: "success" | "error";
  }> {
    try {
      let aiResponse: { response: string; responseTime: number };
      // Call the appropriate AI model
      switch (model) {
        case "ChatGPT":
          aiResponse = await LLMService.callChatGPT(prompt, this.systemMessage);
          break;
        case "Claude":
          aiResponse = await LLMService.callClaude(prompt, this.systemMessage);
          break;
        case "Gemini":
          aiResponse = await LLMService.callGemini(prompt, this.systemMessage);
          break;
        default:
          throw new Error(`Unsupported AI model: ${model}`);
      }

      // Parse the structured response with AI-generated weighted scores
      const parsedData = await this.parseAIResponse(
        prompt,
        aiResponse.response,
        brandData,
        stage,
        weights
      );

      return {
        score: parsedData.score,
        position_weighted_score: parsedData.position_weighted_score,
        response: aiResponse.response,
        responseTime: aiResponse.responseTime,
        sentiment: parsedData.sentiment,
        mentionPosition: parsedData.mentionPosition,
        analysis: parsedData.analysis,
        status: "success",
      };
    } catch (error) {
      console.error(`AI Analysis Error for ${model}:`, error);
      return {
        score: 0,
        position_weighted_score: 0,
        response: `Analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        responseTime: 0,
        sentiment: {
          overall: "negative",
          confidence: 0,
          distribution: {
            positive: 0,
            neutral: 0,
            negative: 0,
            strongly_positive: 0,
          },
        },
        mentionPosition: 0,
        analysis: "Analysis failed due to API error",
        status: "error",
      };
    }
  }

  /**
   * Multi-prompt analysis for a single model and stage
   */
  public static async analyzeWithMultiplePrompts(
    brandData: any,
    model: AIModel,
    stage: AnalysisStage
  ): Promise<AIAnalysisResults> {
    try {
      // Get prompts for the specific stage
      const stagePrompts = await PromptService.getPromptsByStage(stage);

      if (stagePrompts.length === 0) {
        throw new Error(`No prompts found for stage: ${stage}`);
      }

      const promptResults = [];
      let totalResponseTime = 0;
      let successfulPrompts = 0;
      let totalWeightedScore = 0;
      let totalWeightSum = 0;

      // Aggregate sentiment data
      const sentimentScores = {
        positive: 0,
        neutral: 0,
        negative: 0,
        strongly_positive: 0,
      };

      for (const prompt of stagePrompts) {
        try {
          // Replace placeholders in prompt
          const processedPromptText = PromptService.replacePromptPlaceholders(
            prompt.prompt_text,
            brandData
          );

          // Analyze with AI model (AI now calculates weighted scores)
          const analysisResult = await this.analyzeBrand(
            model,
            processedPromptText,
            brandData,
            stage,
            prompt.weights
          );

          promptResults.push({
            promptId: prompt.prompt_id,
            promptText: processedPromptText,
            score: analysisResult.score * 100,
            weightedScore: analysisResult.position_weighted_score * 100,
            mentionPosition: analysisResult.mentionPosition,
            response: `Response: \n\n ${analysisResult.response} \n\n Recommendation: ${analysisResult.analysis}`,
            responseTime: analysisResult.responseTime,
            sentiment: analysisResult.sentiment,
            status: analysisResult.status,
          });

          if (analysisResult.status === "success") {
            successfulPrompts++;
            totalWeightedScore += analysisResult.position_weighted_score * 100;
            totalWeightSum += 1;

            // Aggregate sentiment data
            Object.keys(sentimentScores).forEach((key) => {
              sentimentScores[key as keyof typeof sentimentScores] +=
                analysisResult.sentiment.distribution[
                  key as keyof typeof analysisResult.sentiment.distribution
                ];
            });
          }

          totalResponseTime += analysisResult.responseTime;

          // Add delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Error analyzing prompt ${prompt.prompt_id}:`, error);

          promptResults.push({
            promptId: prompt.prompt_id,
            promptText: PromptService.replacePromptPlaceholders(
              prompt.prompt_text,
              brandData
            ),
            score: 0,
            weightedScore: 0,
            mentionPosition: 0,
            response: `Analysis failed: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            responseTime: 0,
            sentiment: {
              overall: "negative" as const,
              confidence: 0,
              distribution: {
                positive: 0,
                neutral: 0,
                negative: 0,
                strongly_positive: 0,
              },
            },
            status: "error" as const,
            stage_specific_classification: "not_mentioned",
          });
        }
      }

      // Calculate overall metrics
      const overallScore =
        successfulPrompts > 0
          ? promptResults
              .filter((r) => r.status === "success")
              .reduce((sum, result) => sum + result.score, 0) /
            successfulPrompts
          : 0;

      // calculate average weighted score
      const weightedScore =
        totalWeightSum > 0 ? totalWeightedScore / totalWeightSum : 0;

      // calculate success rate
      const successRate = (successfulPrompts / stagePrompts.length) * 100;

      // Calculate aggregated sentiment
      const totalSentimentResponses = successfulPrompts;
      const aggregatedSentiment: {
        overall: "positive" | "neutral" | "negative";
        confidence: number;
        distribution: {
          positive: number;
          neutral: number;
          negative: number;
          strongly_positive: number;
        };
      } = {
        overall: "neutral",
        confidence: 0,
        distribution: {
          positive: 0,
          neutral: 0,
          negative: 0,
          strongly_positive: 0,
        },
      };

      if (totalSentimentResponses > 0) {
        // Calculate normalized percentages
        const total = Object.values(sentimentScores).reduce(
          (sum, val) => sum + val,
          0
        );
        if (total > 0) {
          aggregatedSentiment.distribution = {
            positive: Math.round((sentimentScores.positive / total) * 100),
            neutral: Math.round((sentimentScores.neutral / total) * 100),
            negative: Math.round((sentimentScores.negative / total) * 100),
            strongly_positive: Math.round(
              (sentimentScores.strongly_positive / total) * 100
            ),
          };
        }

        // Determine overall sentiment
        if (sentimentScores.positive > sentimentScores.negative) {
          aggregatedSentiment.overall = "positive";
        } else if (sentimentScores.negative > sentimentScores.positive) {
          aggregatedSentiment.overall = "negative";
        }

        // Calculate confidence
        aggregatedSentiment.confidence = Math.round(
          (Math.max(...Object.values(sentimentScores)) /
            totalSentimentResponses) *
            100
        );
      }

      return {
        overallScore,
        weightedScore,
        promptResults,
        aggregatedSentiment,
        totalResponseTime,
        successRate,
      };
    } catch (error) {
      console.error(
        `Multi-prompt analysis error for ${model}-${stage}:`,
        error
      );
      throw error;
    }
  }
}
