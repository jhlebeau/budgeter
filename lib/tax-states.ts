export const TAX_STATES = [
  "AK",
  "CA",
  "FL",
  "MA",
  "NV",
  "NH",
  "SD",
  "TN",
  "TX",
  "WA",
  "WY",
] as const;

export type TaxStateCode = (typeof TAX_STATES)[number];

export const NO_STATE_INCOME_TAX_STATES: ReadonlySet<TaxStateCode> = new Set([
  "AK",
  "FL",
  "NV",
  "NH",
  "SD",
  "TN",
  "TX",
  "WA",
  "WY",
]);

