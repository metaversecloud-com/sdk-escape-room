import { useContext, useMemo, useState } from "react";
import { content } from "@/constants";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";
import { PuzzleHeader } from "./PuzzleHeader";

const c = content.puzzles[1];

interface Room1Puzzle1Props {
  refreshGameState: () => Promise<void>;
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

export const Room1Puzzle1 = ({ refreshGameState }: Room1Puzzle1Props) => {
  const dispatch = useContext(GlobalDispatchContext);

  const [lights, setLights] = useState<PuzzleColor[]>(["OFF", "OFF", "OFF"]);
  const [localError, setLocalError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [wrongFlash, setWrongFlash] = useState(false);

  const sequenceText = useMemo(() => lights.join(" → "), [lights]);

  const handleCycleLight = (index: number) => {
    if (completed) return;
    setLocalError("");
    const updated = [...lights];
    updated[index] = nextColor(updated[index]);
    setLights(updated);
  };

  const handleSubmit = async () => {
    if (completed) return;
    setLocalError("");
    setWrongFlash(false);

    const isCorrect = CORRECT_SEQUENCE.every((c, i) => lights[i] === c);

    if (!isCorrect) {
      setLocalError(c.errors.wrongSequence);
      setWrongFlash(true);
      window.setTimeout(() => setWrongFlash(false), 600);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 1 });
      setGameState(dispatch, response.data);
      setCompleted(true);
      await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-4">
      <PuzzleHeader title={c.title} description={c.description} howToPlay={c.howToPlay} />

      <div
        className="p-4 rounded-2xl"
        style={{ background: "var(--er-bg-inner)", border: "1px solid var(--er-border-strong)" }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {lights.map((color, index) => {
            const styles = COLOR_STYLES[color];
            const borderColor = wrongFlash ? WRONG_FLASH_STYLES.border : styles.border;
            const shadow = wrongFlash ? WRONG_FLASH_STYLES.shadow : styles.shadow;
            const bg = wrongFlash ? WRONG_FLASH_STYLES.bg : styles.bg;
            return (
              <div key={index} className="flex flex-col items-center gap-2">
                <p className="p2 uppercase er-text-muted" style={{ letterSpacing: "0.06em" }}>
                  {c.controlLabelPrefix} {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => handleCycleLight(index)}
                  className="focus:outline-none cursor-pointer"
                  style={{
                    width: 140,
                    height: 70,
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
      </div>

      <p className="p2 text-center er-text-dim">
        {c.currentPrefix} {sequenceText}
      </p>

      {localError && <div className="er-puzzle-error">⚠️ {localError}</div>}

      <button className="er-puzzle-submit" onClick={handleSubmit} disabled={isSubmitting}>
        {c.submitLabel}
      </button>
    </div>
  );
};

export default Room1Puzzle1;
