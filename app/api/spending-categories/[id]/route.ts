import { LimitType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";
import {
  CATEGORY_NAME_MAX_LENGTH,
  isValidFiniteNumber,
  MAX_MONEY_VALUE,
  parseRequiredText,
} from "@/lib/input-validation";

const isLimitType = (value: unknown): value is LimitType =>
  value === "AMOUNT" || value === "PERCENT";

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
  const category = await prisma.spendingCategory.findFirst({
    where: { id, userId },
    include: { transactions: true },
  });

  if (!category) {
    return NextResponse.json(
      { error: "Spending category not found." },
      { status: 404 },
    );
  }

  return NextResponse.json(category);
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

    if (name !== undefined && !parseRequiredText(name, CATEGORY_NAME_MAX_LENGTH)) {
      return NextResponse.json(
        { error: "name must be a non-empty string up to 60 chars." },
        { status: 400 },
      );
    }
    if (limitType !== undefined && !isLimitType(limitType)) {
      return NextResponse.json(
        { error: "limitType must be AMOUNT or PERCENT when provided." },
        { status: 400 },
      );
    }
    if (
      limitValue !== undefined &&
      (!isValidFiniteNumber(limitValue, 0.01, MAX_MONEY_VALUE) ||
        (limitType === "PERCENT" && limitValue > 10_000))
    ) {
      return NextResponse.json(
        { error: "limitValue must be a positive number when provided." },
        { status: 400 },
      );
    }

    const existing = await prisma.spendingCategory.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Spending category not found." },
        { status: 404 },
      );
    }
    const nextLimitType = (limitType ?? existing.limitType) as LimitType;
    if (limitValue !== undefined && nextLimitType === "PERCENT" && limitValue > 10_000) {
      return NextResponse.json(
        { error: "Percent limit must be <= 10,000." },
        { status: 400 },
      );
    }

    const parsedName =
      name !== undefined ? parseRequiredText(name, CATEGORY_NAME_MAX_LENGTH) : undefined;

    const category = await prisma.spendingCategory.update({
      where: { id },
      data: {
        ...(parsedName ? { name: parsedName } : {}),
        ...(limitType !== undefined ? { limitType } : {}),
        ...(limitValue !== undefined ? { limitValue } : {}),
      },
      include: { transactions: true },
    });

    return NextResponse.json(category);
  } catch {
    return NextResponse.json(
      { error: "Unable to update spending category." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = requireUserId(request);
  if (errorResponse || !userId) return errorResponse!;
  if (!(await userExists(userId))) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.spendingCategory.findFirst({ where: { id, userId } });

  if (!existing) {
    return NextResponse.json(
      { error: "Spending category not found." },
      { status: 404 },
    );
  }

  await prisma.spendingCategory.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
