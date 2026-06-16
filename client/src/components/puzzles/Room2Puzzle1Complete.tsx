import { content } from "@/constants";
import { PuzzleCompleteCard } from "./PuzzleCompleteCard";

const c = content.puzzles[3].complete;

export const Room2Puzzle1Complete = () => (
  <PuzzleCompleteCard title={c.title}>
    <p className="p2 er-text">{c.body}</p>
    <div className="er-signal-bars" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="er-signal-bar active" />
      ))}
    </div>
  </PuzzleCompleteCard>
);

export default Room2Puzzle1Complete;
