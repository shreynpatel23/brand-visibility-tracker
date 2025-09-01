// API-related types and interfaces

// Generic API response structure
export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  error?: string;
}

// Next.js route params for different routes
export interface UserParams {
  userId: string;
}

export interface BrandParams {
  brandId: string;
}

export interface UserBrandParams {
  userId: string;
  brandId: string;
}

// API route parameter types (for Next.js 13+ App Router)
export type RouteParams<T = {}> = Promise<T>;

// Common HTTP status types
export type HttpStatus = 200 | 201 | 400 | 401 | 403 | 404 | 500;

// API error response
export interface ApiErrorResponse {
  message: string;
  status: HttpStatus;
  error?: string;
}

// Fetch utility response types
export interface FetchResponse<T = any> {
  data?: T;
  message?: string;
  error?: string;
}

// Pagination params
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Search params
export interface SearchParams {
  query?: string;
  filters?: Record<string, any>;
}
