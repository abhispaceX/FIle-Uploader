import { cookies } from "next/headers";

const COOKIE_NAME = "cd_session";

export async function getCurrentUserId(): Promise<string | null> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value ?? null;
}

export async function setCurrentUserId(userId: string): Promise<void> {
  const c = await cookies();
  c.set(COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCurrentUserId(): Promise<void> {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}
