import { AIModel, AnalysisStage } from "@/types/brand";
import { PromptService } from "./promptService";

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

  // Stage-specific classification scoring system
  private static readonly STAGE_CLASSIFICATIONS = {
    TOFU: {
      mentioned: {
        1: 100,
        2: 75,
        3: 50,
        4: 25,
        5: 10,
      },
      not_mentioned: 0,
    },
    MOFU: {
      mofu_positive: 100,
      mofu_conditional: 75,
      mofu_neutral: 50,
      mofu_negative: 25,
      mofu_absent: 0,
    },
    BOFU: {
      bofu_yes: 100,
      bofu_partial: 75,
      bofu_unclear: 50,
      bofu_no: 25,
      bofu_absent: 0,
    },
    EVFU: {
      evfu_recommend: 100,
      evfu_caveat: 75,
      evfu_neutral: 50,
      evfu_negative: 25,
      evfu_absent: 0,
    },
  } as const;

  /**
   * Calculate score based on stage and classification
   */
  private static calculateScore(
    stage: string,
    classification: string,
    mentionPosition?: number
  ): number {
    const stageKey = stage as keyof typeof this.STAGE_CLASSIFICATIONS;

    if (!this.STAGE_CLASSIFICATIONS[stageKey]) {
      return 0;
    }

    // Special handling for TOFU stage - position-based scoring
    if (stage === "TOFU") {
      const tofuClassifications = this.STAGE_CLASSIFICATIONS.TOFU;
      if (
        classification === "mentioned" &&
        mentionPosition &&
        mentionPosition >= 1 &&
        mentionPosition <= 5
      ) {
        return tofuClassifications.mentioned[
          mentionPosition as keyof typeof tofuClassifications.mentioned
        ];
      }
      if (classification === "not_mentioned") {
        return tofuClassifications.not_mentioned;
      }
      return 0;
    }

    // For other stages, use direct classification mapping
    const stageClassifications = this.STAGE_CLASSIFICATIONS[stageKey];
    const classificationKey =
      classification as keyof typeof stageClassifications;
    return (stageClassifications as any)[classificationKey] || 0;
  }

  /**
   * Get stage-specific analysis instructions
   */
  private static getStageSpecificInstructions(stage: string): string {
    switch (stage) {
      case "TOFU":
        return `Focus on *brand awareness*, *visibility*, and *recognition*. Determine the brand's position when mentioned in lists or discussions. Position matters significantly for scoring.`;
      case "MOFU":
        return `Focus on *brand consideration* and *evaluation versus competitors*. Assess how the brand is perceived in comparison contexts and shortlist discussions.`;
      case "BOFU":
        return `Focus on *purchase intent* and *decision factors*. Determine if the brand is chosen, recommended, or rejected based on trust, pricing, or quality factors.`;
      case "EVFU":
        return `Focus on *post-purchase experience*, *loyalty*, and *advocacy potential*. Assess satisfaction levels, repeat usage indicators, and recommendation likelihood.`;
      default:
        return `Analyze general brand perception and positioning in the response.`;
    }
  }

  /**
   * Get classification guidelines for each stage
   */
  private static getClassificationGuidelines(stage: string): string {
    switch (stage) {
      case "TOFU":
        return `
    ### Classification Guidelines - TOFU (Brand Awareness)
    - "mentioned" → brand is mentioned in the response (position determines score: 1st=100, 2nd=75, 3rd=50, 4th=25, 5th=10)
    - "not_mentioned" → brand is not mentioned at all (score=0)`;
      case "MOFU":
        return `
    ### Classification Guidelines - MOFU (Consideration)
    - "mofu_positive" → strong brand consideration, compared favorably vs competitors (score=100)
    - "mofu_conditional" → considered under some conditions or with caveats (score=75)
    - "mofu_neutral" → neutral perception, mentioned without strong preference (score=50)
    - "mofu_negative" → unfavorable perception or weak consideration (score=25)
    - "mofu_absent" → not mentioned in consideration context (score=0)`;
      case "BOFU":
        return `
    ### Classification Guidelines - BOFU (Purchase Intent)
    - "bofu_yes" → clear purchase intent or strong preference indicated (score=100)
    - "bofu_partial" → some indicators of interest or partial preference (score=75)
    - "bofu_unclear" → uncertain or ambiguous purchase signals (score=50)
    - "bofu_no" → unlikely to purchase or rejected (score=25)
    - "bofu_absent" → not mentioned in purchase context (score=0)`;
      case "EVFU":
        return `
    ### Classification Guidelines - EVFU (Post-Purchase/Advocacy)
    - "evfu_recommend" → strong advocacy, positive experience, clear recommendation (score=100)
    - "evfu_caveat" → recommends with caveats or mentions minor issues (score=75)
    - "evfu_neutral" → mixed or indifferent post-purchase sentiment (score=50)
    - "evfu_negative" → poor experience or dissatisfaction expressed (score=25)
    - "evfu_absent" → not mentioned in post-purchase context (score=0)`;
      default:
        return `
    ### Classification Guidelines - General
    - Classify based on overall brand perception in the response`;
    }
  }

  /**
   * Create a structured prompt that ensures AI provides all required metrics
   */
  private static readonly systemMessage =
    "You are a helpful assistant tasked with answering business discovery questions using general market knowledge and inference.\nWhen possible, respond in the form of a ranked list of exactly 5 options.\nRank them in order of relevance, prominence, or likelihood.\nIf you are unfamiliar with any specific brands, provide comparable examples or general best practices.\nAvoid discussing your training data or knowledge cutoff unless specifically asked.\nDo not explain the ranking unless explicitly instructed.\nAvoid using hedge words like 'likely', 'probably', 'seems', 'appears' - be direct and confident in your assessments.";

  /**
   * Parse AI response to extract structured data with proper stage-specific scoring
   */
  private static async parseAIResponse(
    data: string,
    brandName: string,
    stage?: string
  ): Promise<any> {
    const stageInstructions = this.getStageSpecificInstructions(
      stage || "Unknown"
    );

    const analysisPrompt = `
    You are an expert marketing analyst trained to evaluate brand performance across different stages of the marketing funnel.
    
    Your task is to analyze the following AI-generated response and assess how the brand "${brandName}" is mentioned, perceived, and positioned.
    
    ### Context
    Analysis Stage: ${stage || "Unknown"}
    ${stageInstructions}
    
    ### Response to Analyze
    "${data}"
    
    ### Output Format
    Return a **strict JSON** object:
    {
      "sentiment": {
        "distribution": {
          "positive": number,
          "neutral": number,
          "negative": number,
          "strongly_positive": number
        },
        "overall": "positive" | "neutral" | "negative",
        "confidence": number  // 0–100
      },
      "mentionPosition": number,  // Position of brand mention (1–5), or 0 if absent
      "stage_specific_classification": string,  // Use the appropriate label from guidelines below
      "analysis": string  // Detailed analysis including performance summary and recommendations
    }
    
    ${this.getClassificationGuidelines(stage || "Unknown")}
    
    ### Rules
    - If the brand is **not mentioned**, set mentionPosition = 0 and use appropriate "absent/not_mentioned" classification
    - Always include reasoning in **analysis** describing why the classification and sentiment were chosen
    - Avoid adding any explanatory text outside the JSON
    `;

    try {
      const response = await fetch(this.AI_ENDPOINTS.ChatGPT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.API_KEYS.ChatGPT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: analysisPrompt }],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `ChatGPT API error: ${response.status} ${response.statusText}`
        );
      }

      const res = await response.json();
      const parsedData = JSON.parse(res.choices[0].message.content);

      // Calculate score based on stage and classification
      const calculatedScore = this.calculateScore(
        stage || "Unknown",
        parsedData.stage_specific_classification || "not_mentioned",
        parsedData.mentionPosition
      );

      return {
        score: calculatedScore,
        position_weighted_score: calculatedScore,
        sentiment: {
          distribution: {
            positive: parsedData.sentiment?.distribution?.positive || 0,
            neutral: parsedData.sentiment?.distribution?.neutral || 0,
            negative: parsedData.sentiment?.distribution?.negative || 0,
            strongly_positive:
              parsedData.sentiment?.distribution?.strongly_positive || 0,
          },
          overall: parsedData.sentiment?.overall || "neutral",
          confidence: parsedData.sentiment?.confidence || 0,
        },
        mentionPosition: parsedData.mentionPosition || 0,
        stage_specific_classification:
          parsedData.stage_specific_classification || "not_mentioned",
        analysis:
          `AI Response: ${data}\n\nAnalysis: ${parsedData.analysis}` ||
          "No analysis provided",
      };
    } catch (error) {
      throw new Error(
        `ChatGPT API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Call ChatGPT API
   */
  private static async callChatGPT(prompt: string): Promise<{
    response: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    if (!this.API_KEYS.ChatGPT) {
      throw new Error("ChatGPT API key not configured");
    }

    try {
      const response = await fetch(this.AI_ENDPOINTS.ChatGPT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.API_KEYS.ChatGPT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: this.systemMessage },
            { role: "user", content: prompt },
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `ChatGPT API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        response: data.choices[0].message.content,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(
        `ChatGPT API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Call Claude API
   */
  private static async callClaude(prompt: string): Promise<{
    response: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    if (!this.API_KEYS.Claude) {
      throw new Error("Claude API key not configured");
    }

    try {
      const response = await fetch(this.AI_ENDPOINTS.Claude, {
        method: "POST",
        headers: {
          "x-api-key": this.API_KEYS.Claude,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 1000,
          system: this.systemMessage,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Claude API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        response: data.content[0].text,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(
        `Claude API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Call Gemini API
   */
  private static async callGemini(prompt: string): Promise<{
    response: string;
    responseTime: number;
  }> {
    const startTime = Date.now();

    if (!this.API_KEYS.Gemini) {
      throw new Error("Gemini API key not configured");
    }

    const geminiPrompt = `${this.systemMessage}
    ${prompt}`;

    try {
      const response = await fetch(this.AI_ENDPOINTS.Gemini, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.API_KEYS.Gemini,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      return {
        response: data.candidates[0].content.parts[0].text,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(
        `Gemini API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Analyze brand with a single AI model and prompt
   */
  public static async analyzeBrand(
    model: AIModel,
    prompt: string,
    brandName: string,
    stage?: string
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
    mentionPosition: number;
    stage_specific_classification: string;
    analysis: string;
    status: "success" | "error";
  }> {
    try {
      let aiResponse: { response: string; responseTime: number };

      // Call the appropriate AI model
      switch (model) {
        case "ChatGPT":
          aiResponse = await this.callChatGPT(prompt);
          break;
        case "Claude":
          aiResponse = await this.callClaude(prompt);
          break;
        case "Gemini":
          aiResponse = await this.callGemini(prompt);
          break;
        default:
          throw new Error(`Unsupported AI model: ${model}`);
      }

      // Parse the structured response with AI-generated weighted scores
      const parsedData = await this.parseAIResponse(
        aiResponse.response,
        brandName,
        stage
      );

      return {
        score: parsedData.score,
        position_weighted_score: parsedData.position_weighted_score,
        response: aiResponse.response,
        responseTime: aiResponse.responseTime,
        sentiment: parsedData.sentiment,
        mentionPosition: parsedData.mentionPosition,
        stage_specific_classification: parsedData.stage_specific_classification,
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
        stage_specific_classification: "not_mentioned",
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
  ): Promise<{
    overallScore: number;
    weightedScore: number;
    promptResults: Array<{
      promptId: string;
      promptText: string;
      score: number;
      weightedScore: number;
      mentionPosition: number;
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
      status: "success" | "error";
    }>;
    aggregatedSentiment: {
      overall: "positive" | "neutral" | "negative";
      confidence: number;
      distribution: {
        positive: number;
        neutral: number;
        negative: number;
        strongly_positive: number;
      };
    };
    totalResponseTime: number;
    successRate: number;
  }> {
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
            brandData.name,
            stage
          );

          promptResults.push({
            promptId: prompt.prompt_id,
            promptText: processedPromptText,
            score: analysisResult.score,
            weightedScore: analysisResult.position_weighted_score,
            mentionPosition: analysisResult.mentionPosition,
            response: analysisResult.analysis,
            responseTime: analysisResult.responseTime,
            sentiment: analysisResult.sentiment,
            status: analysisResult.status,
            stage_specific_classification:
              analysisResult.stage_specific_classification,
          });

          if (analysisResult.status === "success") {
            successfulPrompts++;
            totalWeightedScore += analysisResult.position_weighted_score;
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
