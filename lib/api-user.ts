import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession, SESSION_COOKIE_NAME } from "@/lib/auth";

export const requireUserId = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return {
      userId: null as null,
      errorResponse: NextResponse.json(
        { error: "Missing user context." },
        { status: 401 },
      ),
    };
  }

  const session = await verifySession(token);
  if (!session) {
    return {
      userId: null as null,
      errorResponse: NextResponse.json(
        { error: "Invalid or expired session." },
        { status: 401 },
      ),
    };
  }

  return { userId: session.userId, errorResponse: null };
};

export const userExists = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  return Boolean(user);
};
