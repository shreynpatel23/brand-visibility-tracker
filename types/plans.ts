// Plan and billing related types

// Plan types constants
export const PlanTypes = {
  STARTER: "starter",
  PROFESSIONAL: "professional",
  ENTERPRISE: "enterprise",
} as const;

export type PlanType = (typeof PlanTypes)[keyof typeof PlanTypes];

// Database Plan model interface
export interface IPlan {
  _id: string;
  plan_id: string;
  name: string;
  description: string;
  max_brands?: number;
  ai_models_supported?: number;
  price: number;
  features?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Plan features interface
export interface PlanFeatures {
  maxBrands: number;
  aiModelsSupported: number;
  analytics: boolean;
  teamCollaboration: boolean;
  apiAccess: boolean;
  customIntegrations: boolean;
  prioritySupport: boolean;
}

// User's plan information
export interface UserPlan {
  _id: string;
  plan_id: string;
  plan_name: string;
}
