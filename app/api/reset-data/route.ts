import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    await prisma.transaction.deleteMany();
    await prisma.spendingCategory.deleteMany();
    await prisma.savingCategory.deleteMany();
    await prisma.incomeSource.deleteMany();

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Unable to reset data." },
      { status: 500 },
    );
  }
}
