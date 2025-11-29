/**
 * @module atproto-sessions
 *
 * Framework-agnostic session management for AT Protocol applications.
 *
 * Provides encrypted session cookies using Iron Session.
 * Works with standard Web Request/Response APIs - no framework dependencies.
 *
 * @example
 * ```typescript
 * import { SessionManager } from "@tijs/atproto-sessions";
 *
 * const sessions = new SessionManager({
 *   cookieSecret: Deno.env.get("COOKIE_SECRET")!,
 *   cookieName: "sid",
 *   sessionTtl: 60 * 60 * 24 * 14, // 14 days
 * });
 *
 * // In a request handler
 * const { data, setCookieHeader, error } = await sessions.getSessionFromRequest(request);
 *
 * if (data) {
 *   // User is authenticated, data.did contains their DID
 *   // Set setCookieHeader on response to refresh session
 * }
 * ```
 */

// Main class
export { SessionManager } from "./src/sessions.ts";

// Types
export type {
  CookieSessionData,
  Logger,
  SessionConfig,
  SessionData,
  SessionErrorInfo,
  SessionErrorType,
  SessionResult,
} from "./src/types.ts";

// Errors
export { ConfigurationError, CookieError, SessionError } from "./src/errors.ts";
