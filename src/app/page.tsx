import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await getCurrentUserId();
  redirect(userId ? "/dashboard" : "/login");
}
