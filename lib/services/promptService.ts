import fs from "fs/promises";
import path from "path";
import { AnalysisStage, IBrand } from "@/types/brand";
import {
  StageSpecificWeights,
  ProcessedPrompt,
  BrandPlaceholders,
} from "@/types/services";

/**
 * Prompt Management Service
 *
 * Handles all prompt-related operations for brand analysis:
 * - Loading and parsing prompts from CSV configuration files
 * - Stage-specific weight calculation and management
 * - Brand data placeholder replacement in prompt templates
 * - Prompt filtering and retrieval by marketing funnel stage
 *
 * This service acts as the central repository for analysis prompts,
 * ensuring consistent prompt formatting and proper weight application
 * across all AI models and analysis stages.
 */
export class PromptService {
  /**
   * In-memory cache of processed prompts to avoid repeated file I/O
   */
  private static prompts: ProcessedPrompt[] = [];

  /**
   * Flag to track whether prompts have been loaded from the CSV file
   */
  private static isInitialized = false;

  /**
   * Builds stage-specific weight configurations from CSV row data
   *
   * Each marketing funnel stage has different scoring criteria and weights:
   * - TOFU: Position-based weights (first, second, third, etc.)
   * - MOFU: Tone-based weights (positive, conditional, neutral, etc.)
   * - BOFU: Intent-based weights (yes, partial, unclear, etc.)
   * - EVFU: Sentiment-based weights (recommend, caveat, neutral, etc.)
   *
   * @param row - CSV row data containing weight values
   * @param stage - Marketing funnel stage
   * @param base_weight - Base weight multiplier
   * @returns Structured weight configuration for the stage
   */
  private static buildStageSpecificWeights(
    row: Record<string, string>,
    stage: AnalysisStage,
    base_weight: number
  ): StageSpecificWeights {
    // Helper function to safely parse numeric values from CSV
    const parse = (val: string) => (val ? parseFloat(val) : 0);

    switch (stage) {
      case "TOFU":
        return {
          base_weight,
          position_weights: {
            first: parse(row["weight_first"]),
            second: parse(row["weight_second"]),
            third: parse(row["weight_third"]),
            fourth: parse(row["weight_fourth"]),
            fifth: parse(row["weight_fifth"]),
            absent: parse(row["weight_absent"]),
          },
        };
      case "MOFU":
        return {
          base_weight,
          mofu_scale: {
            positive: parse(row["mofu_positive"]),
            conditional: parse(row["mofu_conditional"]),
            neutral: parse(row["mofu_neutral"]),
            negative: parse(row["mofu_negative"]),
            absent: parse(row["mofu_absent"]),
          },
        };
      case "BOFU":
        return {
          base_weight,
          bofu_scale: {
            yes: parse(row["bofu_yes"]),
            partial: parse(row["bofu_partial"]),
            unclear: parse(row["bofu_unclear"]),
            no: parse(row["bofu_no"]),
            absent: parse(row["bofu_absent"]),
          },
        };
      case "EVFU":
        return {
          base_weight,
          evfu_scale: {
            recommend: parse(row["evfu_recommend"]),
            caveat: parse(row["evfu_caveat"]),
            neutral: parse(row["evfu_neutral"]),
            negative: parse(row["evfu_negative"]),
            absent: parse(row["evfu_absent"]),
          },
        };
      default:
        return { base_weight };
    }
  }

  /**
   * Parses a CSV line while properly handling quoted text containing commas
   *
   * Standard CSV parsing that respects quoted fields, allowing prompts to
   * contain commas without breaking the parsing logic.
   *
   * @param line - Raw CSV line to parse
   * @returns Array of parsed field values
   */
  private static parseCSVLine(line: string): string[] {
    const result = [];
    let current = "";
    let inQuotes = false;

    // Parse character by character, respecting quote boundaries
    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Loads and parses prompts from the CSV configuration file
   *
   * Reads the MVP prompts CSV file containing:
   * - Prompt templates with brand placeholders
   * - Stage-specific weight configurations
   * - Funnel stage assignments
   *
   * Results are cached in memory to avoid repeated file I/O operations.
   *
   * @returns Promise resolving to array of processed prompts
   * @throws Error if CSV file cannot be read or parsed
   */
  public static async loadPrompts(): Promise<ProcessedPrompt[]> {
    // Return cached prompts if already loaded
    if (this.isInitialized && this.prompts.length > 0) return this.prompts;

    try {
      // Read and parse the CSV file from the project root
      const csvFilePath = path.join(
        process.cwd(),
        "mvp_prompts_with_funnel_scoring.csv"
      );
      const csvContent = await fs.readFile(csvFilePath, "utf-8");
      const lines = csvContent.trim().split("\n");

      // Extract headers and initialize prompt collection
      const headers = lines[0].split(",").map((h) => h.trim());
      const prompts: ProcessedPrompt[] = [];

      // Process each data row (skip header)
      for (const line of lines.slice(1)) {
        const values = this.parseCSVLine(line);
        const row: Record<string, string> = {};

        // Map values to headers for easy access
        headers.forEach((header, i) => {
          row[header] = values[i];
        });

        const stage = row["funnel_stage"] as AnalysisStage;

        // Parse weight configuration for this prompt
        const base_weight = parseFloat(row["base_weight"]) || 1;
        const weights = this.buildStageSpecificWeights(row, stage, base_weight);

        prompts.push({
          prompt_id: row["prompt_id"],
          prompt_text: row["prompt_text"],
          funnel_stage: stage,
          weights,
        });
      }

      // Filter out invalid prompts and cache results
      this.prompts = prompts.filter((p) => p.prompt_id && p.prompt_text);
      this.isInitialized = true;
      return this.prompts;
    } catch (error) {
      console.error("Error loading prompts from CSV:", error);
      throw new Error("Failed to load prompts");
    }
  }

  /**
   * Retrieves all prompts for a specific marketing funnel stage
   *
   * Filters the complete prompt collection to return only prompts
   * configured for the specified stage (TOFU, MOFU, BOFU, or EVFU).
   *
   * @param stage - Marketing funnel stage to filter by
   * @returns Promise resolving to array of stage-specific prompts
   */
  public static async getPromptsByStage(
    stage: AnalysisStage
  ): Promise<ProcessedPrompt[]> {
    const allPrompts = await this.loadPrompts();
    return allPrompts.filter((prompt) => prompt.funnel_stage === stage);
  }

  /**
   * Replaces brand-specific placeholders in prompt templates
   *
   * Substitutes template variables with actual brand data:
   * - {brand_name}/{name}: Brand name
   * - {category}: Business category
   * - {region}: Geographic region
   * - {audience}: Target audience
   * - {use_case}: Primary use case
   * - {competitor}: Main competitor
   * - {feature_list}: Key features
   *
   * @param promptText - Template prompt with placeholders
   * @param brandData - Brand information for substitution
   * @returns Processed prompt with placeholders replaced
   */
  public static replacePromptPlaceholders(
    promptText: string,
    brandData: IBrand
  ): string {
    let text = promptText;

    // Define placeholder mappings with fallback values
    const placeholders: BrandPlaceholders = {
      "{brand_name}": brandData.name || "Unknown Brand",
      "{name}": brandData.name || "Unknown Brand",
      "{category}": brandData.category || "business services",
      "{region}": brandData.region || "your region",
      "{audience}": brandData.target_audience?.join(", ") || "businesses",
      "{use_case}": brandData.use_case || "general business needs",
      "{competitor}": brandData.competitors?.[0] || "industry leaders",
      "{feature_list}":
        brandData.feature_list?.slice(0, 2).join(" and ") ||
        "core services and features",
    };

    // Replace each placeholder with its corresponding value
    for (const [key, val] of Object.entries(placeholders)) {
      const regex = new RegExp(key.replace(/[{}]/g, "\\$&"), "g");
      text = text.replace(regex, val);
    }

    return text;
  }
}
