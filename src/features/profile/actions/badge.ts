"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { findBadge } from "../lib/badges";
import { TEST_BADGE_COOKIE } from "../lib/test-badge";

/** Admin try-on: wear a badge (`badge` = its id) or take it off (empty). Admins only. */
export async function setTestBadge(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("badge") ?? "");
  const store = await cookies();
  if (findBadge(id)) {
    store.set(TEST_BADGE_COOKIE, id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    store.delete(TEST_BADGE_COOKIE);
  }
  revalidatePath("/", "layout");
}
