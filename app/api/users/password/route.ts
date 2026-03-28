import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/api-user";

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export async function PATCH(request: Request) {
  const { userId, errorResponse } = await requireUserId();
  if (errorResponse || !userId) return errorResponse!;

  const body = await request.json();
  const { currentPassword, newPassword }: { currentPassword?: unknown; newPassword?: unknown } = body;

  if (typeof currentPassword !== "string" || !currentPassword) {
    return NextResponse.json({ error: "currentPassword is required." }, { status: 400 });
  }

  if (
    typeof newPassword !== "string" ||
    newPassword.length < PASSWORD_MIN_LENGTH ||
    newPassword.length > PASSWORD_MAX_LENGTH
  ) {
    return NextResponse.json(
      { error: `newPassword must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    return NextResponse.json({ error: "User not found." }, { status: 401 });
  }

  const currentValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!currentValid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  return new NextResponse(null, { status: 204 });
}
