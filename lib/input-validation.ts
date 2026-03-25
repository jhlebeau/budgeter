export const USERNAME_MAX_LENGTH = 32;
export const NAME_MAX_LENGTH = 80;
export const CATEGORY_NAME_MAX_LENGTH = 60;
export const DESCRIPTION_MAX_LENGTH = 300;
export const MAX_MONEY_VALUE = 1_000_000_000;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/;
const ALPHANUMERIC_ONLY = /^[A-Za-z0-9]+$/;

export const normalizeUsername = (value: string) => value.trim().toLowerCase();

export const isValidUsername = (value: string) =>
  value.length > 0 &&
  value.length <= USERNAME_MAX_LENGTH &&
  ALPHANUMERIC_ONLY.test(value);

export const parseRequiredText = (value: unknown, maxLength: number) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || CONTROL_CHARS.test(trimmed)) {
    return null;
  }
  return trimmed;
};

export const parseOptionalText = (value: unknown, maxLength: number) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length > maxLength || CONTROL_CHARS.test(trimmed)) return null;
  return trimmed;
};

export const isValidFiniteNumber = (
  value: unknown,
  minInclusive: number,
  maxInclusive: number,
) =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= minInclusive &&
  value <= maxInclusive;

export const isUuidLikeOrLegacyId = (value: unknown) =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 64 &&
  /^[A-Za-z0-9_-]+$/.test(value);
