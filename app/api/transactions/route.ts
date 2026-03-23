import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const parseDate = (value: unknown) => {
  if (typeof value !== "string" && !(value instanceof Date)) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export async function GET() {
  const transactions = await prisma.transaction.findMany({
    include: { category: true },
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
    }: {
      amount?: unknown;
      date?: unknown;
      description?: unknown;
      categoryId?: unknown;
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

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        date: parsedDate,
        description: typeof description === "string" ? description : null,
        category: { connect: { id: categoryId } },
      },
      include: { category: true },
    });

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
