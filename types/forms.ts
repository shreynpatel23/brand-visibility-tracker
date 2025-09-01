// Form data interfaces for various forms across the application

// Onboarding form data
export interface OnboardingFormData {
  _id: string;
  name: string;
  category: string;
  region: string;
  targetAudience?: string[];
  competitors?: string[];
  useCase?: string;
  features?: string[];
  teamMembers?: { email: string; role: string }[];
}

// Create brand form data
export interface CreateBrandFormData {
  _id: string;
  name: string;
  category: string;
  region: string;
  targetAudience?: string[];
  competitors?: string[];
  useCase?: string;
  features?: string[];
}

// Edit brand form data
export interface EditBrandFormData {
  _id: string;
  name: string;
  category?: string;
  region?: string;
  target_audience?: string[];
  competitors?: string[];
  use_case?: string;
  feature_list?: string[];
}

// Login form data
export interface LoginFormData {
  email: string;
  password: string;
  rememberMe?: boolean;
}

// Signup form data
export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  termsAndPrivacy: boolean;
}

// Reset password form data
export interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

// Forgot password form data
export interface ForgotPasswordFormData {
  email: string;
}

// Accept invite form data
export interface AcceptInviteFormData {
  name: string;
  email?: string;
  password: string;
  confirmPassword: string;
  termsAndPrivacy: boolean;
}

// Invite member form data
export interface InviteMemberFormData {
  email: string;
  role: "admin" | "viewer";
}
