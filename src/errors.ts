/**
 * Base error class for session-related errors
 */
export class SessionError extends Error {
  readonly code: string;

  constructor(message: string, code = "SESSION_ERROR") {
    super(message);
    this.name = "SessionError";
    this.code = code;
  }
}

/**
 * Error thrown when session configuration is invalid
 */
export class ConfigurationError extends SessionError {
  constructor(message: string) {
    super(message, "CONFIGURATION_ERROR");
    this.name = "ConfigurationError";
  }
}

/**
 * Error thrown when cookie operations fail
 */
export class CookieError extends SessionError {
  constructor(message: string) {
    super(message, "COOKIE_ERROR");
    this.name = "CookieError";
  }
}
