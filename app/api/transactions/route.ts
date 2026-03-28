import { Prisma, RecurrenceFrequency } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKey, generateRecurringDates, toUtcDateOnly } from "@/lib/recurring";
import { requireUserId, userExists } from "@/lib/api-user";
import {
  DESCRIPTION_MAX_LENGTH,
  isUuidLikeOrLegacyId,
  isValidFiniteNumber,
  MAX_MONEY_VALUE,
  parseOptionalText,
} from "@/lib/input-validation";

const parseDate = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export async function GET(request: Request) {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const now = toUtcDateOnly(new Date());
  const recurringSeries = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: {
      transactions: {
        select: { date: true },
      },
    },
  });

  const seriesIds = recurringSeries.map((series) => series.id);
  let skippedDateKeysBySeries = new Map<string, Set<string>>();
  if (seriesIds.length > 0) {
    try {
      const skippedDates = await prisma.recurringTransactionSkipDate.findMany({
        where: { recurringSeriesId: { in: seriesIds } },
        select: { recurringSeriesId: true, date: true },
      });
      skippedDateKeysBySeries = skippedDates.reduce((acc, skippedDate) => {
        const keys = acc.get(skippedDate.recurringSeriesId) ?? new Set<string>();
        keys.add(dateKey(skippedDate.date));
        acc.set(skippedDate.recurringSeriesId, keys);
        return acc;
      }, new Map<string, Set<string>>());
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientValidationError)) {
        throw error;
      }
    }
  }

  for (const series of recurringSeries) {
    const seriesWithOptionalEndDate = series as typeof series & {
      endDate?: Date | null;
    };
    const generationEnd =
      seriesWithOptionalEndDate.endDate &&
      seriesWithOptionalEndDate.endDate.getTime() < now.getTime()
        ? seriesWithOptionalEndDate.endDate
        : now;
    if (series.startDate.getTime() > generationEnd.getTime()) {
      continue;
    }

    const skippedDateKeys = skippedDateKeysBySeries.get(series.id) ?? new Set<string>();
    const expectedDates = generateRecurringDates(
      series.startDate,
      generationEnd,
      series.frequency,
    );
    const existingDateKeys = new Set(
      series.transactions.map((transaction) => dateKey(transaction.date)),
    );
    const missingDates = expectedDates.filter(
      (expectedDate) =>
        !existingDateKeys.has(dateKey(expectedDate)) &&
        !skippedDateKeys.has(dateKey(expectedDate)),
    );

    if (missingDates.length > 0) {
      await prisma.transaction.createMany({
        data: missingDates.map((date) => ({
          amount: series.amount,
          date,
          description: series.description,
          userId,
          categoryId: series.categoryId,
          recurringSeriesId: series.id,
        })),
      });
    }
  }

  const transactions = await prisma.transaction.findMany({
    where: { userId },
    include: { category: true, recurringSeries: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  try {
    const { userId, errorResponse } = await requireUserId();
    if (errorResponse || !userId) return errorResponse!;
    if (!(await userExists(userId))) {
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }

    const body = await request.json();
    const {
      amount,
      date,
      description,
      categoryId,
      isRecurring,
      recurrenceFrequency,
    }: {
      amount?: unknown;
      date?: unknown;
      description?: unknown;
      categoryId?: unknown;
      isRecurring?: unknown;
      recurrenceFrequency?: unknown;
    } = body;

    const parsedDate = parseDate(date);
    const parsedDescription =
      description === undefined || description === null
        ? ""
        : parseOptionalText(description, DESCRIPTION_MAX_LENGTH);
    const parsedAmount = isValidFiniteNumber(amount, 0, MAX_MONEY_VALUE)
      ? (amount as number)
      : null;
    const parsedCategoryId = isUuidLikeOrLegacyId(categoryId)
      ? (categoryId as string)
      : null;
    if (parsedAmount === null) {
      return NextResponse.json(
        { error: "Invalid amount. amount must be a number >= 0." },
        { status: 400 },
      );
    }
    if (!parsedDate) {
      return NextResponse.json(
        { error: "Invalid date. Please provide a valid date." },
        { status: 400 },
      );
    }
    if (parsedDescription === null) {
      return NextResponse.json(
        {
          error:
            "Invalid description. description must be text up to 300 characters.",
        },
        { status: 400 },
      );
    }
    if (parsedCategoryId === null) {
      return NextResponse.json(
        { error: "Invalid categoryId. categoryId is required." },
        { status: 400 },
      );
    }

    const normalizedDate = toUtcDateOnly(parsedDate);
    const category = await prisma.spendingCategory.findFirst({
      where: { id: parsedCategoryId, userId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Invalid categoryId. Referenced category does not exist." },
        { status: 400 },
      );
    }

    const shouldRecur = isRecurring === true;
    let parsedFrequency: RecurrenceFrequency | null = null;

    if (shouldRecur) {
      if (
        typeof recurrenceFrequency !== "string" ||
        !Object.values(RecurrenceFrequency).includes(
          recurrenceFrequency as RecurrenceFrequency,
        )
      ) {
        return NextResponse.json(
          {
            error:
              "recurrenceFrequency is required for recurring transactions (DAILY, WEEKLY, MONTHLY).",
          },
          { status: 400 },
        );
      }
      parsedFrequency = recurrenceFrequency as RecurrenceFrequency;
    }

    let transactionId: string;
    if (shouldRecur && parsedFrequency) {
      const now = toUtcDateOnly(new Date());
      const generationEnd =
        normalizedDate.getTime() > now.getTime() ? normalizedDate : now;
      const dates = generateRecurringDates(
        normalizedDate,
        generationEnd,
        parsedFrequency,
      );

      const createdId = await prisma.$transaction(async (tx) => {
        const series = await tx.recurringTransaction.create({
          data: {
            frequency: parsedFrequency,
            startDate: normalizedDate,
            amount: parsedAmount,
            description: parsedDescription || null,
            categoryId: parsedCategoryId,
            userId,
          },
        });

        const createdTransactions = await Promise.all(
          dates.map((occurrenceDate) =>
            tx.transaction.create({
              data: {
                amount: parsedAmount,
                date: occurrenceDate,
                description: parsedDescription || null,
                categoryId: parsedCategoryId,
                userId,
                recurringSeriesId: series.id,
              },
              select: { id: true },
            }),
          ),
        );

        const selected = createdTransactions.find(
          (_transaction, index) => dateKey(dates[index]) === dateKey(normalizedDate),
        );
        return selected?.id ?? createdTransactions[0].id;
      });
      transactionId = createdId;
    } else {
      const transaction = await prisma.transaction.create({
        data: {
          amount: parsedAmount,
          date: normalizedDate,
          description: parsedDescription || null,
          categoryId: parsedCategoryId,
          userId,
        },
        select: { id: true },
      });
      transactionId = transaction.id;
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
      include: { category: true, recurringSeries: true },
    });

    if (!transaction) {
      return NextResponse.json(
        { error: "Unable to create transaction." },
        { status: 500 },
      );
    }

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Invalid categoryId. Referenced category does not exist." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Unable to create transaction." },
      { status: 500 },
    );
  }
}
