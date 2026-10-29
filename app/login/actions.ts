"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_DAYS, cookieOptions, signSession } from "@/lib/session";
import { signInOwnerWithPassword } from "@/lib/users";

// Owner fallback: the dashboard password signs in as the owner account.
export async function login(form: FormData) {
  const password = String(form.get("password") ?? "");
  if (!process.env.DASHBOARD_PASSWORD || password !== process.env.DASHBOARD_PASSWORD) redirect("/login?e=password");
  const id = await signInOwnerWithPassword();
  (await cookies()).set(SESSION_COOKIE, await signSession(id), cookieOptions(SESSION_DAYS * 86_400));
  redirect("/");
}
