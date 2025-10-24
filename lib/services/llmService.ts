import axios from "axios";

/**
 * LLM Response Interface
 */
export interface LLMResponse {
  response: string;
  responseTime: number;
}

/**
 * LLM Service - Simple API wrappers for ChatGPT, Claude, and Gemini
 */
export class LLMService {
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

  /**
   * Call ChatGPT API with axios
   */
  public static async callChatGPT(
    prompt: string,
    systemMessage: string = "You are a helpful AI assistant."
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!this.API_KEYS.ChatGPT) {
      throw new Error("ChatGPT API key not configured");
    }

    try {
      const response = await axios.post(
        this.AI_ENDPOINTS.ChatGPT,
        {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: prompt },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.API_KEYS.ChatGPT}`,
          },
        }
      );

      const { data } = response;

      return {
        response: data?.choices[0]?.message?.content,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`ChatGPT API error (${status}): ${message}`);
      }
      throw new Error(
        `ChatGPT API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Call Claude API with axios
   */
  public static async callClaude(
    prompt: string,
    systemMessage: string = "You are a helpful AI assistant."
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!this.API_KEYS.Claude) {
      throw new Error("Claude API key not configured");
    }

    try {
      const response = await axios.post(
        this.AI_ENDPOINTS.Claude,
        {
          model: "claude-3-5-sonnet-20240620",
          max_tokens: 1000,
          system: systemMessage,
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            "x-api-key": this.API_KEYS.Claude,
            "anthropic-version": "2023-06-01",
          },
        }
      );

      const { data } = response;

      return {
        response: data?.content[0]?.text,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Claude API error (${status}): ${message}`);
      }
      throw new Error(
        `Claude API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Call Gemini API with axios
   */
  public static async callGemini(
    prompt: string,
    systemMessage: string = "You are a helpful AI assistant."
  ): Promise<LLMResponse> {
    const startTime = Date.now();

    if (!this.API_KEYS.Gemini) {
      throw new Error("Gemini API key not configured");
    }

    const geminiPrompt = `${systemMessage}\n\n${prompt}`;

    try {
      const response = await axios.post(
        this.AI_ENDPOINTS.Gemini,
        {
          contents: [{ parts: [{ text: geminiPrompt }] }],
        },
        {
          headers: {
            "x-goog-api-key": this.API_KEYS.Gemini,
          },
        }
      );

      const { data } = response;

      return {
        response: data?.candidates[0]?.content?.parts[0]?.text,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        throw new Error(`Gemini API error (${status}): ${message}`);
      }
      throw new Error(
        `Gemini API error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}
