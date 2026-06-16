import { useContext, useState } from "react";
import { content } from "@/constants";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import { PuzzleHeader } from "./PuzzleHeader";

const c = content.puzzles[7];
const hintCopy = content.ui.hints;

interface Room3Puzzle2Props {
  refreshGameState?: () => Promise<void>;
}

const EXPECTED_CODE = "7435";

const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export const Room3Puzzle2 = ({ refreshGameState }: Room3Puzzle2Props) => {
  const dispatch = useContext(GlobalDispatchContext);
  const [codeInput, setCodeInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = async () => {
    const code = codeInput.trim();
    if (!/^\d{4}$/.test(code)) {
      setFeedback(c.errors.invalidFormat);
      return;
    }
    if (code !== EXPECTED_CODE) {
      setFeedback(c.errors.wrongCode);
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

      <input
        id="final-code"
        className="w-full text-center text-2xl tracking-widest bg-black text-green-400 border border-zinc-600 rounded-lg py-2"
        style={{ textShadow: "0 0 8px rgba(34,197,94,0.7)" }}
        type="text"
        maxLength={4}
        value={codeInput}
        placeholder={c.placeholder}
        onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, "").slice(0, 4))}
      />

      <div className="my-2 grid grid-cols-3 gap-3 mx-auto">
        {KEYPAD_DIGITS.map((num) => (
          <button
            key={num}
            onClick={() => handleKeypadClick(num)}
            className="aspect-square w-full bg-zinc-700 hover:bg-zinc-600 text-white text-3xl font-bold rounded-xl shadow-md active:scale-95 transition"
          >
            {num}
          </button>
        ))}

        <button
          onClick={() => handleKeypadClick("clear")}
          className="aspect-square w-full bg-red-500 hover:bg-red-400 text-white text-lg font-bold rounded-xl"
        >
          {c.clearLabel}
        </button>
        <button
          onClick={() => handleKeypadClick("0")}
          className="aspect-square w-full bg-zinc-700 hover:bg-zinc-600 text-white text-3xl font-bold rounded-xl"
        >
          0
        </button>
        <button
          onClick={() => handleKeypadClick("delete")}
          className="aspect-square w-full bg-yellow-500 hover:bg-yellow-400 text-black text-lg font-bold rounded-xl"
        >
          {c.backspaceLabel}
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
