import fs from "fs/promises";
import path from "path";
import { AnalysisStage } from "@/types/brand";

export interface CustomPrompt {
  prompt_id: string;
  prompt_text: string;
  funnel_stage: AnalysisStage;
  [key: string]: string | number; // for CSV flexibility
}

export interface StageSpecificWeights {
  base_weight: number;
  // TOFU
  position_weights?: Record<string, number>;
  // MOFU
  mofu_scale?: Record<string, number>;
  // BOFU
  bofu_scale?: Record<string, number>;
  // EVFU
  evfu_scale?: Record<string, number>;
}

export interface ProcessedPrompt {
  prompt_id: string;
  prompt_text: string;
  funnel_stage: AnalysisStage;
  weights: StageSpecificWeights;
}

export class PromptService {
  private static prompts: ProcessedPrompt[] = [];
  private static isInitialized = false;

  private static buildStageSpecificWeights(
    row: Record<string, string>,
    stage: AnalysisStage,
    base_weight: number
  ): StageSpecificWeights {
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

  // Parse CSV line handling potential commas in quoted text
  private static parseCSVLine(line: string): string[] {
    const result = [];
    let current = "";
    let inQuotes = false;

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

  // Load and parse CSV file
  public static async loadPrompts(): Promise<ProcessedPrompt[]> {
    if (this.isInitialized && this.prompts.length > 0) return this.prompts;

    try {
      const csvFilePath = path.join(
        process.cwd(),
        "mvp_prompts_with_funnel_scoring.csv"
      );
      const csvContent = await fs.readFile(csvFilePath, "utf-8");
      const lines = csvContent.trim().split("\n");

      const headers = lines[0].split(",").map((h) => h.trim());
      const prompts: ProcessedPrompt[] = [];

      for (const line of lines.slice(1)) {
        const values = this.parseCSVLine(line);
        const row: Record<string, string> = {};
        headers.forEach((header, i) => {
          row[header] = values[i];
        });

        const stage = row["funnel_stage"] as AnalysisStage;

        const base_weight = parseFloat(row["base_weight"]) || 1;
        const weights = this.buildStageSpecificWeights(row, stage, base_weight);

        prompts.push({
          prompt_id: row["prompt_id"],
          prompt_text: row["prompt_text"],
          funnel_stage: stage,
          weights,
        });
      }

      this.prompts = prompts.filter((p) => p.prompt_id && p.prompt_text);
      this.isInitialized = true;
      return this.prompts;
    } catch (error) {
      console.error("Error loading prompts from CSV:", error);
      throw new Error("Failed to load prompts");
    }
  }

  // Get prompts by funnel stage
  public static async getPromptsByStage(
    stage: AnalysisStage
  ): Promise<ProcessedPrompt[]> {
    const allPrompts = await this.loadPrompts();
    return allPrompts.filter((prompt) => prompt.funnel_stage === stage);
  }

  // Replace placeholders with brand data
  public static replacePromptPlaceholders(promptText: string, brandData: any) {
    let text = promptText;
    const placeholders = {
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

    for (const [key, val] of Object.entries(placeholders)) {
      const regex = new RegExp(key.replace(/[{}]/g, "\\$&"), "g");
      text = text.replace(regex, val);
    }

    return text;
  }
}
