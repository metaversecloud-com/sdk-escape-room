import { useContext, useState } from "react";
import { content } from "@/constants";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import {
  backendAPI,
  reportWrongAttempt,
  setErrorMessage,
  setGameState,
  useInitialPuzzleDraft,
  usePuzzleDraft,
} from "@/utils";
import { PuzzleHeader } from "./PuzzleHeader";

const c = content.puzzles[7];
const hintCopy = content.ui.hints;

interface Room3Puzzle2Props {
  refreshGameState?: () => Promise<void>;
}

interface Draft {
  codeInput: string;
}

const EXPECTED_CODE = "3967";

const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Per-slot color hints. Each Key Item granted along the way is themed to one
 * of these — the player matches the marked digit on the item to its slot.
 * Order is left → right: blue, orange, green, pink.
 */
const SLOT_STYLES: Array<{ border: string; bg: string; text: string; glow: string }> = [
  { border: "#60a5fa", bg: "rgba(96,165,250,0.12)", text: "#bfdbfe", glow: "0 0 18px rgba(96,165,250,0.55)" },
  { border: "#fb923c", bg: "rgba(251,146,60,0.12)", text: "#fed7aa", glow: "0 0 18px rgba(251,146,60,0.55)" },
  { border: "#4ade80", bg: "rgba(74,222,128,0.12)", text: "#bbf7d0", glow: "0 0 18px rgba(74,222,128,0.55)" },
  { border: "#f472b6", bg: "rgba(244,114,182,0.12)", text: "#fbcfe8", glow: "0 0 18px rgba(244,114,182,0.55)" },
];

export const Room3Puzzle2 = ({ refreshGameState }: Room3Puzzle2Props) => {
  const dispatch = useContext(GlobalDispatchContext);
  const savedDraft = useInitialPuzzleDraft<Draft>(7);
  const [codeInput, setCodeInput] = useState(savedDraft?.codeInput ?? "");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  usePuzzleDraft(7, { codeInput });

  const handleSubmit = async () => {
    const code = codeInput.trim();
    if (!/^\d{4}$/.test(code)) {
      setFeedback(c.errors.invalidFormat);
      return;
    }
    if (code !== EXPECTED_CODE) {
      setFeedback(c.errors.wrongCode);
      reportWrongAttempt(7);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 7 });
      setGameState(dispatch, response.data);
      setFeedback(c.messages.success);
      if (refreshGameState) await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
      setFeedback(c.errors.unexpected);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeypadClick = (digit: string) => {
    if (isSubmitting) return;
    if (digit === "clear") setCodeInput("");
    else if (digit === "delete") setCodeInput((prev) => prev.slice(0, -1));
    else setCodeInput((prev) => (prev + digit).slice(0, 4));
  };

  return (
    <div className="grid gap-4 w-full">
      <PuzzleHeader title={c.title} description={c.description}>
        <button className="er-hint-button" onClick={() => setShowHint(!showHint)}>
          {showHint ? hintCopy.hide : hintCopy.show}
        </button>
      </PuzzleHeader>

      {showHint && (
        <div className="er-hint-panel">
          <p className="p2 er-text-muted">{c.hint}</p>
        </div>
      )}

      {/* Four color-coded slots. Each Key Item is themed to one color; the
          player matches the item's marked digit to its slot. */}
      <div className="flex justify-center gap-3 my-2" aria-label="Airlock code entry">
        {SLOT_STYLES.map((s, i) => {
          const digit = codeInput[i];
          return (
            <div
              key={i}
              className="flex items-center justify-center rounded-lg font-mono font-bold"
              style={{
                width: 64,
                height: 80,
                border: `2px solid ${s.border}`,
                background: s.bg,
                color: s.text,
                fontSize: "2.5rem",
                textShadow: digit ? s.glow : undefined,
                boxShadow: digit ? `inset 0 0 14px ${s.bg}` : undefined,
              }}
            >
              {digit ?? ""}
            </div>
          );
        })}
      </div>

            {/* Numeric keypad */}
      <div className="my-3 mx-auto grid w-full max-w-[330px] grid-cols-3 gap-3">
        {KEYPAD_DIGITS.map((num) => (
          <button
            key={num}
            onClick={() => handleKeypadClick(num)}
            disabled={isSubmitting}
            className="
              flex aspect-square w-full min-w-0
              items-center justify-center
              rounded-xl
              border border-slate-500/60
              bg-slate-800/90
              text-3xl font-bold text-white
              shadow-[0_4px_12px_rgba(0,0,0,0.35)]
              transition-all duration-150
              hover:border-blue-400
              hover:bg-blue-500/20
              hover:shadow-[0_0_15px_rgba(96,165,250,0.25)]
              active:scale-95
              active:bg-blue-500/30
              disabled:opacity-50
            "
          >
            {num}
          </button>
        ))}

        {/* Clear */}
        <button
          onClick={() => handleKeypadClick("clear")}
          disabled={isSubmitting}
          className="
            flex aspect-square w-full min-w-0
            items-center justify-center
            rounded-xl
            border border-red-400/50
            bg-red-500/10
            text-lg font-bold text-red-300
            transition-all duration-150
            hover:border-red-400
            hover:bg-red-500/25
            active:scale-95
            disabled:opacity-50
          "
        >
          CLEAR
        </button>

        {/* Zero */}
        <button
          onClick={() => handleKeypadClick("0")}
          disabled={isSubmitting}
          className="
            flex aspect-square w-full min-w-0
            items-center justify-center
            rounded-xl
            border border-slate-500/60
            bg-slate-800/90
            text-3xl font-bold text-white
            shadow-[0_4px_12px_rgba(0,0,0,0.35)]
            transition-all duration-150
            hover:border-blue-400
            hover:bg-blue-500/20
            hover:shadow-[0_0_15px_rgba(96,165,250,0.25)]
            active:scale-95
            disabled:opacity-50
          "
        >
          0
        </button>

        {/* Delete */}
        <button
          onClick={() => handleKeypadClick("delete")}
          disabled={isSubmitting}
          className="
            flex aspect-square w-full min-w-0
            items-center justify-center
            rounded-xl
            border border-amber-400/50
            bg-amber-500/10
            text-sm font-bold text-amber-300
            transition-all duration-150
            hover:border-amber-400
            hover:bg-amber-500/25
            active:scale-95
            disabled:opacity-50
          "
        >
          DELETE
        </button>
      </div>

      {feedback && <div className="er-puzzle-error">⚠️ {feedback}</div>}

      <button className="btn er-puzzle-submit" onClick={handleSubmit} disabled={isSubmitting}>
        {c.submitLabel}
      </button>
    </div>
  );
};

export default Room3Puzzle2;
