import { useContext, useEffect, useMemo, useState } from "react";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

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

const COLOR_STYLES: Record<
  PuzzleColor,
  { border: string; dot: string; text: string; bg: string; shadow: string }
> = {
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

    const isCorrect =
      lights[0] === CORRECT_SEQUENCE[0] &&
      lights[1] === CORRECT_SEQUENCE[1] &&
      lights[2] === CORRECT_SEQUENCE[2];

    if (!isCorrect) {
      setLocalError("That sequence is not correct. Try again.");
      setWrongFlash(true);
      setTimeout(() => setWrongFlash(false), 600);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await backendAPI.post("/submit-puzzle", {
        puzzleNumber: 1,
      });

      setGameState(dispatch, response.data);
      const badges = response.data?.badgesAwarded as string[] | undefined;
      const owned = response.data?.badgesOwned as string[] | undefined;
      const failed = response.data?.badgesFailed as string[] | undefined;
      const awardText = badges && badges.length ? ` Badge awarded: ${badges.join(", ")}.` : "";
      const ownedText = (!badges || !badges.length) && owned && owned.length
        ? ` Badge already earned: ${owned.join(", ")}.`
        : "";
      const failedText = failed && failed.length ? ` Badge could not be awarded (missing in inventory): ${failed.join(", ")}.` : "";
      setSuccessMessage(`Electrical cabinet unlocked. Fuse (74A1) secured in your inventory.${awardText}${ownedText}${failedText}`);
      setCompleted(true);
      setShowCongrats(true);
      setTimeout(() => setShowCongrats(false), 2000);
      await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="card w-full" style={{ background: "linear-gradient(135deg, #0d1629 0%, #0a1120 100%)", borderColor: "#24304a" }}>
        <div className="card-details">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h4 className="h4" style={{ color: "#f6b300", letterSpacing: "0.04em" }}>
                Power Console
              </h4>
              <p className="p2" style={{ color: "#9babc7" }}>
                Set the three dials to the correct color sequence. Use the crew and reference panels to determine the correct sequence.
              </p>
            </div>
          </div>
          <div
            className="mt-4 p-4 rounded-2xl"
            style={{ background: "rgba(23,33,52,0.75)", border: "1px solid #2f3c58" }}
          >
            {!completed ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {lights.map((color, index) => {
                    const styles = COLOR_STYLES[color];
                    const borderColor = wrongFlash ? "#ff5555" : styles.border;
                    const shadow = wrongFlash ? "0 10px 22px rgba(255,85,85,0.35)" : styles.shadow;
                    const bg = wrongFlash ? "linear-gradient(135deg, #2a0e0e 0%, #1a0a0a 100%)" : styles.bg;
                    return (
                      <div key={index} className="flex flex-col items-center gap-2">
                        <p className="p2 uppercase" style={{ color: "#c7d0e5", letterSpacing: "0.06em" }}>
                          Control {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => handleCycleLight(index)}
                          style={{
                            width: "140px",
                            height: "140px",
                            borderRadius: "18px",
                            border: `3px solid ${borderColor}`,
                            background: bg,
                            boxShadow: shadow,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "transform 120ms ease, box-shadow 120ms ease",
                          }}
                          className="focus:outline-none"
                        >
                          <span
                            style={{
                              width: "12px",
                              height: "12px",
                              borderRadius: "999px",
                              background: wrongFlash ? "#ff6b6b" : styles.dot,
                              boxShadow: wrongFlash ? "0 0 16px #ff6b6b" : `0 0 16px ${styles.dot}`,
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
                  <button
                    className="btn w-full"
                    style={{
                      background: "linear-gradient(135deg, #1f5ad7 0%, #1a4ebc 100%)",
                      borderColor: "#1f5ad7",
                      fontSize: "1rem",
                      paddingTop: "14px",
                      paddingBottom: "14px",
                      letterSpacing: "0.02em",
                      fontWeight: 700,
                    }}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    Submit Sequence
                  </button>
                  <p className="p2 text-center" style={{ color: "#9babc7" }}>
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
              border: "1px solid rgba(99, 211, 146, 0.65)",
              boxShadow: showCongrats
                ? "0 0 28px rgba(99,211,146,0.35), 0 16px 38px rgba(0,0,0,0.45)"
                : "0 12px 26px rgba(99,211,146,0.22)",
            }}
          >
            <div className="flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1">
                <p className="p2 uppercase" style={{ color: "#8cf0af", letterSpacing: "0.08em", marginBottom: 6 }}>
                  Power Bay Secure
                </p>
                <h4 className="h4" style={{ color: "#f6b300", letterSpacing: "0.04em" }}>
                  Electrical cabinet unlocked
                </h4>
                <p className="p2 mt-2" style={{ color: "#dbe8ff" }}>
                  Congratulations. Fuse (74A1) added to your inventory. Proceed to the next objective.
                </p>
                {successMessage && (
                  <p className="p2 mt-1" style={{ color: "#8cf0af" }}>
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

const FuseDisplay = () => (
  <div
    className="rounded-xl p-4 border"
    style={{
      background: "radial-gradient(circle at 40% 30%, rgba(108, 210, 255, 0.12), transparent 50%), rgba(14,24,44,0.9)",
      borderColor: "rgba(108, 240, 190, 0.45)",
      boxShadow: "0 10px 22px rgba(108, 240, 190, 0.18)",
    }}
  >
    <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="50" width="120" height="20" rx="6" fill="#c7d0e5" stroke="#8fa0bc" strokeWidth="3" />
      <rect x="40" y="42" width="80" height="36" rx="10" fill="#e7edf7" stroke="#9bb2d1" strokeWidth="3" />
      <rect x="55" y="46" width="50" height="28" rx="6" fill="#f8fbff" stroke="#c2d2e8" strokeWidth="2" />
      <path d="M60 60h8l8-8 8 16 8-8h8" stroke="#7c8aa8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="15" y="42" width="20" height="36" rx="8" fill="#d5deed" stroke="#9fb3ce" strokeWidth="3" />
      <rect x="125" y="42" width="20" height="36" rx="8" fill="#d5deed" stroke="#9fb3ce" strokeWidth="3" />
      <text x="80" y="105" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="800" fill="#f6b300">74A1</text>
    </svg>
  </div>
);

export default RoomAPuzzle1;
