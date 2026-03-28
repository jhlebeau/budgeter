import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from "@/lib/auth";
import {
  isValidUsername,
  normalizeUsername,
  parseRequiredText,
  USERNAME_MAX_LENGTH,
} from "@/lib/input-validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password }: { username?: unknown; password?: unknown } = body;

    const parsedUsername = parseRequiredText(username, USERNAME_MAX_LENGTH);
    if (!parsedUsername || !isValidUsername(parsedUsername)) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    if (typeof password !== "string" || !password) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const usernameKey = normalizeUsername(parsedUsername);
    const user = await prisma.user.findUnique({
      where: { usernameKey },
      select: { id: true, username: true, passwordHash: true },
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: "Invalid credentials." }, { status: 401 });
    }

    const token = await signSession(user.id, user.username);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    return NextResponse.json({ id: user.id, username: user.username });
  } catch {
    return NextResponse.json({ error: "Unable to log in." }, { status: 500 });
  }
}
