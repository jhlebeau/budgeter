import { RecurrenceFrequency } from "@prisma/client";
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

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const { id } = await context.params;
  const series = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { transactions: true } },
    },
  });

  if (!series) {
    return NextResponse.json({ error: "Recurring series not found." }, { status: 404 });
  }

  const body = (await request.json()) as Record<string, unknown>;

  // Pause
  if (body.action === "pause") {
    const updated = await prisma.recurringTransaction.update({
      where: { id },
      data: { isPaused: true },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
      },
    });
    return NextResponse.json(updated);
  }

  // Resume: clear isPaused, add skip dates for all missed occurrences so nothing is backdated
  if (body.action === "resume") {
    const today = toUtcDateOnly(new Date());
    const yesterday = new Date(today.getTime() - DAY_MS);

    await prisma.$transaction(async (tx) => {
      // Get existing transaction dates and skip dates for this series
      const [existingTransactions, existingSkipDates] = await Promise.all([
        tx.transaction.findMany({
          where: { recurringSeriesId: id },
          select: { date: true },
        }),
        tx.recurringTransactionSkipDate.findMany({
          where: { recurringSeriesId: id },
          select: { date: true },
        }),
      ]);

      const existingDateKeys = new Set(existingTransactions.map((t) => dateKey(t.date)));
      const existingSkipKeys = new Set(existingSkipDates.map((s) => dateKey(s.date)));

      // Generate all expected dates from startDate through yesterday
      if (series.startDate <= yesterday) {
        const expectedDates = generateRecurringDates(
          series.startDate,
          yesterday,
          series.frequency,
        );

        // Any expected date with no transaction and no skip → add skip date
        const missedDates = expectedDates.filter(
          (d) => !existingDateKeys.has(dateKey(d)) && !existingSkipKeys.has(dateKey(d)),
        );

        if (missedDates.length > 0) {
          await tx.recurringTransactionSkipDate.createMany({
            data: missedDates.map((d) => ({
              recurringSeriesId: id,
              date: d,
            })),
            skipDuplicates: true,
          });
        }
      }

      await tx.recurringTransaction.update({
        where: { id },
        data: { isPaused: false },
      });
    });

    const updated = await prisma.recurringTransaction.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true } },
        _count: { select: { transactions: true } },
      },
    });
    return NextResponse.json(updated);
  }

  // Edit series content (amount, description, categoryId, frequency)
  const updates: Record<string, unknown> = {};
  let hasContentChange = false;

  if (body.amount !== undefined) {
    if (!isValidFiniteNumber(body.amount, 0, MAX_MONEY_VALUE)) {
      return NextResponse.json({ error: "amount must be a non-negative number." }, { status: 400 });
    }
    updates.amount = body.amount as number;
    hasContentChange = true;
  }

  if (body.description !== undefined) {
    const parsed =
      body.description === null ? "" : parseOptionalText(body.description, DESCRIPTION_MAX_LENGTH);
    if (parsed === null) {
      return NextResponse.json(
        { error: "description must be a string up to 300 characters." },
        { status: 400 },
      );
    }
    updates.description = parsed || null;
    hasContentChange = true;
  }

  if (body.categoryId !== undefined) {
    if (!isUuidLikeOrLegacyId(body.categoryId)) {
      return NextResponse.json({ error: "categoryId must be a valid ID." }, { status: 400 });
    }
    const category = await prisma.spendingCategory.findFirst({
      where: { id: body.categoryId as string, userId },
      select: { id: true },
    });
    if (!category) {
      return NextResponse.json(
        { error: "Invalid categoryId. Referenced category does not exist." },
        { status: 400 },
      );
    }
    updates.categoryId = body.categoryId as string;
    hasContentChange = true;
  }

  if (body.frequency !== undefined) {
    if (
      typeof body.frequency !== "string" ||
      !Object.values(RecurrenceFrequency).includes(body.frequency as RecurrenceFrequency)
    ) {
      return NextResponse.json(
        { error: "frequency must be DAILY, WEEKLY, or MONTHLY." },
        { status: 400 },
      );
    }
    updates.frequency = body.frequency as RecurrenceFrequency;
    hasContentChange = true;
  }

  let nextStartDate = series.startDate;
  if (body.startDate !== undefined) {
    const parsed = parseDate(body.startDate);
    if (!parsed) {
      return NextResponse.json({ error: "startDate must be a valid date." }, { status: 400 });
    }
    nextStartDate = toUtcDateOnly(parsed);
    updates.startDate = nextStartDate;
    hasContentChange = true;
  }

  if (!hasContentChange) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  // When editing content, delete all existing linked transactions and regenerate
  const now = toUtcDateOnly(new Date());
  const nextFrequency = (updates.frequency as RecurrenceFrequency) ?? series.frequency;
  const nextAmount = (updates.amount as number) ?? series.amount;
  const nextDescription =
    updates.description !== undefined
      ? (updates.description as string | null)
      : series.description;
  const nextCategoryId = (updates.categoryId as string) ?? series.categoryId;

  await prisma.$transaction(async (tx) => {
    await tx.recurringTransaction.update({
      where: { id },
      data: { ...updates, isPaused: false, endDate: null },
    });

    // Clear all skip dates and transactions, regenerate from scratch
    await tx.recurringTransactionSkipDate.deleteMany({ where: { recurringSeriesId: id } });
    await tx.transaction.deleteMany({ where: { recurringSeriesId: id, userId } });

    if (nextStartDate <= now) {
      const dates = generateRecurringDates(nextStartDate, now, nextFrequency);
      if (dates.length > 0) {
        await tx.transaction.createMany({
          data: dates.map((d) => ({
            amount: nextAmount,
            date: d,
            description: nextDescription,
            categoryId: nextCategoryId,
            userId,
            recurringSeriesId: id,
          })),
        });
      }
    }
  });

  const updated = await prisma.recurringTransaction.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { transactions: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const { id } = await context.params;
  const series = await prisma.recurringTransaction.findFirst({
    where: { id, userId },
    select: { id: true },
  });

  if (!series) {
    return NextResponse.json({ error: "Recurring series not found." }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { recurringSeriesId: id, userId } });
    await tx.recurringTransaction.delete({ where: { id } });
  });

  return new NextResponse(null, { status: 204 });
}
