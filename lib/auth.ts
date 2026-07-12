// Server-side auth: password hashing (bcrypt), cookie session, current-user lookup.
// Node runtime only (imports Prisma + bcrypt). Middleware must not import this file —
// it uses lib/session.ts instead.

import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { prisma } from "./db";
import { Role } from "./domain";
import { SESSION_COOKIE, SESSION_MAX_AGE, signSession, verifySession } from "./session";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await signSession(userId);
  cookies().set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export function destroySession(): void {
  cookies().delete(SESSION_COOKIE);
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

/** The signed-in, active user, or null. Never exposes the password hash. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const uid = await verifySession(cookies().get(SESSION_COOKIE)?.value);
  if (!uid) return null;

  const user = await prisma.user.findUnique({
    where: { id: uid },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
}
