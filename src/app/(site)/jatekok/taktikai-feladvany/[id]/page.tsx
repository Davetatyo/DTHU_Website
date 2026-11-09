import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PuzzleGame } from "@/features/puzzle/components/PuzzleGame";
import { canOpenPuzzles } from "@/features/puzzle/lib/access";
import { puzzleById } from "@/features/puzzle/lib/puzzles";
import "@/features/puzzle/puzzle.css";
import { getAdminView } from "@/lib/auth";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Taktikai feladvány" };

export default async function PuzzlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!canOpenPuzzles(await getAdminView())) redirect(routes.games);
  const puzzle = puzzleById(id);
  if (!puzzle) notFound();
  return (
    <div className="space-y-3">
      <div className="sec-h">
        <h1>Taktikai feladvány</h1>
      </div>
      <PuzzleGame puzzleId={puzzle.id} />
      <p className="muted text-sm">
        <Link href={routes.puzzles} className="link">
          ‹ Feladványok
        </Link>
      </p>
    </div>
  );
}
