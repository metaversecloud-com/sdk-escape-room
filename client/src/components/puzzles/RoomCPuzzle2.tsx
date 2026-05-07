import { useContext, useState } from "react";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

interface RoomCPuzzle2Props {
  refreshGameState?: () => Promise<void>;
}

const PARTIAL_CODE = "7 _ 3 _";
const EXPECTED_CODE = "7436";
const HINT_TEXT =
  "Check your inventory items. Each item holds a few digits — use the digit from the same place value in both items to fill the blanks.";

const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export const RoomCPuzzle2 = ({ refreshGameState }: RoomCPuzzle2Props) => {
  const dispatch = useContext(GlobalDispatchContext);
  const [codeInput, setCodeInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const handleSubmit = async () => {
    const code = codeInput.trim();
    if (!/^\d{4}$/.test(code)) {
      setFeedback("Enter a 4-digit code (numbers only).");
      return;
    }
    if (code !== EXPECTED_CODE) {
      setFeedback("Incorrect code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 7 });
      setGameState(dispatch, response.data);
      setFeedback("Correct code! Airlock escape sequence activated.");
      if (refreshGameState) await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
      setFeedback("Unexpected error while submitting code.");
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
    <div className="er-puzzle-frame grid gap-4">
      <div className="er-puzzle-header grid gap-2">
        <h2 className="er-title-gold">Final Airlock Code</h2>
        <p className="p2 er-text">Enter final 4-digit code</p>
        <button className="er-hint-button" onClick={() => setShowHint(!showHint)} disabled={isSubmitting}>
          {showHint ? "Hide Hints" : "💡 Show Hints"}
        </button>
      </div>

      {showHint && (
        <div className="er-hint-panel">
          <p className="p2 er-text-muted">{HINT_TEXT}</p>
        </div>
      )}

      <input
        id="final-code"
        className="w-full text-center text-2xl tracking-widest bg-black text-green-400 border border-zinc-600 rounded-lg py-2"
        style={{ textShadow: "0 0 8px rgba(34,197,94,0.7)" }}
        type="text"
        maxLength={4}
        value={codeInput}
        placeholder={PARTIAL_CODE}
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
          C
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
          ⌫
        </button>
      </div>

      {feedback && <div className="er-puzzle-error">⚠️ {feedback}</div>}

      <button className="btn er-puzzle-submit" onClick={handleSubmit} disabled={isSubmitting}>
        Submit Code
      </button>
    </div>
  );
};

export default RoomCPuzzle2;
