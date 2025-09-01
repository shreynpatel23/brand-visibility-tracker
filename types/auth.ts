// Authentication & User related types
export interface IUser {
  _id: string;
  full_name: string;
  email: string;
  password?: string;
  is_verified: boolean;
  verify_token?: string;
  verify_token_expire?: Date;
  current_onboarding_step?: string | null;
  number_of_retries?: number;
  reset_password_token?: string;
  reset_password_expire?: Date;
  plan_id: {
    _id: string;
    plan_id: string;
    plan_name: string;
  };
}

// Authentication API responses
export interface LoginResponse {
  message: string;
  data: {
    user: IUser & { token: string };
    brands: BrandSummary[];
  };
}

export interface BrandSummary {
  _id: string;
  name?: string;
  category?: string;
  region?: string;
  target_audience?: string[];
  competitors?: string[];
  use_case?: string;
  feature_list?: string[];
  role?: "owner" | "admin" | "viewer";
}

// JWT Token payload
export interface TokenPayload {
  user: IUser;
  iat?: number;
  exp?: number;
}
