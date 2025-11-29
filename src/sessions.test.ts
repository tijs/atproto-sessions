import { assertEquals, assertExists } from "@std/assert";
import { SessionManager } from "./sessions.ts";
import { ConfigurationError } from "./errors.ts";
import type { CookieSessionData } from "./types.ts";

const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long";
const TEST_DID = "did:plc:test123";

Deno.test("SessionManager - constructor validates config", async (t) => {
  await t.step("throws if cookieSecret is missing", () => {
    try {
      new SessionManager({ cookieSecret: "" });
      throw new Error("Should have thrown");
    } catch (e) {
      assertEquals(e instanceof ConfigurationError, true);
      assertEquals(
        (e as ConfigurationError).message,
        "cookieSecret is required",
      );
    }
  });

  await t.step("throws if cookieSecret is too short", () => {
    try {
      new SessionManager({ cookieSecret: "short" });
      throw new Error("Should have thrown");
    } catch (e) {
      assertEquals(e instanceof ConfigurationError, true);
      assertEquals(
        (e as ConfigurationError).message.includes("at least 32 characters"),
        true,
      );
    }
  });

  await t.step("accepts valid config", () => {
    const manager = new SessionManager({ cookieSecret: TEST_SECRET });
    assertExists(manager);
  });

  await t.step("accepts custom options", () => {
    const manager = new SessionManager({
      cookieSecret: TEST_SECRET,
      cookieName: "custom",
      sessionTtl: 3600,
      logger: console,
    });
    assertExists(manager);
  });
});

Deno.test("SessionManager - createSession", async (t) => {
  const manager = new SessionManager({ cookieSecret: TEST_SECRET });

  await t.step("creates valid Set-Cookie header", async () => {
    const sessionData: CookieSessionData = {
      did: TEST_DID,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };

    const header = await manager.createSession(sessionData);

    assertEquals(header.startsWith("sid="), true);
    assertEquals(header.includes("Path=/"), true);
    assertEquals(header.includes("HttpOnly"), true);
    assertEquals(header.includes("SameSite=Lax"), true);
    assertEquals(header.includes("Secure"), true);
    assertEquals(header.includes("Max-Age="), true);
  });

  await t.step("uses custom cookie name", async () => {
    const customManager = new SessionManager({
      cookieSecret: TEST_SECRET,
      cookieName: "custom_session",
    });

    const sessionData: CookieSessionData = {
      did: TEST_DID,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };

    const header = await customManager.createSession(sessionData);
    assertEquals(header.startsWith("custom_session="), true);
  });
});

Deno.test("SessionManager - getClearCookieHeader", async (t) => {
  await t.step("returns header that clears cookie", () => {
    const manager = new SessionManager({ cookieSecret: TEST_SECRET });
    const header = manager.getClearCookieHeader();

    assertEquals(header.startsWith("sid=;"), true);
    assertEquals(header.includes("Max-Age=0"), true);
  });

  await t.step("uses custom cookie name", () => {
    const manager = new SessionManager({
      cookieSecret: TEST_SECRET,
      cookieName: "my_session",
    });
    const header = manager.getClearCookieHeader();

    assertEquals(header.startsWith("my_session=;"), true);
  });
});

Deno.test("SessionManager - getSessionFromRequest", async (t) => {
  const manager = new SessionManager({ cookieSecret: TEST_SECRET });

  await t.step("returns NO_COOKIE error when no cookie present", async () => {
    const req = new Request("http://example.com", {
      headers: {},
    });

    const result = await manager.getSessionFromRequest(req);

    assertEquals(result.data, null);
    assertEquals(result.error?.type, "NO_COOKIE");
  });

  await t.step(
    "returns NO_COOKIE error when wrong cookie present",
    async () => {
      const req = new Request("http://example.com", {
        headers: {
          cookie: "other_cookie=value",
        },
      });

      const result = await manager.getSessionFromRequest(req);

      assertEquals(result.data, null);
      assertEquals(result.error?.type, "NO_COOKIE");
    },
  );

  await t.step("returns INVALID_COOKIE for invalid sealed data", async () => {
    // Note: iron-session's unsealData returns {} for invalid data instead of throwing
    // So we get INVALID_COOKIE (no DID) rather than SESSION_EXPIRED
    const req = new Request("http://example.com", {
      headers: {
        cookie: "sid=invalid_sealed_data",
      },
    });

    const result = await manager.getSessionFromRequest(req);

    assertEquals(result.data, null);
    assertEquals(result.error?.type, "INVALID_COOKIE");
  });

  await t.step("successfully extracts valid session", async () => {
    // First create a valid session cookie
    const sessionData: CookieSessionData = {
      did: TEST_DID,
      createdAt: Date.now() - 1000,
      lastAccessed: Date.now() - 1000,
    };
    const setCookie = await manager.createSession(sessionData);

    // Extract just the cookie value
    const cookieValue = setCookie.split(";")[0];

    const req = new Request("http://example.com", {
      headers: {
        cookie: cookieValue,
      },
    });

    const result = await manager.getSessionFromRequest(req);

    assertExists(result.data);
    assertEquals(result.data.did, TEST_DID);
    assertEquals(result.data.createdAt, sessionData.createdAt);
    // lastAccessed should be updated
    assertEquals(result.data.lastAccessed > sessionData.lastAccessed, true);
    // Should return refreshed Set-Cookie header
    assertExists(result.setCookieHeader);
    assertEquals(result.error, undefined);
  });

  await t.step("handles multiple cookies correctly", async () => {
    const sessionData: CookieSessionData = {
      did: TEST_DID,
      createdAt: Date.now(),
      lastAccessed: Date.now(),
    };
    const setCookie = await manager.createSession(sessionData);
    const cookieValue = setCookie.split(";")[0];

    const req = new Request("http://example.com", {
      headers: {
        cookie: `other=value; ${cookieValue}; another=test`,
      },
    });

    const result = await manager.getSessionFromRequest(req);

    assertExists(result.data);
    assertEquals(result.data.did, TEST_DID);
  });
});
