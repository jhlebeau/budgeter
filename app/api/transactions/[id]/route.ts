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

type Scope = "THIS" | "FUTURE" | "ALL";
const DAY_MS = 24 * 60 * 60 * 1000;

const parseDate = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const parseScope = (value: unknown): Scope | null => {
  if (value === undefined || value === null) return "THIS";
  if (value === "THIS" || value === "FUTURE" || value === "ALL") return value;
  return null;
};

const parseFrequency = (value: unknown) => {
  if (value === undefined || value === null) return undefined;
  if (
    typeof value === "string" &&
    Object.values(RecurrenceFrequency).includes(value as RecurrenceFrequency)
  ) {
    return value as RecurrenceFrequency;
  }
  return null;
};

type UpdatePayload = {
  amount?: unknown;
  date?: unknown;
  description?: unknown;
  categoryId?: unknown;
  recurrenceFrequency?: unknown;
  scope?: unknown;
};

const validateUpdatePayload = (body: UpdatePayload) => {
  if (
    body.amount !== undefined &&
    !isValidFiniteNumber(body.amount, 0, MAX_MONEY_VALUE)
  ) {
    return { error: "amount must be a non-negative number when provided.", status: 400 };
  }

  let parsedDate: Date | undefined;
  if (body.date !== undefined) {
    const parsedDateOrNull = parseDate(body.date);
    if (!parsedDateOrNull) {
      return { error: "date must be a valid ISO date when provided.", status: 400 };
    }
    parsedDate = toUtcDateOnly(parsedDateOrNull);
  }

  const parsedDescription =
    body.description !== undefined
      ? body.description === null
        ? ""
        : parseOptionalText(body.description, DESCRIPTION_MAX_LENGTH)
      : undefined;
  if (parsedDescription === null) {
    return {
      error: "description must be a string up to 300 characters when provided.",
      status: 400,
    };
  }

  if (body.categoryId !== undefined && !isUuidLikeOrLegacyId(body.categoryId)) {
    return {
      error: "categoryId must be a non-empty string when provided.",
      status: 400,
    };
  }

  const parsedScope = parseScope(body.scope);
  if (!parsedScope) {
    return { error: "scope must be THIS, FUTURE, or ALL.", status: 400 };
  }

  const parsedFrequency = parseFrequency(body.recurrenceFrequency);
  if (parsedFrequency === null) {
    return {
      error: "recurrenceFrequency must be DAILY, WEEKLY, or MONTHLY when provided.",
      status: 400,
    };
  }

  return {
    parsedDate,
    parsedDescription,
    parsedScope,
    parsedFrequency,
  };
};

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = requireUserId(request);
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const { id } = await context.params;
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: true, recurringSeries: true },
  });

  if (!transaction) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  return NextResponse.json(transaction);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, errorResponse } = requireUserId(request);
    if (errorResponse || !userId) return errorResponse!;
    if (!(await userExists(userId))) {
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }

    const { id } = await context.params;
    const body = (await request.json()) as UpdatePayload;
    const validation = validateUpdatePayload(body);
    if ("error" in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { parsedDate, parsedDescription, parsedScope, parsedFrequency } = validation;
    const existing = await prisma.transaction.findUnique({
      where: { id },
      include: { recurringSeries: true },
    });

    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    const nextAmount = body.amount !== undefined ? (body.amount as number) : existing.amount;
    const nextDate = parsedDate ?? toUtcDateOnly(existing.date);
    const nextDescription =
      parsedDescription !== undefined
        ? parsedDescription || null
        : existing.description;
    const nextCategoryId =
      body.categoryId !== undefined ? (body.categoryId as string) : existing.categoryId;

    if (body.categoryId !== undefined) {
      const category = await prisma.spendingCategory.findFirst({
        where: { id: nextCategoryId, userId },
        select: { id: true },
      });
      if (!category) {
        return NextResponse.json(
          { error: "Invalid categoryId. Referenced category does not exist." },
          { status: 400 },
        );
      }
    }

    if (!existing.recurringSeriesId || parsedScope === "THIS") {
      const updated = await prisma.transaction.update({
        where: { id },
        data: {
          ...(body.amount !== undefined ? { amount: nextAmount } : {}),
          ...(parsedDate !== undefined ? { date: nextDate } : {}),
          ...(body.description !== undefined ? { description: nextDescription } : {}),
          ...(body.categoryId !== undefined ? { categoryId: nextCategoryId } : {}),
          ...(existing.recurringSeriesId ? { recurringSeriesId: null } : {}),
        },
        include: { category: true, recurringSeries: true },
      });
      return NextResponse.json(updated);
    }

    const seriesId = existing.recurringSeriesId;
    const series = existing.recurringSeries;
    if (!series) {
      return NextResponse.json(
        { error: "Recurring series not found." },
        { status: 404 },
      );
    }

    const nextFrequency = parsedFrequency ?? series.frequency;
    const now = toUtcDateOnly(new Date());
    const regenerationStart = nextDate;

    if (regenerationStart.getTime() > now.getTime()) {
      return NextResponse.json(
        { error: "Cannot regenerate recurring transactions from a future date." },
        { status: 400 },
      );
    }

    const updatedId = await prisma.$transaction(async (tx) => {
      await tx.recurringTransaction.update({
        where: { id: seriesId },
        data: {
          amount: nextAmount,
          description: nextDescription,
          categoryId: nextCategoryId,
          userId,
          frequency: nextFrequency,
          endDate: null,
          ...(parsedScope === "ALL" ? { startDate: nextDate } : {}),
        },
      });

      if (parsedScope === "ALL") {
        await tx.recurringTransactionSkipDate.deleteMany({
          where: { recurringSeriesId: seriesId },
        });
      } else {
        await tx.recurringTransactionSkipDate.deleteMany({
          where: {
            recurringSeriesId: seriesId,
            date: { gte: nextDate },
          },
        });
      }

      if (parsedScope === "ALL") {
        await tx.transaction.deleteMany({
          where: { recurringSeriesId: seriesId, userId },
        });
      } else {
        const deleteFromDate =
          nextDate.getTime() < toUtcDateOnly(existing.date).getTime()
            ? nextDate
            : toUtcDateOnly(existing.date);
        await tx.transaction.deleteMany({
          where: {
            userId,
            recurringSeriesId: seriesId,
            date: { gte: deleteFromDate },
          },
        });
      }

      const recurrenceStart = nextDate;
      const dates = generateRecurringDates(recurrenceStart, now, nextFrequency);
      if (dates.length === 0) {
        throw new Error("No recurrence dates generated.");
      }

      const createdTransactions = await Promise.all(
        dates.map((occurrenceDate) =>
          tx.transaction.create({
            data: {
              amount: nextAmount,
              date: occurrenceDate,
              description: nextDescription,
              categoryId: nextCategoryId,
              userId,
              recurringSeriesId: seriesId,
            },
            select: { id: true, date: true },
          }),
        ),
      );

      if (parsedScope === "ALL") {
        return createdTransactions[0].id;
      }

      const selected = createdTransactions.find(
        (transaction) => dateKey(transaction.date) === dateKey(nextDate),
      );
      return selected?.id ?? createdTransactions[0].id;
    });

    const updated = await prisma.transaction.findUnique({
      where: { id: updatedId },
      include: { category: true, recurringSeries: true },
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Unable to update transaction." },
        { status: 500 },
      );
    }

    return NextResponse.json(updated);
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
      { error: "Unable to update transaction." },
      { status: 500 },
    );
  }
}

type DeletePayload = {
  scope?: unknown;
};

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { userId, errorResponse } = requireUserId(request);
    if (errorResponse || !userId) return errorResponse!;
    if (!(await userExists(userId))) {
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }

    const { id } = await context.params;
    let body: DeletePayload = {};
    try {
      body = (await request.json()) as DeletePayload;
    } catch {
      body = {};
    }
    const scope = parseScope(body.scope);
    if (!scope) {
      return NextResponse.json(
        { error: "scope must be THIS, FUTURE, or ALL." },
        { status: 400 },
      );
    }

    const existing = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { recurringSeries: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    if (!existing.recurringSeriesId) {
      await prisma.transaction.delete({ where: { id } });
      return new NextResponse(null, { status: 204 });
    }
    const recurringSeriesId = existing.recurringSeriesId;

    if (scope === "THIS") {
      await prisma.$transaction(async (tx) => {
        await tx.recurringTransactionSkipDate.upsert({
          where: {
            recurringSeriesId_date: {
              recurringSeriesId,
              date: toUtcDateOnly(existing.date),
            },
          },
          create: {
            recurringSeriesId,
            date: toUtcDateOnly(existing.date),
          },
          update: {},
        });
        await tx.transaction.delete({ where: { id } });
      });
      return new NextResponse(null, { status: 204 });
    }

    if (scope === "FUTURE") {
      const cutoffDate = toUtcDateOnly(existing.date);
      const endDate = new Date(cutoffDate.getTime() - DAY_MS);
      await prisma.$transaction(async (tx) => {
        await tx.recurringTransaction.update({
          where: { id: recurringSeriesId },
          data: { endDate },
        });
        await tx.recurringTransactionSkipDate.deleteMany({
          where: {
            recurringSeriesId,
            date: { gte: cutoffDate },
          },
        });
        await tx.transaction.deleteMany({
          where: {
            userId,
            recurringSeriesId,
            date: { gte: cutoffDate },
          },
        });
      });
      return new NextResponse(null, { status: 204 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({
        where: { userId, recurringSeriesId },
      });
      await tx.recurringTransaction.deleteMany({
        where: { id: recurringSeriesId, userId },
      });
    });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Unable to delete transaction." },
      { status: 500 },
    );
  }
}
