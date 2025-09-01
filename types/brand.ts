import { Types } from "mongoose";

// Database Brand model
export interface IBrand {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId;
  name: string;
  category?: string;
  region?: string;
  target_audience?: string[];
  competitors?: string[];
  use_case?: string;
  feature_list?: string[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

// Dashboard Brand interface
export interface DashboardBrand {
  id: string;
  name: string;
  category: string;
  region: string;
  scores: {
    TOFU: number;
    MOFU: number;
    BOFU: number;
    EVFU: number;
  };
  sentiment: {
    trend: "up" | "down" | "neutral";
    percentage: number;
    distribution: {
      positive: number;
      neutral: number;
      negative: number;
      stronglyPositive: number;
    };
  };
  metrics: {
    totalPrompts: number;
    avgResponseTime: number;
    successRate: number;
    lastUpdated: string;
  };
  weeklyData: {
    labels: string[];
    scores: number[];
    prompts: number[];
  };
  modelPerformance: {
    ChatGPT: { score: number; prompts: number };
    Claude: { score: number; prompts: number };
    Gemini: { score: number; prompts: number };
  };
}

// Brand analysis stages
export type AnalysisStage = "TOFU" | "MOFU" | "BOFU" | "EVFU";

// Sentiment trends
export type SentimentTrend = "up" | "down" | "neutral";

// AI Models supported
export type AIModel = "ChatGPT" | "Claude" | "Gemini";

// Model performance data
export interface ModelPerformanceData {
  score: number;
  prompts: number;
}

// Matrix data for brand analysis
export interface MatrixData {
  model: string;
  stage: AnalysisStage;
  score: number;
  prompts: number;
  avgResponseTime: number;
  successRate: number;
  trend: SentimentTrend;
  trendPercentage: number;
}

// Log entry for brand monitoring
export interface LogEntry {
  id: string;
  timestamp: string;
  model: string;
  stage: AnalysisStage;
  prompt: string;
  response: string;
  score: number;
  responseTime: number;
  status: "success" | "error" | "warning";
  userId: string;
}
