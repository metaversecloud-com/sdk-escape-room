import { useContext, useEffect, useRef, useState } from "react";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

interface RoomAPuzzle2Props {
  refreshGameState: () => Promise<void>;
}

const CORRECT_ORDER = [3, 1, 4, 2];
const TIME_LIMIT_SECONDS = 8;

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

    const updated = [...selectedOrder, switchNumber];
    setSelectedOrder(updated);

    if (updated.length === CORRECT_ORDER.length) {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setTimeLeft(null);

      const isCorrect = CORRECT_ORDER.every((v, i) => v === updated[i]);
      if (isCorrect) {
        setSuccessMessage("Correct sequence entered. Reactor primed.");
        void handleAutoSubmit();
      } else {
        resetPuzzle("Incorrect sequence. Switches have been reset.");
      }
    }
  };

  const handleAutoSubmit = async () => {
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
      <div
        className="card w-full"
        style={{ background: "linear-gradient(135deg, #0d1629 0%, #0a1120 100%)", borderColor: "#24304a" }}
      >
        <div className="card-details">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="card-title" style={{ color: "#f6b300", letterSpacing: "0.04em" }}>
                Reactor Switch Array
              </h3>
              <p className="p2" style={{ color: "#9babc7" }}>
                Reactor priming follows crew priority order. After all crew inputs, run the system check.
              </p>
              <p className="p2" style={{ color: "#9babc7" }}>
                Flip the breaker switches in the correct sequence before the system lockout.
              </p>
            </div>
            {timeLeft !== null && (
              <div
                className="px-3 py-2 rounded-lg"
                style={{ background: "rgba(255,199,95,0.12)", border: "1px solid #f6b300", color: "#f6b300", fontWeight: 700 }}
              >
                Time Left: {timeLeft}s
              </div>
            )}
          </div>

          <p className="p2 mt-3" style={{ color: "#c7d0e5" }}>
            Current Order: {selectedOrder.length ? selectedOrder.join(" → ") : "None"}
          </p>

          <div
            className="mt-4 rounded-2xl p-4"
            style={{
              background: "radial-gradient(120% 120% at 50% 20%, rgba(246,179,0,0.16), rgba(10,17,32,0.95))",
              border: "1px solid #2f3c58",
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 10px 22px rgba(0,0,0,0.35)",
            }}
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((switchNumber) => {
                const isSelected = selectedOrder.includes(switchNumber);
                return (
                  <button
                    key={switchNumber}
                    type="button"
                    onClick={() => handleSwitchClick(switchNumber)}
                    disabled={isSelected || isSubmitting}
                    className="focus:outline-none"
                    style={{
                      background: isSelected
                        ? "linear-gradient(180deg, #1f5ad7 0%, #1a4ebc 100%)"
                        : "linear-gradient(180deg, #151f33 0%, #0f1726 100%)",
                      border: `2px solid ${isSelected ? "#4d8dff" : "#2f3c58"}`,
                      borderRadius: "18px",
                      padding: "18px 12px",
                      color: "#e5edff",
                      boxShadow: isSelected
                        ? "0 10px 22px rgba(79,141,255,0.35)"
                        : "0 8px 18px rgba(0,0,0,0.35)",
                    }}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div
                        style={{
                          width: "38px",
                          height: "70px",
                          borderRadius: "10px",
                          background: "linear-gradient(180deg, #2d3344 0%, #151c2d 100%)",
                          border: "1px solid #455066",
                          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: "50%",
                            transform: "translateX(-50%)",
                            bottom: isSelected ? "8px" : "32px",
                            width: "26px",
                            height: "18px",
                            borderRadius: "6px",
                            background: isSelected
                              ? "linear-gradient(180deg, #65d08c 0%, #3ca766 100%)"
                              : "linear-gradient(180deg, #a0a7b7 0%, #7c8498 100%)",
                            boxShadow: isSelected
                              ? "0 0 12px rgba(101,208,140,0.6)"
                              : "0 0 8px rgba(124,132,152,0.4)",
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span style={{ color: "#f6b300", fontWeight: 700 }}>#{switchNumber}</span>
                        {isSelected && <span style={{ color: "#65d08c", fontWeight: 700 }}>Locked</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {localError && <p className="p2 mt-3" style={{ color: "#ff6b6b" }}>{localError}</p>}
          {successMessage && <p className="p2 mt-3" style={{ color: "#65d08c" }}>{successMessage}</p>}

          <div className="card-actions mt-5 flex-col sm:flex-row gap-3">
            <button className="btn btn-outline w-full sm:w-auto" onClick={() => resetPuzzle()} disabled={isSubmitting}>
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomAPuzzle2;
