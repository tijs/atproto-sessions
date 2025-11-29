# Changelog

All notable changes to this project will be documented in this file.

## [2.1.0] - 2025-11-29

### Added

- **Restored `sealToken()` method**: This method is needed for mobile OAuth
  flows where the app opens a WebView for authentication. After OAuth completes,
  the callback redirects to the app's URL scheme with a sealed token that the
  app can use as a session cookie.

Note: This does NOT restore `unsealToken()`, `validateBearerToken()`, or
`refreshBearerToken()` as those are genuinely unused - mobile apps use
cookie-based auth for API calls.

## [2.0.0] - 2025-11-29

### Breaking Changes

- **Removed mobile Bearer token support**: The following methods have been
  removed as they were unused (the Anchor iOS app uses cookie-based auth):
  - `sealToken()` - Created sealed tokens for mobile Bearer auth
  - `unsealToken()` - Decoded sealed tokens
  - `validateBearerToken()` - Validated Authorization headers
  - `refreshBearerToken()` - Refreshed Bearer tokens
- **Removed `MobileTokenData` type**: No longer exported
- **Removed `INVALID_TOKEN` from `SessionErrorType`**: Only cookie-related
  errors remain

The library now focuses solely on cookie-based session management for web
applications. Mobile apps should use app-specific endpoints for their OAuth
flow.

## [1.0.1] - 2025-11-28

### Fixed

- **Mobile token cookie compatibility**: `sealToken` now produces tokens that
  are compatible with cookie-based session validation. Mobile tokens now include
  `createdAt` and `lastAccessed` fields and use TTL, matching the cookie format.
- **Defensive session extraction**: `getSessionFromRequest` now handles missing
  `createdAt` field gracefully, providing a default value for backward
  compatibility with older mobile tokens.

## [1.0.0] - 2025-11-28

### Breaking Changes

- **Logger interface**: Changed from 3 methods (`log`, `warn`, `error`) to 4
  methods (`debug`, `info`, `warn`, `error`) for compatibility with
  oauth-client-deno
- **SessionData renamed**: `SessionData` is now `CookieSessionData` to avoid
  naming collision with oauth-client-deno's `SessionData` (which represents full
  OAuth session state). The old name is available as a deprecated type alias.

### Migration Guide

**Logger interface:**

```typescript
// Before
const logger = {
  log: console.log,
  warn: console.warn,
  error: console.error,
};

// After
const logger = {
  debug: console.debug,
  info: console.info,
  warn: console.warn,
  error: console.error,
};
```

**SessionData type:**

```typescript
// Before
import type { SessionData } from "@tijs/atproto-sessions";

// After
import type { CookieSessionData } from "@tijs/atproto-sessions";
```

## [0.1.1] - 2025-11-27

### Fixed

- Fixed formatting issues that caused CI publish to fail

## [0.1.0] - 2025-11-27

### Added

- Initial release
- `SessionManager` class for framework-agnostic session management
- Cookie session extraction from HTTP requests
- Cookie session creation with Set-Cookie header generation
- Session refresh with updated `lastAccessed` timestamp
- Mobile Bearer token seal/unseal support
- Bearer token validation from Authorization headers
- Configurable cookie name, TTL, and logging
- Full test coverage
