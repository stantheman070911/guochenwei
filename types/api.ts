// Request and response types for internal API routes — RegisterRequest, RegisterResponse, etc.

/** POST /api/register request body. */
export interface RegisterRequest {
  email: string;
  name: string;
}

/**
 * POST /api/register success response.
 * Returns the activation code so the /activate page can display it.
 */
export interface RegisterResponse {
  activationCode: string;
}

/** Standard error shape for all API routes (per CLAUDE.md). */
export interface ApiError {
  error: string;
}
