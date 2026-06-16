import { content } from "@/constants";
import { PuzzleCompleteCard } from "./PuzzleCompleteCard";

const c = content.puzzles[5].complete;

export const RoomBPuzzle3Complete = () => (
  <PuzzleCompleteCard title={c.title}>
    <div className="er-reconstructed-message my-2 p-3 grid gap-3">
      <h4>{c.heading}</h4>
      <p className="p2 er-text-dim">{c.itemNotification}</p>
      <p className="er-text-muted">{c.codeLabel}</p>
      <div className="er-code-display">{c.codeDisplay}</div>
    </div>
    <p className="er-next-clue">{c.teaser}</p>
  </PuzzleCompleteCard>
);

export default RoomBPuzzle3Complete;
