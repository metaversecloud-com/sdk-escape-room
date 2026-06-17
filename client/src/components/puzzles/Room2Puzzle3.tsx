import { useEffect, useState } from "react";
import { content } from "@/constants";
import { backendAPI } from "@/utils/backendAPI";
import { useInitialPuzzleDraft, usePuzzleDraft } from "@/utils";
import { PuzzleHeader } from "./PuzzleHeader";

interface Draft {
  valveOrder: string[];
  unscrambledWords: { word1: string; word2: string; word3: string };
  wordsUnscrambled: boolean;
}

const c = content.puzzles[5];
const hintCopy = content.ui.hints;

interface Room2Puzzle3Props {
  onSuccess?: () => void;
  sessionKey?: string;
  refreshGameState?: () => Promise<void>;
}

interface Valve {
  color: "Blue" | "Red" | "Yellow";
  letter: string;
  label: string;
}

const SCRAMBLED_WORDS = { word1: "EVLAV", word2: "KLCO", word3: "EURSSPE" } as const;
const CORRECT_WORDS = { word1: "VALVE", word2: "LOCK", word3: "PRESSURE" } as const;
const SYSTEM_ORDER = [
  { letter: "L", fullName: "Lock System", step: 1 },
  { letter: "P", fullName: "Pressure System", step: 2 },
  { letter: "V", fullName: "Vent Valve", step: 3 },
];
const VALVES_INITIAL: Valve[] = [
  { color: "Blue", letter: "L", label: "Lock System" },
  { color: "Red", letter: "P", label: "Pressure System" },
  { color: "Yellow", letter: "V", label: "Vent Valve" },
];
const CORRECT_VALVE_ORDER = ["Blue", "Red", "Yellow"];

const shuffle = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const Room2Puzzle3 = ({ onSuccess, sessionKey, refreshGameState }: Room2Puzzle3Props) => {
  const savedDraft = useInitialPuzzleDraft<Draft>(5);
  const [valveOrder, setValveOrder] = useState<string[]>(savedDraft?.valveOrder ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [unscrambledWords, setUnscrambledWords] = useState(
    savedDraft?.unscrambledWords ?? { word1: "", word2: "", word3: "" },
  );
  const [wordsUnscrambled, setWordsUnscrambled] = useState(savedDraft?.wordsUnscrambled ?? false);
  const [valves, setValves] = useState<Valve[]>(VALVES_INITIAL);

  usePuzzleDraft(5, { valveOrder, unscrambledWords, wordsUnscrambled });

  useEffect(() => {
    setValves(shuffle(VALVES_INITIAL));
  }, []);

  const areWordsCorrect = () =>
    unscrambledWords.word1.toUpperCase() === CORRECT_WORDS.word1 &&
    unscrambledWords.word2.toUpperCase() === CORRECT_WORDS.word2 &&
    unscrambledWords.word3.toUpperCase() === CORRECT_WORDS.word3;

  useEffect(() => {
    if (areWordsCorrect() && !wordsUnscrambled) {
      setWordsUnscrambled(true);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unscrambledWords]);

  const handleUnscrambleChange = (wordKey: keyof typeof unscrambledWords, value: string) => {
    setUnscrambledWords((prev) => ({ ...prev, [wordKey]: value.toUpperCase() }));
    if (error) setError(null);
  };

  const handleValveClick = (valveColor: string) => {
    if (isSubmitting || !wordsUnscrambled) return;
    if (!valveOrder.includes(valveColor)) {
      setValveOrder([...valveOrder, valveColor]);
      if (error) setError(null);
    }
  };

  const handleRemoveFromOrder = (index: number) => {
    setValveOrder((prev) => prev.filter((_, i) => i !== index));
  };

  const handleReset = () => {
    setValveOrder([]);
    setUnscrambledWords({ word1: "", word2: "", word3: "" });
    setWordsUnscrambled(false);
    setError(null);
    setShowHint(false);
    setValves(shuffle(VALVES_INITIAL));
  };

  const isValveOrderCorrect = () =>
    valveOrder.length === 3 && valveOrder.every((valve, index) => valve === CORRECT_VALVE_ORDER[index]);

  const handleSubmit = async () => {
    if (!areWordsCorrect()) {
      setError(c.errors.wordsNotDecoded);
      return;
    }
    if (!isValveOrderCorrect()) {
      setError(c.errors.wrongValveOrder);
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 5, sessionKey });
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
    setIsSubmitting(false);
  };

  return (
    <div className="grid gap-4 w-full">
      <PuzzleHeader title={c.title} description={c.description}>
        <button className="er-hint-button" onClick={() => setShowHint(!showHint)} disabled={isSubmitting}>
          {showHint ? hintCopy.hide : hintCopy.show}
        </button>
      </PuzzleHeader>

      {showHint && !wordsUnscrambled && (
        <div className="er-hint-panel">
          <h4>Transmission Decoding Hints:</h4>
          <ul>
            {c.hints.map((hint) => (
              <li className="p2" key={hint}>
                {hint}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="er-puzzle-section grid gap-3">
        <h3 className="er-text--red text-center">{c.sections.scrambled}</h3>
        <div className="er-scrambled-words">
          <div className="er-scrambled-word">{SCRAMBLED_WORDS.word1}</div>
          <div className="er-scrambled-word">{SCRAMBLED_WORDS.word2}</div>
          <div className="er-scrambled-word">{SCRAMBLED_WORDS.word3}</div>
        </div>
      </div>

      <div className="er-puzzle-section grid gap-3">
        <h3 className="er-text--green text-center">{c.sections.decoded}</h3>
        <div className="er-unscramble-inputs">
          {(["word1", "word2", "word3"] as const).map((wordKey, idx) => {
            const maxLen = idx === 0 ? 6 : idx === 1 ? 5 : 9;
            return (
              <div className="er-input-group p-2" key={wordKey}>
                <label>{c.wordInputLabels[idx]}</label>
                <input
                  type="text"
                  value={unscrambledWords[wordKey]}
                  onChange={(e) => handleUnscrambleChange(wordKey, e.target.value)}
                  placeholder={c.wordInputPlaceholder}
                  className="er-unscramble-input"
                  maxLength={maxLen}
                />
                {unscrambledWords[wordKey] === CORRECT_WORDS[wordKey] && <span className="er-correct-check">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {wordsUnscrambled && (
        <>
          <div className="er-puzzle-section grid gap-3">
            <h3 className="er-text--cyan text-center">{c.sections.stabilization}</h3>
            <div className="grid grid-cols-3 gap-3">
              {SYSTEM_ORDER.map((item) => (
                <div key={item.step} className="er-order-letter-item">
                  <span className="er-order-step">{item.step}.</span>
                  <span className="er-order-letter">{item.letter}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="er-puzzle-section grid gap-3">
            <h3 className="er-text--violet text-center">{c.sections.valves}</h3>
            <p className="er-clue-text">{c.valveInstructions}</p>
            <div className="er-valves-grid mt-2">
              {valves.map((valve) => (
                <button
                  key={valve.color}
                  className={`er-valve-button ${valve.color.toLowerCase()} ${valveOrder.includes(valve.color) ? "activated" : ""}`}
                  onClick={() => handleValveClick(valve.color)}
                  disabled={valveOrder.includes(valve.color) || isSubmitting}
                >
                  <div className="er-valve-color" style={{ backgroundColor: valve.color.toLowerCase() }} />
                  <div className="er-valve-info">
                    <span className="er-text">{valve.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="er-puzzle-section grid gap-3">
            <h3 className="er-text--gold text-center">{c.sections.valveOrder}</h3>
            <div className="er-order-buttons">
              {valveOrder.length === 0 ? (
                <p className="er-clue-text">{c.emptyOrderMessage}</p>
              ) : (
                valveOrder.map((valve, index) => (
                  <div key={index} className="er-order-badge">
                    <span className="er-order-number">{index + 1}</span>
                    <span className="er-text">{valve}</span>
                    <button className="er-remove-button" onClick={() => handleRemoveFromOrder(index)}>
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {error && <div className="er-puzzle-error">⚠️ {error}</div>}

      <div className="er-puzzle-actions">
        <button className="btn er-puzzle-reset" onClick={handleReset} disabled={isSubmitting}>
          {c.resetLabel}
        </button>
        <button className="btn er-puzzle-submit" onClick={handleSubmit} disabled={isSubmitting || !wordsUnscrambled}>
          {isSubmitting ? c.submitBusyLabel : c.submitIdleLabel}
        </button>
      </div>
    </div>
  );
};

export default Room2Puzzle3;
