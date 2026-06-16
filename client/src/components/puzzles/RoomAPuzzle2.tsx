import { useContext, useEffect, useRef, useState } from "react";
import { content } from "@/constants";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import { PuzzleHeader } from "./PuzzleHeader";

const c = content.puzzles[2];

interface RoomAPuzzle2Props {
  refreshGameState: () => Promise<void>;
}

const CORRECT_ORDER = [3, 1, 4, 2];
const TIME_LIMIT_SECONDS = 8;

const SWITCH_BASE_BG = "linear-gradient(180deg, #151f33 0%, #0f1726 100%)";
const SWITCH_SELECTED_BG = "linear-gradient(180deg, #1f5ad7 0%, #1a4ebc 100%)";
const TOGGLE_OFF_BG = "linear-gradient(180deg, #a0a7b7 0%, #7c8498 100%)";
const TOGGLE_ON_BG = "linear-gradient(180deg, #65d08c 0%, #3ca766 100%)";

export const RoomAPuzzle2 = ({ refreshGameState }: RoomAPuzzle2Props) => {
  const dispatch = useContext(GlobalDispatchContext);

  const [selectedOrder, setSelectedOrder] = useState<number[]>([]);
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const stopTimer = () => {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetPuzzle = (message = "") => {
    setSelectedOrder([]);
    setTimeLeft(null);
    setLocalError(message);
    setSuccessMessage("");
    stopTimer();
  };

  const startTimer = () => {
    setTimeLeft(TIME_LIMIT_SECONDS);
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          resetPuzzle(c.errors.timeExpired);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSwitchClick = (switchNumber: number) => {
    setLocalError("");
    setSuccessMessage("");

    if (selectedOrder.length === 0 && timeLeft === null) startTimer();
    if (selectedOrder.includes(switchNumber)) return;

    const updated = [...selectedOrder, switchNumber];
    setSelectedOrder(updated);

    if (updated.length === CORRECT_ORDER.length) {
      stopTimer();
      setTimeLeft(null);

      const isCorrect = CORRECT_ORDER.every((v, i) => v === updated[i]);
      if (isCorrect) {
        setSuccessMessage(c.messages.correctSequenceReady);
      } else {
        resetPuzzle(c.errors.incorrect);
      }
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 2 });
      setGameState(dispatch, response.data);
      const badges = response.data?.badgesAwarded as string[] | undefined;
      const owned = response.data?.badgesOwned as string[] | undefined;
      const failed = response.data?.badgesFailed as string[] | undefined;
      if (badges?.length) setSuccessMessage(c.messages.badgeAwardedTemplate.replace("{badge}", badges.join(", ")));
      else if (owned?.length)
        setSuccessMessage(c.messages.badgeAlreadyTemplate.replace("{badge}", owned.join(", ")));
      else if (failed?.length) setSuccessMessage(c.messages.badgeNotAwarded);
      else setSuccessMessage(c.messages.primedFallback);
      await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOrderCorrect = CORRECT_ORDER.every((v, i) => v === selectedOrder[i]);

  return (
    <div className="grid gap-4 w-full">
      <PuzzleHeader title={c.title} description={c.description} />

      {timeLeft !== null && (
        <div
          className="px-3 py-2 rounded-lg"
          style={{
            background: "rgba(255,199,95,0.12)",
            border: "1px solid var(--er-gold)",
            color: "var(--er-gold)",
            fontWeight: 700,
          }}
        >
          {c.timerPrefix} {timeLeft}s
        </div>
      )}

      <div
        className="rounded-2xl p-4"
        style={{
          background: "radial-gradient(120% 120% at 50% 20%, rgba(246,179,0,0.16), rgba(10,17,32,0.95))",
          border: "1px solid var(--er-border-strong)",
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
                  background: isSelected ? SWITCH_SELECTED_BG : SWITCH_BASE_BG,
                  border: `2px solid ${isSelected ? "#4d8dff" : "var(--er-border-strong)"}`,
                  borderRadius: 18,
                  padding: "18px 12px",
                  color: "#e5edff",
                  boxShadow: isSelected ? "0 10px 22px rgba(79,141,255,0.35)" : "0 8px 18px rgba(0,0,0,0.35)",
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <div
                    style={{
                      width: 38,
                      height: 70,
                      borderRadius: 10,
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
                        bottom: isSelected ? 8 : 32,
                        width: 26,
                        height: 18,
                        borderRadius: 6,
                        background: isSelected ? TOGGLE_ON_BG : TOGGLE_OFF_BG,
                        boxShadow: isSelected ? "0 0 12px rgba(101,208,140,0.6)" : "0 0 8px rgba(124,132,152,0.4)",
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ color: "var(--er-gold)", fontWeight: 700 }}>#{switchNumber}</span>
                    {isSelected && <span style={{ color: "var(--er-green)", fontWeight: 700 }}>{c.lockedLabel}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <p className="p2 text-center er-text-dim">
        {c.currentOrderLabel} {selectedOrder.length ? selectedOrder.join(" → ") : c.noneLabel}
      </p>

      {localError && <div className="er-puzzle-error">⚠️ {localError}</div>}

      {successMessage && <p className="p2 text-success">{successMessage}</p>}

      <button className="btn er-puzzle-reset" onClick={() => resetPuzzle()} disabled={isSubmitting}>
        {c.resetLabel}
      </button>
      <button
        className="er-puzzle-submit"
        onClick={handleSubmit}
        disabled={isSubmitting || selectedOrder.length !== CORRECT_ORDER.length || !isOrderCorrect}
      >
        {c.submitLabel}
      </button>
    </div>
  );
};

export default RoomAPuzzle2;
