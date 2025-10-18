export interface ErrorResponse {
  error: string;
}

export interface SuccessResponse {
  success: true;
}

/**
 * Base shape for endpoints that accept free-form text.
 * Routes supporting this contract trim whitespace and reject empty strings.
 */
export interface TextRequest {
  text: string;
}
