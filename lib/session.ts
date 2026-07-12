// Edge-safe session token helpers (jose only — no Node/Prisma/bcrypt imports).
// Safe to use from middleware.ts as well as server components.

import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "lm_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function secret() {
  return new TextEncoder().encode(process.env.SESSION_SECRET || "insecure-dev-secret");
}

export async function signSession(userId: string): Promise<string> {
  return new SignJWT({ uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

/** Returns the userId if the token is valid, otherwise null. */
export async function verifySession(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.uid === "string" ? payload.uid : null;
  } catch {
    return null;
  }
}
