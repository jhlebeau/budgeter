import { RecurrenceFrequency } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;

export const toUtcDateOnly = (value: Date) =>
  new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));

export const dateKey = (value: Date) => toUtcDateOnly(value).toISOString().slice(0, 10);

const getDaysInMonthUtc = (year: number, monthIndex: number) =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const addMonthsWithClamp = (startDate: Date, monthOffset: number) => {
  const start = toUtcDateOnly(startDate);
  const targetMonthIndex = start.getUTCMonth() + monthOffset;
  const targetYear = start.getUTCFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedTargetMonth =
    ((targetMonthIndex % 12) + 12) % 12;
  const clampedDay = Math.min(
    start.getUTCDate(),
    getDaysInMonthUtc(targetYear, normalizedTargetMonth),
  );
  return new Date(Date.UTC(targetYear, normalizedTargetMonth, clampedDay));
};

export const generateRecurringDates = (
  startDate: Date,
  endDate: Date,
  frequency: RecurrenceFrequency,
) => {
  const start = toUtcDateOnly(startDate);
  const end = toUtcDateOnly(endDate);
  if (start.getTime() > end.getTime()) return [] as Date[];

  if (frequency === RecurrenceFrequency.DAILY) {
    const dates: Date[] = [];
    for (let time = start.getTime(); time <= end.getTime(); time += DAY_MS) {
      dates.push(new Date(time));
    }
    return dates;
  }

  if (frequency === RecurrenceFrequency.WEEKLY) {
    const dates: Date[] = [];
    for (let time = start.getTime(); time <= end.getTime(); time += 7 * DAY_MS) {
      dates.push(new Date(time));
    }
    return dates;
  }

  const dates: Date[] = [];
  for (let monthOffset = 0; ; monthOffset += 1) {
    const next = addMonthsWithClamp(start, monthOffset);
    if (next.getTime() > end.getTime()) break;
    dates.push(next);
  }
  return dates;
};

