import { Prisma, RecurrenceFrequency } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dateKey, generateRecurringDates, toUtcDateOnly } from "@/lib/recurring";

const parseDate = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export async function GET() {
  const now = toUtcDateOnly(new Date());
  const recurringSeries = await prisma.recurringTransaction.findMany({
    include: {
      transactions: {
        select: { date: true },
      },
    },
  });

  for (const series of recurringSeries) {
    const expectedDates = generateRecurringDates(series.startDate, now, series.frequency);
    const existingDateKeys = new Set(
      series.transactions.map((transaction) => dateKey(transaction.date)),
    );
    const missingDates = expectedDates.filter(
      (expectedDate) => !existingDateKeys.has(dateKey(expectedDate)),
    );

    if (missingDates.length > 0) {
      await prisma.transaction.createMany({
        data: missingDates.map((date) => ({
          amount: series.amount,
          date,
          description: series.description,
          categoryId: series.categoryId,
          recurringSeriesId: series.id,
        })),
      });
    }
  }

  const transactions = await prisma.transaction.findMany({
    include: { category: true, recurringSeries: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  try {
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
    if (
      typeof amount !== "number" ||
      amount <= 0 ||
      !parsedDate ||
      (description !== undefined &&
        description !== null &&
        typeof description !== "string") ||
      typeof categoryId !== "string" ||
      !categoryId.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. Required: amount (>0), date, categoryId. Optional: description.",
        },
        { status: 400 },
      );
    }

    const normalizedDate = toUtcDateOnly(parsedDate);
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
      const dates = generateRecurringDates(normalizedDate, now, parsedFrequency);
      if (dates.length === 0) {
        return NextResponse.json(
          { error: "Recurring start date cannot be in the future." },
          { status: 400 },
        );
      }

      const createdId = await prisma.$transaction(async (tx) => {
        const series = await tx.recurringTransaction.create({
          data: {
            frequency: parsedFrequency,
            startDate: normalizedDate,
            amount,
            description: typeof description === "string" ? description : null,
            categoryId,
          },
        });

        const createdTransactions = await Promise.all(
          dates.map((occurrenceDate) =>
            tx.transaction.create({
              data: {
                amount,
                date: occurrenceDate,
                description: typeof description === "string" ? description : null,
                categoryId,
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
          amount,
          date: normalizedDate,
          description: typeof description === "string" ? description : null,
          category: { connect: { id: categoryId } },
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
