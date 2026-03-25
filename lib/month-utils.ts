export const isValidMonthKey = (value: unknown): value is string => {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
};

export const getCurrentMonthKey = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

export const isMonthInRange = (
  monthKey: string,
  startMonth: string,
  endMonth: string | null,
) => monthKey >= startMonth && (!endMonth || monthKey <= endMonth);

