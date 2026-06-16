import { content } from "@/constants";
import { PuzzleCompleteCard } from "./PuzzleCompleteCard";

const c = content.puzzles[6].complete;

export const RoomCPuzzle1Complete = () => (
  <PuzzleCompleteCard title={c.title}>
    <p className="p2 er-text">{c.body}</p>
  </PuzzleCompleteCard>
);

export default RoomCPuzzle1Complete;
