import { useState } from "react";
import { backendAPI } from "@/utils/backendAPI";

interface RoomBPuzzle1Props {
  onSuccess?: () => void;
  sessionKey?: string;
  refreshGameState?: () => Promise<void>;
}

const MIN_VALUE = 0;
const MAX_VALUE = 10;
const CORRECT_VALUES = { alpha: 7, beta: 7, gamma: 6 } as const;

type FieldName = "alpha" | "beta" | "gamma";

export const RoomBPuzzle1 = ({ onSuccess, sessionKey, refreshGameState }: RoomBPuzzle1Props) => {
  const [alpha, setAlpha] = useState(0);
  const [beta, setBeta] = useState(0);
  const [gamma, setGamma] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<{ [key: string]: string }>({});

  const setters: Record<FieldName, (n: number) => void> = { alpha: setAlpha, beta: setBeta, gamma: setGamma };
  const values: Record<FieldName, number> = { alpha, beta, gamma };

  const clearFieldError = (field: FieldName) => setInputError((prev) => ({ ...prev, [field]: "" }));

  const setValueWithValidation = (field: FieldName, value: number) => {
    clearFieldError(field);
    if (Number.isNaN(value)) {
      setInputError((prev) => ({ ...prev, [field]: "Please enter a valid number" }));
      return;
    }
    if (value < MIN_VALUE || value > MAX_VALUE) {
      setInputError((prev) => ({ ...prev, [field]: `Value must be between ${MIN_VALUE} and ${MAX_VALUE}` }));
      return;
    }
    setters[field](value);
  };

  const handleInputChange = (field: FieldName) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      setInputError((prev) => ({ ...prev, [field]: "Please enter a value" }));
      return;
    }
    setValueWithValidation(field, parseInt(raw, 10));
  };

  const handleStep = (field: FieldName, delta: 1 | -1) => () => {
    const current = values[field];
    const next = current + delta;
    if (next < MIN_VALUE) {
      setInputError((prev) => ({ ...prev, [field]: `Minimum value is ${MIN_VALUE}` }));
      return;
    }
    if (next > MAX_VALUE) {
      setInputError((prev) => ({ ...prev, [field]: `Maximum value is ${MAX_VALUE}` }));
      return;
    }
    setters[field](next);
    clearFieldError(field);
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
      setError("Incorrect alignment. The satellites are not properly aligned.");
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
        <div className="er-numeric-controls">
          <button onClick={handleStep(field, -1)} disabled={value <= MIN_VALUE}>
            -
          </button>
          <input
            type="number"
            min={MIN_VALUE}
            max={MAX_VALUE}
            value={value}
            onChange={handleInputChange(field)}
            className="er-number-input"
          />
          <button onClick={handleStep(field, 1)} disabled={value >= MAX_VALUE}>
            +
          </button>
        </div>
        {inputError[field] && <div className="er-input-error-message">{inputError[field]}</div>}
      </div>
    );
  };

  return (
    <div className="grid gap-4 w-full">
      <div className="er-puzzle-header grid gap-2">
        <h2 className="er-title-gold">Satellite Alignment System</h2>
        <p className="p2 er-text">Align the communication satellites to restore the signal.</p>
      </div>

      <div className="grid gap-4">
        {renderControl("alpha", "Alpha Satellite")}
        {renderControl("beta", "Beta Satellite")}
        {renderControl("gamma", "Omega Satellite")}
      </div>

      {error && <div className="er-puzzle-error">⚠️ {error}</div>}

      <div className="er-puzzle-actions">
        <button className="btn er-puzzle-reset" onClick={handleReset} disabled={isSubmitting}>
          Reset
        </button>
        <button className="btn er-puzzle-submit" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Aligning..." : "Align Satellites"}
        </button>
      </div>
    </div>
  );
};

export default RoomBPuzzle1;
