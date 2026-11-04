import { NextResponse } from "next/server";
import { canSeeLiveBanner, getLiveCards } from "@/features/live-banner/lib/data";

// What the banner refreshes from while a page stays open. Logged-in users only.

export async function GET() {
  if (!(await canSeeLiveBanner())) return new NextResponse("Unauthorized", { status: 401 });
  return NextResponse.json({ cards: await getLiveCards() }, { headers: { "cache-control": "no-store" } });
}
