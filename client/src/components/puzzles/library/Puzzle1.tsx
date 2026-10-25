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
import { LibraryPuzzleHeader } from "./PuzzleHeader";

const c = content.libraryPuzzles[1];
const hintCopy = content.ui.hints;

interface LibraryPuzzleProps {
  isCompleted: boolean;
  isLoading: boolean;
  refreshGameState: () => Promise<void>;
}

interface Draft {
  codeInput: string;
}

const EXPECTED_CODE = "5864";
const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export const Puzzle1 = ({
  isCompleted,
  isLoading,
  refreshGameState,
}: LibraryPuzzleProps) => {
  const dispatch = useContext(GlobalDispatchContext);
  const savedDraft = useInitialPuzzleDraft<Draft>(1);

  const [codeInput, setCodeInput] = useState(
    savedDraft?.codeInput ?? ""
  );
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);

  usePuzzleDraft(1, { codeInput });

  const handleSubmit = async () => {
    if (isSubmitting || isCompleted || isLoading) return;

    const code = codeInput.trim();

    if (!/^\d{4}$/.test(code)) {
      setFeedback(c.errors.wrongSequence);
      return;
    }

    if (code !== EXPECTED_CODE) {
      setFeedback(c.errors.wrongSequence);
      reportWrongAttempt(1);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await backendAPI.post("/submit-puzzle", {
        puzzleNumber: 1,
      });

      setGameState(dispatch, response.data);
      await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
      setFeedback("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeypadClick = (digit: string) => {
    if (isSubmitting || isCompleted || isLoading) return;

    setFeedback("");

    if (digit === "clear") {
      setCodeInput("");
    } else if (digit === "delete") {
      setCodeInput((prev) => prev.slice(0, -1));
    } else {
      setCodeInput((prev) => (prev + digit).slice(0, 4));
    }
  };

  if (isCompleted) {
    return (
      <div className="card w-full">
        <div className="card-details">
          <h3 className="card-title">{c.title}</h3>
          <p className="p2 text-success" role="status">
            {c.complete.body}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="library-lock grid gap-4 w-full">
      <LibraryPuzzleHeader
        title={c.title}
        description={c.description}
      >
        <button
          className="er-hint-button"
          onClick={() => setShowHint(!showHint)}
        >
          {showHint ? hintCopy.hide : hintCopy.show}
        </button>
      </LibraryPuzzleHeader>

      {showHint && (
        <div className="er-hint-panel">
          <p className="p2 er-text-muted">{c.howToPlay}</p>
        </div>
      )}

      <div className="library-lock-panel">
        <div className="library-lock-heading">
          <span className="library-lock-ornament">✦</span>
          <span>ARCHIVE ACCESS</span>
          <span className="library-lock-ornament">✦</span>
        </div>

        <div className="library-lock-display">
          <div className="library-lock-label">
            ENTER ACCESS CODE
          </div>

          <div
            className="library-lock-digits"
            aria-label={`Code entered: ${codeInput.length} of 4 digits`}
            aria-live="polite"
          >
            {Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                className={`library-lock-digit ${
                  codeInput[i] ? "is-filled" : ""
                }`}
              >
                {codeInput[i] ?? "–"}
              </div>
            ))}
          </div>
        </div>

        <div className="library-lock-keypad">
          {KEYPAD_DIGITS.map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleKeypadClick(digit)}
              disabled={isLoading || isSubmitting}
              className="library-key"
              aria-label={`Enter ${digit}`}
            >
              {digit}
            </button>
          ))}

          <button
            type="button"
            onClick={() => handleKeypadClick("clear")}
            disabled={isLoading || isSubmitting}
            className="library-key library-key-action library-key-clear"
          >
            CLEAR
          </button>

          <button
            type="button"
            onClick={() => handleKeypadClick("0")}
            disabled={isLoading || isSubmitting}
            className="library-key"
            aria-label="Enter 0"
          >
            0
          </button>

          <button
            type="button"
            onClick={() => handleKeypadClick("delete")}
            disabled={isLoading || isSubmitting}
            className="library-key library-key-action library-key-delete"
            aria-label="Delete last digit"
          >
            ⌫
          </button>
        </div>

        {feedback && (
          <div
            className="er-puzzle-error"
            role="status"
            aria-live="polite"
          >
            {feedback}
          </div>
        )}

        <button
          type="button"
          className="library-lock-submit"
          onClick={handleSubmit}
          disabled={isLoading || isSubmitting}
        >
          {isSubmitting ? c.submittingLabel : c.submitLabel}
        </button>

        <div className="library-lock-footer">
          RESTRICTED COLLECTIONS · AUTHORIZED PERSONNEL ONLY
        </div>
      </div>
    </div>
  );
};

export default Puzzle1;