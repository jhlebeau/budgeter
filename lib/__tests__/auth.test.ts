import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SignJWT } from "jose";
import { signSession, verifySession } from "../auth";

const TEST_SECRET = "test-secret-for-auth-unit-tests-32chars";

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

afterAll(() => {
  delete process.env.JWT_SECRET;
});

// ── signSession / verifySession round-trip ────────────────────────────────────

describe("signSession + verifySession round-trip", () => {
  it("returns the correct userId and username", async () => {
    const token = await signSession("user-123", "alice");
    const session = await verifySession(token);
    expect(session).not.toBeNull();
    expect(session!.userId).toBe("user-123");
    expect(session!.username).toBe("alice");
  });

  it("produces a non-empty JWT string", async () => {
    const token = await signSession("user-1", "bob");
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // header.payload.signature
  });
});

// ── verifySession — invalid inputs ────────────────────────────────────────────

describe("verifySession — invalid inputs", () => {
  it("returns null for a completely invalid token string", async () => {
    const result = await verifySession("not-a-jwt");
    expect(result).toBeNull();
  });

  it("returns null for an empty string", async () => {
    const result = await verifySession("");
    expect(result).toBeNull();
  });

  it("returns null for a token signed with a different secret", async () => {
    const otherSecret = new TextEncoder().encode("a-completely-different-secret!!");
    const token = await new SignJWT({ username: "eve" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-evil")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(otherSecret);

    const result = await verifySession(token);
    expect(result).toBeNull();
  });

  it("returns null for an expired token", async () => {
    const secret = new TextEncoder().encode(TEST_SECRET);
    const token = await new SignJWT({ username: "alice" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-123")
      .setIssuedAt(new Date(Date.now() - 10_000))
      .setExpirationTime(new Date(Date.now() - 5_000))
      .sign(secret);

    const result = await verifySession(token);
    expect(result).toBeNull();
  });

  it("returns null for a token missing the username claim", async () => {
    const secret = new TextEncoder().encode(TEST_SECRET);
    // Sign without the username payload field
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user-123")
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    const result = await verifySession(token);
    expect(result).toBeNull();
  });

  it("returns null for a token missing the sub claim", async () => {
    const secret = new TextEncoder().encode(TEST_SECRET);
    const token = await new SignJWT({ username: "alice" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(secret);

    const result = await verifySession(token);
    expect(result).toBeNull();
  });
});

// ── signSession — missing JWT_SECRET ─────────────────────────────────────────

describe("signSession — missing JWT_SECRET", () => {
  it("throws when JWT_SECRET is not set", async () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    try {
      await expect(signSession("user-1", "alice")).rejects.toThrow(/JWT_SECRET/);
    } finally {
      process.env.JWT_SECRET = saved;
    }
  });
});
