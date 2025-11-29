import { sealData, unsealData } from "iron-session";

import type {
  CookieSessionData,
  Logger,
  SessionConfig,
  SessionResult,
} from "./types.ts";
import { ConfigurationError } from "./errors.ts";

/** Default session TTL: 7 days in seconds */
const DEFAULT_SESSION_TTL = 60 * 60 * 24 * 7;

/** Default cookie name */
const DEFAULT_COOKIE_NAME = "sid";

/** Minimum cookie secret length required by Iron Session */
const MIN_SECRET_LENGTH = 32;

/** No-op logger for production use */
const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/**
 * Framework-agnostic session manager using Iron Session.
 *
 * Handles encrypted session cookies for AT Protocol applications.
 * Works with standard Web Request/Response APIs - no framework dependencies.
 *
 * @example
 * ```typescript
 * const sessions = new SessionManager({
 *   cookieSecret: process.env.COOKIE_SECRET,
 *   cookieName: "sid",
 *   sessionTtl: 60 * 60 * 24 * 14, // 14 days
 * });
 *
 * // Get session from request
 * const { data, setCookieHeader, error } = await sessions.getSessionFromRequest(request);
 *
 * // Create new session
 * const setCookie = await sessions.createSession({
 *   did: "did:plc:abc123",
 *   createdAt: Date.now(),
 *   lastAccessed: Date.now(),
 * });
 * ```
 */
export class SessionManager {
  private readonly cookieSecret: string;
  private readonly cookieName: string;
  private readonly sessionTtl: number;
  private readonly logger: Logger;

  constructor(config: SessionConfig) {
    if (!config.cookieSecret) {
      throw new ConfigurationError("cookieSecret is required");
    }
    if (config.cookieSecret.length < MIN_SECRET_LENGTH) {
      throw new ConfigurationError(
        `cookieSecret must be at least ${MIN_SECRET_LENGTH} characters for secure encryption`,
      );
    }

    this.cookieSecret = config.cookieSecret;
    this.cookieName = config.cookieName ?? DEFAULT_COOKIE_NAME;
    this.sessionTtl = config.sessionTtl ?? DEFAULT_SESSION_TTL;
    this.logger = config.logger ?? noopLogger;
  }

  /**
   * Extract and validate session from a Request's cookies.
   *
   * Returns session data with a refreshed Set-Cookie header.
   * The Set-Cookie header should be set on responses to extend session lifetime.
   *
   * @param req - HTTP Request containing session cookie
   * @returns Session result with data, Set-Cookie header, or error
   */
  async getSessionFromRequest(
    req: Request,
  ): Promise<SessionResult<CookieSessionData>> {
    try {
      const cookieHeader = req.headers.get("cookie");
      if (!cookieHeader?.includes(`${this.cookieName}=`)) {
        this.logger.debug("No session cookie found in request");
        return {
          data: null,
          error: {
            type: "NO_COOKIE",
            message: "No session cookie found in request",
          },
        };
      }

      // Parse cookie - handle '=' characters in sealed value
      const cookies = cookieHeader.split(";").map((c) => c.trim());
      const cookiePrefix = `${this.cookieName}=`;
      const sessionCookie = cookies
        .find((c) => c.startsWith(cookiePrefix))
        ?.substring(cookiePrefix.length);

      if (!sessionCookie) {
        this.logger.debug("Session cookie found but could not be parsed");
        return {
          data: null,
          error: {
            type: "INVALID_COOKIE",
            message: "Session cookie could not be parsed",
          },
        };
      }

      // Unseal session data
      let sessionData: CookieSessionData;
      try {
        sessionData = await unsealData(decodeURIComponent(sessionCookie), {
          password: this.cookieSecret,
        }) as CookieSessionData;
      } catch (unsealError) {
        this.logger.error("Failed to unseal session cookie:", {
          error: unsealError instanceof Error
            ? unsealError.message
            : String(unsealError),
        });
        return {
          data: null,
          error: {
            type: "SESSION_EXPIRED",
            message: "Session cookie is invalid or expired",
            details: unsealError instanceof Error
              ? unsealError.message
              : String(unsealError),
          },
        };
      }

      if (!sessionData?.did) {
        this.logger.error("No DID found in session data:", sessionData);
        return {
          data: null,
          error: {
            type: "INVALID_COOKIE",
            message: "No DID found in session data",
          },
        };
      }

      this.logger.info(
        `Session extracted: DID=${sessionData.did}, created=${
          sessionData.createdAt
            ? new Date(sessionData.createdAt).toISOString()
            : "N/A (mobile token)"
        }`,
      );

      // Create refreshed session with updated lastAccessed
      // Provide defaults for missing fields (backward compatibility with old mobile tokens)
      const now = Date.now();
      const refreshedData: CookieSessionData = {
        did: sessionData.did,
        createdAt: sessionData.createdAt ?? now,
        lastAccessed: now,
      };

      const setCookieHeader = await this.createSession(refreshedData);

      this.logger.info(
        `Session refreshed for DID: ${sessionData.did}, expires in ${
          Math.round(this.sessionTtl / 86400)
        } days`,
      );

      return {
        data: refreshedData,
        setCookieHeader,
      };
    } catch (error) {
      this.logger.error("Failed to get session from request:", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        data: null,
        error: {
          type: "UNKNOWN",
          message: error instanceof Error ? error.message : "Unknown error",
          details: error,
        },
      };
    }
  }

  /**
   * Create a new session and return Set-Cookie header.
   *
   * @param data - Session data to store (did, createdAt, lastAccessed)
   * @returns Set-Cookie header string to set on response
   */
  async createSession(data: CookieSessionData): Promise<string> {
    const sealedSession = await sealData(data, {
      password: this.cookieSecret,
      ttl: this.sessionTtl,
    });

    return `${this.cookieName}=${
      encodeURIComponent(sealedSession)
    }; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${this.sessionTtl}`;
  }

  /**
   * Get Set-Cookie header that clears the session cookie.
   *
   * Use this when logging out or when session is invalid.
   *
   * @returns Set-Cookie header string that clears the session
   */
  getClearCookieHeader(): string {
    return `${this.cookieName}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
  }

  /**
   * Create a sealed token for mobile OAuth callback.
   *
   * Used by mobile apps that complete OAuth in a WebView.
   * The token is passed back to the app via URL scheme redirect.
   * The app can then use this token as a cookie for authenticated requests.
   *
   * @param data - Token data containing the user's DID
   * @returns Sealed token string
   *
   * @example
   * ```typescript
   * const token = await sessions.sealToken({ did: "did:plc:abc123" });
   * // Redirect to: myapp://auth-callback?session_token=<token>&did=...
   * ```
   */
  async sealToken(data: { did: string }): Promise<string> {
    const tokenData: CookieSessionData = {
      did: data.did,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };
    return await sealData(tokenData, {
      password: this.cookieSecret,
      ttl: this.sessionTtl,
    });
  }
}
