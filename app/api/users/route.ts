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

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password }: { username?: unknown; password?: unknown } = body;

    const trimmed = parseRequiredText(username, USERNAME_MAX_LENGTH);
    if (!trimmed) {
      return NextResponse.json(
        { error: "username is required." },
        { status: 400 },
      );
    }
    if (!isValidUsername(trimmed)) {
      return NextResponse.json(
        { error: "username must be alphanumeric only." },
        { status: 400 },
      );
    }

    if (
      typeof password !== "string" ||
      password.length < PASSWORD_MIN_LENGTH ||
      password.length > PASSWORD_MAX_LENGTH
    ) {
      return NextResponse.json(
        { error: `password must be between ${PASSWORD_MIN_LENGTH} and ${PASSWORD_MAX_LENGTH} characters.` },
        { status: 400 },
      );
    }

    const usernameKey = normalizeUsername(trimmed);
    const existing = await prisma.user.findUnique({
      where: { usernameKey },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with that username already exists." },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const created = await prisma.user.create({
      data: {
        username: trimmed,
        usernameKey,
        passwordHash,
      },
      select: { id: true, username: true },
    });

    const token = await signSession(created.id, created.username);
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: SESSION_DURATION_SECONDS,
      path: "/",
    });

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
  }
}
