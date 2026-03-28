import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "session";
export const SESSION_DURATION_SECONDS = 30 * 24 * 60 * 60; // 30 days

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set.");
  return new TextEncoder().encode(secret);
};

export const signSession = async (userId: string, username: string) => {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());
};

export const verifySession = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = payload.sub;
    const username = payload["username"];
    if (typeof userId !== "string" || typeof username !== "string") return null;
    return { userId, username };
  } catch {
    return null;
  }
};
