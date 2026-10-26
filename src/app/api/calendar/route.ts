import { NextResponse, type NextRequest } from "next/server";
import { sameName } from "@/lib/auth";
import { matchEvent } from "@/lib/calendar";
import { getActiveTournament, getMatch, getScheduledMatches } from "@/lib/data";
import { buildCalendar } from "@/lib/ics";
import { getSiteUrl } from "@/lib/site";

// GET /api/calendar               → every scheduled match of the active tournament (subscribable feed)
// GET /api/calendar?player=Dave   → only that player's matches
// GET /api/calendar?match=<id>    → one match as a downloadable .ics file
export async function GET(request: NextRequest) {
  const site = await getSiteUrl();
  const matchId = request.nextUrl.searchParams.get("match");
  const player = request.nextUrl.searchParams.get("player");

  if (matchId) {
    const match = await getMatch(matchId);
    if (!match?.scheduled_at) return new NextResponse("Nincs időpont", { status: 404 });
    return new NextResponse(buildCalendar("Dice Throne meccs", [matchEvent(match, site)]), {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="dice-throne-meccs.ics"`,
      },
    });
  }

  const tournament = await getActiveTournament();
  const matches = tournament ? await getScheduledMatches(tournament.id) : [];
  const selected = matches.filter(
    (m) => m.status !== "bye" && (!player || sameName(m.a.karnyx_name, player) || sameName(m.b?.karnyx_name, player)),
  );
  const name = `${tournament?.name ?? "Dice Throne"}${player ? ` – ${player}` : ""}`;

  return new NextResponse(buildCalendar(name, selected.map((m) => matchEvent(m, site))), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
