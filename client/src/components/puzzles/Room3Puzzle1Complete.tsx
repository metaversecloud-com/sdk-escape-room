import { content } from "@/constants";
import { PuzzleCompleteCard } from "./PuzzleCompleteCard";

const c = content.puzzles[6].complete;

export const Room3Puzzle1Complete = () => (
  <PuzzleCompleteCard title={c.title}>
    <p className="p2 er-text">{c.body}</p>
  </PuzzleCompleteCard>
);

export default Room3Puzzle1Complete;
