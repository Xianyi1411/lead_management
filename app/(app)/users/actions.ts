"use server";

// User management (Admin-only, Blueprint §3). Every action re-checks the session and
// `manage_users` server-side. Guards: an Admin can't deactivate themselves or change
// their own role — that could lock the last Admin out of the system.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, hashPassword } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { isRole } from "@/lib/domain";

export interface UserActionResult {
  error?: string;
  ts?: number; // success marker — forms use it to reset
}

export async function createUser(
  _prev: UserActionResult,
  formData: FormData
): Promise<UserActionResult> {
  const user = await getCurrentUser();
  if (!user || !can(user, "manage_users")) return { error: "Only an Admin can manage users." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "SALES_REP");

  if (!name) return { error: "Enter the user's name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Enter a valid email address." };
  if (password.length < 8) return { error: "Password needs at least 8 characters." };
  if (!isRole(role)) return { error: "Pick a role from the list." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "That email is already in use." };

  await prisma.user.create({
    data: { name, email, passwordHash: await hashPassword(password), role },
  });

  revalidatePath("/users");
  return { ts: Date.now() };
}

export async function toggleUserActive(userId: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !can(user, "manage_users")) return;
  if (userId === user.id) return; // never deactivate yourself

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !target.isActive },
  });
  revalidatePath("/users");
}

export async function setUserRole(userId: string, formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user || !can(user, "manage_users")) return;
  if (userId === user.id) return; // never change your own role

  const role = String(formData.get("role") ?? "");
  if (!isRole(role)) return;

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/users");
}
