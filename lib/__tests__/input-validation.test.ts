import { describe, it, expect } from "vitest";
import {
  isValidUsername,
  normalizeUsername,
  parseRequiredText,
  parseOptionalText,
  parseEntryName,
  isValidFiniteNumber,
  isUuidLikeOrLegacyId,
  USERNAME_MAX_LENGTH,
  NAME_MAX_LENGTH,
  CATEGORY_NAME_MAX_LENGTH,
  MAX_MONEY_VALUE,
} from "../input-validation";

// ── normalizeUsername ─────────────────────────────────────────────────────────

describe("normalizeUsername", () => {
  it("lowercases", () => expect(normalizeUsername("Henri")).toBe("henri"));
  it("trims whitespace", () => expect(normalizeUsername("  henri  ")).toBe("henri"));
  it("lowercases and trims", () => expect(normalizeUsername("  HENRI  ")).toBe("henri"));
});

// ── isValidUsername ───────────────────────────────────────────────────────────

describe("isValidUsername", () => {
  it("accepts alphanumeric", () => expect(isValidUsername("henri123")).toBe(true));
  it("accepts all letters", () => expect(isValidUsername("henri")).toBe(true));
  it("accepts all numbers", () => expect(isValidUsername("12345")).toBe(true));
  it("rejects empty string", () => expect(isValidUsername("")).toBe(false));
  it("rejects spaces", () => expect(isValidUsername("henri smith")).toBe(false));
  it("rejects underscores", () => expect(isValidUsername("henri_smith")).toBe(false));
  it("rejects dashes", () => expect(isValidUsername("henri-smith")).toBe(false));
  it("rejects special characters", () => expect(isValidUsername("henri@")).toBe(false));
  it("accepts exactly max length", () => {
    expect(isValidUsername("a".repeat(USERNAME_MAX_LENGTH))).toBe(true);
  });
  it("rejects one over max length", () => {
    expect(isValidUsername("a".repeat(USERNAME_MAX_LENGTH + 1))).toBe(false);
  });
});

// ── parseRequiredText ─────────────────────────────────────────────────────────

describe("parseRequiredText", () => {
  it("returns trimmed string", () => expect(parseRequiredText("  hello  ", 100)).toBe("hello"));
  it("returns null for empty string", () => expect(parseRequiredText("", 100)).toBeNull());
  it("returns null for whitespace-only", () => expect(parseRequiredText("   ", 100)).toBeNull());
  it("returns null for non-string", () => expect(parseRequiredText(42, 100)).toBeNull());
  it("returns null for null", () => expect(parseRequiredText(null, 100)).toBeNull());
  it("accepts exactly max length", () => {
    const s = "a".repeat(NAME_MAX_LENGTH);
    expect(parseRequiredText(s, NAME_MAX_LENGTH)).toBe(s);
  });
  it("rejects one over max length", () => {
    expect(parseRequiredText("a".repeat(NAME_MAX_LENGTH + 1), NAME_MAX_LENGTH)).toBeNull();
  });
  it("rejects control characters", () => {
    expect(parseRequiredText("hello\x00world", 100)).toBeNull();
    expect(parseRequiredText("tab\there", 100)).toBeNull();
    expect(parseRequiredText("newline\nhere", 100)).toBeNull();
  });
  it("rejects DEL character (0x7F)", () => {
    expect(parseRequiredText("hello\x7Fworld", 100)).toBeNull();
  });
});

// ── parseOptionalText ─────────────────────────────────────────────────────────

describe("parseOptionalText", () => {
  it("returns null for undefined", () => expect(parseOptionalText(undefined, 100)).toBeNull());
  it("returns null for null", () => expect(parseOptionalText(null, 100)).toBeNull());
  it("returns empty string for whitespace-only", () => expect(parseOptionalText("   ", 100)).toBe(""));
  it("returns trimmed string", () => expect(parseOptionalText("  hello  ", 100)).toBe("hello"));
  it("returns null for non-string", () => expect(parseOptionalText(42, 100)).toBeNull());
  it("returns null when over max length", () => {
    expect(parseOptionalText("a".repeat(101), 100)).toBeNull();
  });
  it("returns null for control characters", () => {
    expect(parseOptionalText("bad\x01char", 100)).toBeNull();
  });
});

// ── parseEntryName ────────────────────────────────────────────────────────────

describe("parseEntryName", () => {
  it("accepts letters", () => expect(parseEntryName("Groceries", CATEGORY_NAME_MAX_LENGTH)).toBe("Groceries"));
  it("accepts numbers", () => expect(parseEntryName("Category1", CATEGORY_NAME_MAX_LENGTH)).toBe("Category1"));
  it("accepts spaces", () => expect(parseEntryName("Eating Out", CATEGORY_NAME_MAX_LENGTH)).toBe("Eating Out"));
  it("accepts underscores", () => expect(parseEntryName("my_category", CATEGORY_NAME_MAX_LENGTH)).toBe("my_category"));
  it("accepts dashes", () => expect(parseEntryName("my-category", CATEGORY_NAME_MAX_LENGTH)).toBe("my-category"));
  it("trims surrounding whitespace", () => expect(parseEntryName("  Groceries  ", CATEGORY_NAME_MAX_LENGTH)).toBe("Groceries"));
  it("rejects special characters", () => expect(parseEntryName("Food & Drink", CATEGORY_NAME_MAX_LENGTH)).toBeNull());
  it("rejects punctuation", () => expect(parseEntryName("Food!", CATEGORY_NAME_MAX_LENGTH)).toBeNull());
  it("rejects empty string", () => expect(parseEntryName("", CATEGORY_NAME_MAX_LENGTH)).toBeNull());
  it("rejects over max length", () => {
    expect(parseEntryName("a".repeat(CATEGORY_NAME_MAX_LENGTH + 1), CATEGORY_NAME_MAX_LENGTH)).toBeNull();
  });
  it("accepts exactly max length", () => {
    const s = "a".repeat(CATEGORY_NAME_MAX_LENGTH);
    expect(parseEntryName(s, CATEGORY_NAME_MAX_LENGTH)).toBe(s);
  });
  it("rejects unicode letters outside ASCII", () => expect(parseEntryName("café", CATEGORY_NAME_MAX_LENGTH)).toBeNull());
});

// ── isValidFiniteNumber ───────────────────────────────────────────────────────

describe("isValidFiniteNumber", () => {
  it("accepts value within range", () => expect(isValidFiniteNumber(50, 0, 100)).toBe(true));
  it("accepts min boundary", () => expect(isValidFiniteNumber(0, 0, 100)).toBe(true));
  it("accepts max boundary", () => expect(isValidFiniteNumber(100, 0, 100)).toBe(true));
  it("rejects below min", () => expect(isValidFiniteNumber(-1, 0, 100)).toBe(false));
  it("rejects above max", () => expect(isValidFiniteNumber(101, 0, 100)).toBe(false));
  it("rejects Infinity", () => expect(isValidFiniteNumber(Infinity, 0, Infinity)).toBe(false));
  it("rejects -Infinity", () => expect(isValidFiniteNumber(-Infinity, -Infinity, 0)).toBe(false));
  it("rejects NaN", () => expect(isValidFiniteNumber(NaN, 0, 100)).toBe(false));
  it("rejects string", () => expect(isValidFiniteNumber("50", 0, 100)).toBe(false));
  it("rejects null", () => expect(isValidFiniteNumber(null, 0, 100)).toBe(false));
  it("accepts MAX_MONEY_VALUE", () => expect(isValidFiniteNumber(MAX_MONEY_VALUE, 0, MAX_MONEY_VALUE)).toBe(true));
  it("rejects above MAX_MONEY_VALUE", () => expect(isValidFiniteNumber(MAX_MONEY_VALUE + 1, 0, MAX_MONEY_VALUE)).toBe(false));
});

// ── isUuidLikeOrLegacyId ──────────────────────────────────────────────────────

describe("isUuidLikeOrLegacyId", () => {
  it("accepts a standard UUID", () => {
    expect(isUuidLikeOrLegacyId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
  });
  it("accepts alphanumeric id", () => expect(isUuidLikeOrLegacyId("abc123")).toBe(true));
  it("accepts underscores", () => expect(isUuidLikeOrLegacyId("id_with_underscore")).toBe(true));
  it("accepts dashes", () => expect(isUuidLikeOrLegacyId("id-with-dash")).toBe(true));
  it("rejects empty string", () => expect(isUuidLikeOrLegacyId("")).toBe(false));
  it("rejects non-string", () => expect(isUuidLikeOrLegacyId(123)).toBe(false));
  it("rejects null", () => expect(isUuidLikeOrLegacyId(null)).toBe(false));
  it("rejects spaces", () => expect(isUuidLikeOrLegacyId("id with space")).toBe(false));
  it("rejects special characters", () => expect(isUuidLikeOrLegacyId("id@domain")).toBe(false));
  it("rejects over 64 chars", () => {
    expect(isUuidLikeOrLegacyId("a".repeat(65))).toBe(false);
  });
  it("accepts exactly 64 chars", () => {
    expect(isUuidLikeOrLegacyId("a".repeat(64))).toBe(true);
  });
});
