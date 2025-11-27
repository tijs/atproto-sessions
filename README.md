# @tijs/atproto-sessions

Framework-agnostic session management for AT Protocol applications.

Provides encrypted session cookies and mobile Bearer tokens using Iron Session.
Works with standard Web Request/Response APIs - no framework dependencies.

## Installation

```bash
deno add jsr:@tijs/atproto-sessions
```

## Usage

```typescript
import { SessionManager } from "@tijs/atproto-sessions";

const sessions = new SessionManager({
  cookieSecret: Deno.env.get("COOKIE_SECRET")!, // Min 32 chars
  cookieName: "sid", // Optional, default: "sid"
  sessionTtl: 60 * 60 * 24 * 14, // Optional, default: 7 days
});

// In a request handler - extract session from cookie
const { data, setCookieHeader, error } = await sessions.getSessionFromRequest(
  request,
);

if (data) {
  // User is authenticated
  console.log("User DID:", data.did);

  // Set setCookieHeader on response to refresh session
  response.headers.set("Set-Cookie", setCookieHeader);
}

// Create a new session (e.g., after OAuth callback)
const sessionData = {
  did: "did:plc:abc123",
  createdAt: Date.now(),
  lastAccessed: Date.now(),
};
const setCookie = await sessions.createSession(sessionData);
response.headers.set("Set-Cookie", setCookie);

// Clear session (logout)
response.headers.set("Set-Cookie", sessions.getClearCookieHeader());
```

## Mobile Bearer Tokens

For mobile apps that can't use cookies:

```typescript
// Seal a token for mobile client
const token = await sessions.sealToken({ did: "did:plc:abc123" });

// Validate Bearer token from Authorization header
const result = await sessions.validateBearerToken(`Bearer ${token}`);
if (result.data) {
  console.log("Mobile user DID:", result.data.did);
}

// Refresh a mobile token
const newToken = await sessions.refreshBearerToken(`Bearer ${oldToken}`);
```

## API

### `SessionManager`

#### Constructor Options

| Option         | Type     | Default  | Description                     |
| -------------- | -------- | -------- | ------------------------------- |
| `cookieSecret` | `string` | required | Min 32 chars for Iron Session   |
| `cookieName`   | `string` | `"sid"`  | Cookie name for session storage |
| `sessionTtl`   | `number` | `604800` | Session TTL in seconds (7 days) |
| `logger`       | `Logger` | no-op    | Optional logger for debugging   |

#### Methods

- `getSessionFromRequest(req: Request)` - Extract session from cookie
- `createSession(data: SessionData)` - Create Set-Cookie header
- `getClearCookieHeader()` - Get header to clear session
- `sealToken(data)` - Seal data for Bearer token
- `unsealToken(token)` - Unseal Bearer token
- `validateBearerToken(authHeader)` - Validate Authorization header
- `refreshBearerToken(authHeader)` - Refresh Bearer token

## License

MIT
