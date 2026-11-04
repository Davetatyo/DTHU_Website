import { NextResponse, type NextRequest } from "next/server";
import { applyVoiceReport } from "@/features/live-banner/lib/report";
import { parseVoiceReport } from "@/features/live-banner/lib/rules";

// The Discord bot reports here who is in the tournament voice channels (Bearer LIVE_BOT_SECRET).
// The contract is in src/features/live-banner/bot/README.md. This URL never moves: the bot calls it.

export async function POST(request: NextRequest) {
  const secret = process.env.LIVE_BOT_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const report = parseVoiceReport(await request.json().catch(() => null));
  if (!report) return new NextResponse("Invalid report", { status: 400 });

  try {
    return NextResponse.json(await applyVoiceReport(report));
  } catch {
    // Most likely migration 0011 hasn't run yet. The bot tries again in a minute.
    return new NextResponse("Live banner database not ready", { status: 503 });
  }
}
