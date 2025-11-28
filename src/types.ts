/**
 * Logger interface for custom logging implementations.
 * Compatible with oauth-client-deno's Logger interface.
 */
export interface Logger {
  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

/**
 * Configuration for SessionManager
 */
export interface SessionConfig {
  /**
   * Secret for Iron Session cookie encryption.
   * Must be at least 32 characters for secure encryption.
   */
  cookieSecret: string;

  /**
   * Cookie name for session storage.
   * @default "sid"
   */
  cookieName?: string;

  /**
   * Session TTL (time-to-live) in seconds.
   * Controls how long sessions remain valid.
   * @default 604800 (7 days)
   */
  sessionTtl?: number;

  /**
   * Optional logger for debugging and monitoring.
   * Defaults to a no-op logger.
   */
  logger?: Logger;
}

/**
 * Session data stored in the encrypted cookie.
 * Contains user identity and timing information.
 *
 * Named CookieSessionData to avoid collision with oauth-client-deno's
 * SessionData which represents full OAuth session state.
 */
export interface CookieSessionData {
  /** User's DID (Decentralized Identifier) */
  did: string;

  /** Timestamp when session was created */
  createdAt: number;

  /** Timestamp of last access (for session refresh) */
  lastAccessed: number;
}

/**
 * @deprecated Use CookieSessionData instead. Will be removed in 1.0.
 */
export type SessionData = CookieSessionData;

/**
 * Error types for session operations
 */
export type SessionErrorType =
  | "NO_COOKIE"
  | "INVALID_COOKIE"
  | "SESSION_EXPIRED"
  | "INVALID_TOKEN"
  | "UNKNOWN";

/**
 * Error information from session operations
 */
export interface SessionErrorInfo {
  /** Type of error for programmatic handling */
  type: SessionErrorType;

  /** Human-readable error message */
  message: string;

  /** Additional error details (e.g., original error) */
  details?: unknown;
}

/**
 * Result from session operations.
 * Contains either data or error information.
 */
export interface SessionResult<T = unknown> {
  /** Session data, or null if not found/invalid */
  data: T | null;

  /** Set-Cookie header for session refresh (when data is valid) */
  setCookieHeader?: string;

  /** Error information if session retrieval failed */
  error?: SessionErrorInfo;
}

/**
 * Mobile token data - minimal payload sealed in Bearer tokens
 */
export interface MobileTokenData {
  /** User's DID */
  did: string;
}
