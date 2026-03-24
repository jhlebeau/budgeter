import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId, userExists } from "@/lib/api-user";

export async function DELETE(request: Request) {
  try {
    const { userId, errorResponse } = requireUserId(request);
    if (errorResponse || !userId) return errorResponse!;
    if (!(await userExists(userId))) {
      return NextResponse.json({ error: "User not found." }, { status: 401 });
    }

    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.recurringTransaction.deleteMany({ where: { userId } });
    await prisma.spendingCategory.deleteMany({ where: { userId } });
    await prisma.savingCategory.deleteMany({ where: { userId } });
    await prisma.incomeSource.deleteMany({ where: { userId } });

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json(
      { error: "Unable to reset data." },
      { status: 500 },
    );
  }
}
