import { LimitType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const isLimitType = (value: unknown): value is LimitType =>
  value === "AMOUNT" || value === "PERCENT";

export async function GET() {
  const categories = await prisma.spendingCategory.findMany({
    include: { transactions: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      limitType,
      limitValue,
    }: {
      name?: unknown;
      limitType?: unknown;
      limitValue?: unknown;
    } = body;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !isLimitType(limitType) ||
      typeof limitValue !== "number" ||
      limitValue <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payload. Required: name, limitType (AMOUNT|PERCENT), limitValue (>0).",
        },
        { status: 400 },
      );
    }

    const category = await prisma.spendingCategory.create({
      data: {
        name: name.trim(),
        limitType,
        limitValue,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Unable to create spending category." },
      { status: 500 },
    );
  }
}

