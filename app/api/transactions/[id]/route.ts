import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseDate = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: { category: true },
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
    const { id } = await context.params;
    const body = await request.json();
    const {
      amount,
      date,
      description,
      categoryId,
    }: {
      amount?: unknown;
      date?: unknown;
      description?: unknown;
      categoryId?: unknown;
    } = body;

    if (amount !== undefined && (typeof amount !== "number" || amount <= 0)) {
      return NextResponse.json(
        { error: "amount must be a positive number when provided." },
        { status: 400 },
      );
    }

    let parsedDate: Date | undefined;
    if (date !== undefined) {
      const parsedDateOrNull = parseDate(date);
      if (!parsedDateOrNull) {
        return NextResponse.json(
          { error: "date must be a valid ISO date when provided." },
          { status: 400 },
        );
      }
      parsedDate = parsedDateOrNull;
    }

    if (
      description !== undefined &&
      description !== null &&
      typeof description !== "string"
    ) {
      return NextResponse.json(
        { error: "description must be a string or null when provided." },
        { status: 400 },
      );
    }

    if (
      categoryId !== undefined &&
      (typeof categoryId !== "string" || !categoryId.trim())
    ) {
      return NextResponse.json(
        { error: "categoryId must be a non-empty string when provided." },
        { status: 400 },
      );
    }

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: {
        ...(amount !== undefined ? { amount } : {}),
        ...(parsedDate !== undefined ? { date: parsedDate } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(categoryId !== undefined
          ? { category: { connect: { id: categoryId } } }
          : {}),
      },
      include: { category: true },
    });

    return NextResponse.json(transaction);
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await prisma.transaction.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json({ error: "Transaction not found." }, { status: 404 });
  }

  await prisma.transaction.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
