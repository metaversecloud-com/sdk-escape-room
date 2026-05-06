import { useContext, useEffect, useMemo, useState } from "react";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import { FuseDisplay } from "./inventoryArt";

interface RoomAPuzzle1Props {
  refreshGameState: () => Promise<void>;
  isCompleted?: boolean;
}

type PuzzleColor = "OFF" | "BLUE" | "RED" | "GREEN";

const COLOR_ORDER: PuzzleColor[] = ["OFF", "BLUE", "RED", "GREEN"];
const CORRECT_SEQUENCE: PuzzleColor[] = ["BLUE", "RED", "GREEN"];

const nextColor = (current: PuzzleColor): PuzzleColor => {
  const currentIndex = COLOR_ORDER.indexOf(current);
  const nextIndex = (currentIndex + 1) % COLOR_ORDER.length;
  return COLOR_ORDER[nextIndex];
};

// Per-color visual styles. Inline because the swatch colors are dynamic per-button.
const COLOR_STYLES: Record<PuzzleColor, { border: string; dot: string; text: string; bg: string; shadow: string }> = {
  OFF: {
    border: "#6c7385",
    dot: "#7c8498",
    text: "#a6adbf",
    bg: "linear-gradient(135deg, #1c2333 0%, #111827 100%)",
    shadow: "0 8px 18px rgba(0,0,0,0.35)",
  },
  BLUE: {
    border: "#5fa8ff",
    dot: "#6bb2ff",
    text: "#8dc4ff",
    bg: "linear-gradient(135deg, #102445 0%, #0c1833 100%)",
    shadow: "0 10px 22px rgba(95,168,255,0.25)",
  },
  RED: {
    border: "#ff7b7b",
    dot: "#ff8f8f",
    text: "#ff9c9c",
    bg: "linear-gradient(135deg, #3a0f16 0%, #240a0f 100%)",
    shadow: "0 10px 22px rgba(255,123,123,0.25)",
  },
  GREEN: {
    border: "#65d08c",
    dot: "#73e09b",
    text: "#8cf0af",
    bg: "linear-gradient(135deg, #123224 0%, #0d241a 100%)",
    shadow: "0 10px 22px rgba(101,208,140,0.25)",
  },
};

const WRONG_FLASH_STYLES = {
  border: "#ff5555",
  shadow: "0 10px 22px rgba(255,85,85,0.35)",
  bg: "linear-gradient(135deg, #2a0e0e 0%, #1a0a0a 100%)",
  dot: "#ff6b6b",
  dotShadow: "0 0 16px #ff6b6b",
};

export const RoomAPuzzle1 = ({ refreshGameState, isCompleted }: RoomAPuzzle1Props) => {
  const dispatch = useContext(GlobalDispatchContext);

  const [lights, setLights] = useState<PuzzleColor[]>(["OFF", "OFF", "OFF"]);
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [showCongrats, setShowCongrats] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const sequenceText = useMemo(() => lights.join(" → "), [lights]);

  useEffect(() => {
    if (isCompleted) {
      setCompleted(true);
      setSuccessMessage("Power console already restored.");
    }
  }, [isCompleted]);

  const handleCycleLight = (index: number) => {
    if (completed) return;
    setLocalError("");
    setSuccessMessage("");
    const updated = [...lights];
    updated[index] = nextColor(updated[index]);
    setLights(updated);
  };

  const handleSubmit = async () => {
    if (completed) return;
    setLocalError("");
    setSuccessMessage("");
    setWrongFlash(false);

    const isCorrect = CORRECT_SEQUENCE.every((c, i) => lights[i] === c);

    if (!isCorrect) {
      setLocalError("That sequence is not correct. Try again.");
      setWrongFlash(true);
      window.setTimeout(() => setWrongFlash(false), 600);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 1 });
      setGameState(dispatch, response.data);
      const badges = response.data?.badgesAwarded as string[] | undefined;
      const owned = response.data?.badgesOwned as string[] | undefined;
      const failed = response.data?.badgesFailed as string[] | undefined;
      const awardText = badges?.length ? ` Badge awarded: ${badges.join(", ")}.` : "";
      const ownedText = !badges?.length && owned?.length ? ` Badge already earned: ${owned.join(", ")}.` : "";
      const failedText = failed?.length
        ? ` Badge could not be awarded (missing in inventory): ${failed.join(", ")}.`
        : "";
      setSuccessMessage(
        `Electrical cabinet unlocked. Fuse (74A1) secured in your inventory.${awardText}${ownedText}${failedText}`,
      );
      setCompleted(true);
      setShowCongrats(true);
      window.setTimeout(() => setShowCongrats(false), 2000);
      await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="card w-full er-card er-card--flat">
        <div className="card-details">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="h4 er-title-gold">Power Console</h4>
              <p className="p2 er-text-dim">
                Set the three dials to the correct color sequence. Use the crew and reference panels to determine the
                correct sequence.
              </p>
            </div>
          </div>
          <div
            className="mt-4 p-4 rounded-2xl"
            style={{ background: "var(--er-bg-inner)", border: "1px solid var(--er-border-strong)" }}
          >
            {!completed ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lights.map((color, index) => {
                    const styles = COLOR_STYLES[color];
                    const borderColor = wrongFlash ? WRONG_FLASH_STYLES.border : styles.border;
                    const shadow = wrongFlash ? WRONG_FLASH_STYLES.shadow : styles.shadow;
                    const bg = wrongFlash ? WRONG_FLASH_STYLES.bg : styles.bg;
                    return (
                      <div key={index} className="flex flex-col items-center gap-2">
                        <p className="p2 uppercase er-text-muted" style={{ letterSpacing: "0.06em" }}>
                          Control {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCycleLight(index)}
                          className="focus:outline-none"
                          style={{
                            width: 140,
                            height: 140,
                            borderRadius: 18,
                            border: `3px solid ${borderColor}`,
                            background: bg,
                            boxShadow: shadow,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "transform 120ms ease, box-shadow 120ms ease",
                          }}
                        >
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 999,
                              background: wrongFlash ? WRONG_FLASH_STYLES.dot : styles.dot,
                              boxShadow: wrongFlash ? WRONG_FLASH_STYLES.dotShadow : `0 0 16px ${styles.dot}`,
                            }}
                          />
                        </button>
                        <p className="p2 uppercase" style={{ color: styles.text, fontWeight: 700 }}>
                          {color}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <button className="btn er-btn-primary w-full" onClick={handleSubmit} disabled={isSubmitting}>
                    Submit Sequence
                  </button>
                  <p className="p2 text-center er-text-dim">
                    Click each control to cycle through available colors. Current: {sequenceText}
                  </p>
                </div>

                {localError && <p className="p2 mt-2 text-red-500">{localError}</p>}
                {successMessage && <p className="p2 mt-2 text-green-500">{successMessage}</p>}
              </>
            ) : (
              <div
                className="rounded-2xl p-6 mt-4"
                style={{
                  background: "linear-gradient(135deg, #0f1f34 0%, #0c182b 100%)",
                  border: "1px solid var(--er-border-green)",
                  boxShadow: showCongrats
                    ? "0 0 28px rgba(99,211,146,0.35), 0 16px 38px rgba(0,0,0,0.45)"
                    : "0 12px 26px rgba(99,211,146,0.22)",
                }}
              >
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <div className="flex-1">
                    <p className="p2 er-eyebrow er-eyebrow--green" style={{ marginBottom: 6 }}>
                      Power Bay Secure
                    </p>
                    <h4 className="h4 er-title-gold">Electrical cabinet unlocked</h4>
                    <p className="p2 mt-2 er-text">
                      Congratulations. Fuse (74A1) added to your inventory. Proceed to the next objective.
                    </p>
                    {successMessage && (
                      <p className="p2 mt-1" style={{ color: "var(--er-green-soft)" }}>
                        {successMessage}
                      </p>
                    )}
                  </div>
                  <div style={{ minWidth: 180 }} className="flex justify-center">
                    <FuseDisplay />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomAPuzzle1;
