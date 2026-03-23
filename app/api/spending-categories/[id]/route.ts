import { LimitType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const isLimitType = (value: unknown): value is LimitType =>
  value === "AMOUNT" || value === "PERCENT";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const category = await prisma.spendingCategory.findUnique({
    where: { id },
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

    if (name !== undefined && (typeof name !== "string" || !name.trim())) {
      return NextResponse.json(
        { error: "name must be a non-empty string when provided." },
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
      (typeof limitValue !== "number" || limitValue <= 0)
    ) {
      return NextResponse.json(
        { error: "limitValue must be a positive number when provided." },
        { status: 400 },
      );
    }

    const existing = await prisma.spendingCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Spending category not found." },
        { status: 404 },
      );
    }

    const category = await prisma.spendingCategory.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
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
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const existing = await prisma.spendingCategory.findUnique({ where: { id } });

  if (!existing) {
    return NextResponse.json(
      { error: "Spending category not found." },
      { status: 404 },
    );
  }

  await prisma.spendingCategory.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

