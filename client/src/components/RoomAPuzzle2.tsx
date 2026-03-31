import { useContext, useEffect, useRef, useState } from "react";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

interface RoomAPuzzle2Props {
  refreshGameState: () => Promise<void>;
}

const CORRECT_ORDER = [3, 1, 4, 2];
const TIME_LIMIT_SECONDS = 10;

export const RoomAPuzzle2 = ({ refreshGameState }: RoomAPuzzle2Props) => {
  const dispatch = useContext(GlobalDispatchContext);

  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);

  const resetPuzzle = (message = "") => {
    setSelectedOrder([]);
    setTimeLeft(null);
    setLocalError(message);
    setSuccessMessage("");

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const startTimer = () => {
    setTimeLeft(TIME_LIMIT_SECONDS);

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          resetPuzzle("Time expired. The switches have been reset.");
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSwitchClick = (switchNumber: number) => {
    setLocalError("");
    setSuccessMessage("");

    if (selectedOrder.length === 0 && timeLeft === null) {
      startTimer();
    }

    if (selectedOrder.includes(switchNumber)) {
      return;
    }

    const nextIndex = selectedOrder.length;
    const expected = CORRECT_ORDER[nextIndex];

    if (switchNumber !== expected) {
      resetPuzzle("Wrong order. The switches have been reset.");
      return;
    }

    const updated = [...selectedOrder, switchNumber];
    setSelectedOrder(updated);

    if (updated.length === CORRECT_ORDER.length) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeLeft(null);
      setSuccessMessage("Correct sequence entered. Submit to complete Puzzle 2.");
    }
  };

  const handleSubmit = async () => {
    if (selectedOrder.length !== CORRECT_ORDER.length) {
      setLocalError("Complete the full correct sequence before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await backendAPI.post("/submit-puzzle", {
        puzzleNumber: 2,
      });

      setGameState(dispatch, response.data);
      await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="card w-full">
        <div className="card-details">
          <h3 className="card-title">Room A Puzzle 2: Reactor Switch Order</h3>
          <p className="card-description p2">
            Activate the reactor switches in the correct order before the timer expires.
          </p>
          <p className="p2 mt-2">
            Rule: reactor priming follows crew priority order, followed by a system check.
          </p>

          {timeLeft !== null && <p className="p2 mt-3">Time Left: {timeLeft}s</p>}
          <p className="p2 mt-2">
            Current Order: {selectedOrder.length ? selectedOrder.join(" → ") : "None"}
          </p>

          <div className="flex flex-wrap gap-3 mt-4">
            {[1, 2, 3, 4].map((switchNumber) => (
              <button
                key={switchNumber}
                className="btn btn-outline min-w-[110px]"
                type="button"
                onClick={() => handleSwitchClick(switchNumber)}
                disabled={selectedOrder.includes(switchNumber) || isSubmitting}
              >
                Switch {switchNumber}
              </button>
            ))}
          </div>

          {localError && <p className="p2 mt-3 text-red-600">{localError}</p>}
          {successMessage && <p className="p2 mt-3 text-green-700">{successMessage}</p>}

          <div className="card-actions mt-4">
            <button className="btn" onClick={handleSubmit} disabled={isSubmitting}>
              Submit Puzzle 2
            </button>
            <button className="btn btn-outline" onClick={() => resetPuzzle()} disabled={isSubmitting}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomAPuzzle2;