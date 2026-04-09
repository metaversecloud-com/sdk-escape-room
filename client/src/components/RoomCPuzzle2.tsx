import { useContext, useState } from "react";
import { PageContainer } from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

interface RoomCPuzzle2Props {
  refreshGameState?: () => Promise<void>;
  isCompleted?: boolean;
}

const PARTIAL_CODE = "7 _ 3 _";
const EXPECTED_CODE = "7436";

export const RoomCPuzzle2 = ({ refreshGameState, isCompleted }: RoomCPuzzle2Props) => {
  const dispatch = useContext(GlobalDispatchContext);
  const [codeInput, setCodeInput] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isSolved, setIsSolved] = useState(isCompleted ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (isSolved) {
      return;
    }

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
      const response = await backendAPI.post("/submit-puzzle", {
        puzzleNumber: 7,
      });

      setGameState(dispatch, response.data);
      setFeedback("Correct code! Airlock escape sequence activated.");
      setIsSolved(true);
      if (refreshGameState) {
        await refreshGameState();
      }
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
      setFeedback("Unexpected error while submitting code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeypadClick = (digit: string) => {
    if (isSolved || isSubmitting) return;

    if (digit === "clear") {
      setCodeInput("");
    } else if (digit === "delete") {
      setCodeInput(prev => prev.slice(0, -1));
    } else {
      setCodeInput(prev => (prev + digit).slice(0, 4));
    }
  };

  return (
    <PageContainer headerText="Room C - Final Airlock Code" isLoading={false}>
      <div className="card w-full">
        <div className="card-details">
          <h2 className="h2">Final Airlock Code</h2>

          <div className="mt-4">
            <label htmlFor="final-code" className="label">Enter final 4-digit code</label>
            <input
              id="final-code"
              className="w-full text-center text-2xl tracking-widest bg-black text-green-400 border border-zinc-600 rounded-lg py-2"
                style={{ textShadow: "0 0 8px rgba(34,197,94,0.7)" }}
              type="text"
              maxLength={4}
              value={codeInput}
              placeholder={PARTIAL_CODE}
              onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ""); // only digits
                  setCodeInput(value.slice(0, 4));
                }}
              disabled={isSolved}
            />
          </div>

          <div className="card-actions mt-4">
            <button className="btn" onClick={handleSubmit} disabled={isSolved || isSubmitting}>
              {isSolved ? "Code Locked In" : "Submit Code"}
            </button>
          </div>

          {feedback && (
            <p className={`p1 ${isSolved ? "text-green-500" : "text-red-500"} mt-2`}>
              {feedback}
            </p>
          )}

        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 mx-auto">
          {[1,2,3,4,5,6,7,8,9].map(num => (
            <button
              key={num}
              onClick={() => handleKeypadClick(num.toString())}
              className="aspect-square w-full bg-zinc-700 hover:bg-zinc-600 text-white text-3xl font-bold rounded-xl shadow-md active:scale-95 transition"
              disabled={isSolved}
            >
              {num}
            </button>
          ))}

          {/* Clear */}
          <button
            onClick={() => handleKeypadClick("clear")}
            className="aspect-square w-full bg-red-500 hover:bg-red-400 text-white text-lg font-bold rounded-xl"
            disabled={isSolved}
          >
            C
          </button>

          {/* 0 */}
          <button
            onClick={() => handleKeypadClick("0")}
            className="aspect-square w-full bg-zinc-700 hover:bg-zinc-600 text-white text-3xl font-bold rounded-xl"
            disabled={isSolved}
          >
            0
          </button>

          {/* Delete */}
          <button
            onClick={() => handleKeypadClick("delete")}
            className="aspect-square w-full bg-yellow-500 hover:bg-yellow-400 text-black text-lg font-bold rounded-xl"
            disabled={isSolved}
          >
            ⌫
          </button>
        </div>
      </div>
    </PageContainer>
  );
};

export default RoomCPuzzle2;