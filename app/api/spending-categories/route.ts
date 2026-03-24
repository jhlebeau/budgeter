import { LimitType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";

const isLimitType = (value: unknown): value is LimitType =>
  value === "AMOUNT" || value === "PERCENT";

export async function GET(request: Request) {
  const { userId, errorResponse } = requireUserId(request);
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const categories = await prisma.spendingCategory.findMany({
    where: { userId },
    include: { transactions: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  try {
    const { userId, errorResponse } = requireUserId(request);
    if (errorResponse || !userId) return errorResponse!;
    if (!(await userExists(userId))) {
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }

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
        userId,
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
