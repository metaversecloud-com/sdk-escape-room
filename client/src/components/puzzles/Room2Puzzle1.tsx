import { useState } from "react";
import { content } from "@/constants";
import { backendAPI } from "@/utils/backendAPI";
import { reportWrongAttempt, useInitialPuzzleDraft, usePuzzleDraft } from "@/utils";
import { PuzzleHeader } from "./PuzzleHeader";

const c = content.puzzles[3];

interface Room2Puzzle1Props {
  onSuccess?: () => void;
  sessionKey?: string;
  refreshGameState?: () => Promise<void>;
}

interface Draft {
  alpha: number;
  beta: number;
  gamma: number;
}

const MIN_VALUE = 0;
const MAX_VALUE = 10;
const CORRECT_VALUES = { alpha: 7, beta: 7, gamma: 6 } as const;

type FieldName = "alpha" | "beta" | "gamma";

export const Room2Puzzle1 = ({ onSuccess, sessionKey, refreshGameState }: Room2Puzzle1Props) => {
  const savedDraft = useInitialPuzzleDraft<Draft>(3);
  const [alpha, setAlpha] = useState(savedDraft?.alpha ?? 0);
  const [beta, setBeta] = useState(savedDraft?.beta ?? 0);
  const [gamma, setGamma] = useState(savedDraft?.gamma ?? 0);
  usePuzzleDraft(3, { alpha, beta, gamma });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<{ [key: string]: string }>({});

  const setters: Record<FieldName, (n: number) => void> = { alpha: setAlpha, beta: setBeta, gamma: setGamma };
  const values: Record<FieldName, number> = { alpha, beta, gamma };

  const clearFieldError = (field: FieldName) => setInputError((prev) => ({ ...prev, [field]: "" }));

  const setValueWithValidation = (field: FieldName, value: number) => {
    clearFieldError(field);
    if (Number.isNaN(value)) {
      setInputError((prev) => ({ ...prev, [field]: c.errors.invalidNumber }));
      return;
    }
    if (value < MIN_VALUE || value > MAX_VALUE) {
      setInputError((prev) => ({
        ...prev,
        [field]: c.errors.outOfRangeTemplate.replace("{min}", String(MIN_VALUE)).replace("{max}", String(MAX_VALUE)),
      }));
      return;
    }
    setters[field](value);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    if (alpha === CORRECT_VALUES.alpha && beta === CORRECT_VALUES.beta && gamma === CORRECT_VALUES.gamma) {
      try {
        const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 3, alpha, beta, gamma, sessionKey });
        if (response.data.success) {
          if (refreshGameState) await refreshGameState();
          if (onSuccess) onSuccess();
        } else {
          setError(response.data.message || "Failed to submit puzzle");
        }
      } catch (err) {
        setError("Network error. Please try again.");
        console.error("Puzzle submission error:", err);
      }
    } else {
      setError(c.errors.wrongAlignment);
      reportWrongAttempt(3);
    }

    setIsSubmitting(false);
  };

  const handleReset = () => {
    setAlpha(0);
    setBeta(0);
    setGamma(0);
    setError(null);
    setInputError({});
  };

  const getStarDisplay = (value: number) => {
    const safe = Math.min(MAX_VALUE, Math.max(MIN_VALUE, value));
    return "★".repeat(safe) + "☆".repeat(MAX_VALUE - safe);
  };

  const renderControl = (field: FieldName, displayName: string) => {
    const value = values[field];
    return (
      <div className="er-control-group" key={field}>
        <label>
          <span className="er-satellite-name">{displayName}</span>
          <span className="er-satellite-value">{value}</span>
        </label>
        <div>
          <input
            type="range"
            min={MIN_VALUE}
            max={MAX_VALUE}
            step={1}
            value={value}
            onChange={(e) => setValueWithValidation(field, parseInt(e.target.value, 10))}
            className="er-slider"
          />
          <div className="er-star-display">{getStarDisplay(value)}</div>
        </div>
        {inputError[field] && <div className="er-input-error-message">{inputError[field]}</div>}
      </div>
    );
  };

  return (
    <div className="grid gap-4 w-full">
      <PuzzleHeader title={c.title} description={c.description} />

      <div className="grid gap-4">
        {renderControl("alpha", c.satelliteNames[0])}
        {renderControl("beta", c.satelliteNames[1])}
        {renderControl("gamma", c.satelliteNames[2])}
      </div>

      {error && <div className="er-puzzle-error">⚠️ {error}</div>}

      <div className="er-puzzle-actions">
        <button className="btn er-puzzle-reset" onClick={handleReset} disabled={isSubmitting}>
          {c.resetLabel}
        </button>
        <button className="btn er-puzzle-submit" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? c.submitBusyLabel : c.submitIdleLabel}
        </button>
      </div>
    </div>
  );
};

export default Room2Puzzle1;
