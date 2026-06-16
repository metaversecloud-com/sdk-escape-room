import { content } from "@/constants";
import { PuzzleCompleteCard } from "./PuzzleCompleteCard";

const c = content.puzzles[4].complete;

export const Room2Puzzle2Complete = () => (
  <PuzzleCompleteCard title={c.title}>
    <div className="er-reconstructed-message my-2 p-3 grid gap-3">
      <h4>{c.heading}</h4>
      <div className="er-scrambled-output my-2">
        {c.scrambled.map((line) => (
          <div key={line} className="er-scrambled-line">
            {line}
          </div>
        ))}
      </div>
    </div>
    <p className="er-next-clue">{c.teaser}</p>
  </PuzzleCompleteCard>
);

export default Room2Puzzle2Complete;
