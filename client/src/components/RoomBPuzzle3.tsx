import { useEffect, useState } from "react";
import { backendAPI } from "../utils/backendAPI";

interface RoomBPuzzle3Props {
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

export const RoomBPuzzle3 = ({ onSuccess, sessionKey, refreshGameState }: RoomBPuzzle3Props) => {
  const [valveOrder, setValveOrder] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [unscrambledWords, setUnscrambledWords] = useState({ word1: "", word2: "", word3: "" });
  const [wordsUnscrambled, setWordsUnscrambled] = useState(false);
  const [valves, setValves] = useState<Valve[]>(VALVES_INITIAL);

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
    if (success || isSubmitting || !wordsUnscrambled) return;
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
      setError("The transmission words are not correctly unscrambled. Decode the scrambled message first!");
      return;
    }
    if (!isValveOrderCorrect()) {
      setError("The valve activation order is incorrect. Follow the system stabilization order!");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 5, sessionKey });
      if (response.data.success) {
        setSuccess(true);
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

  if (success) {
    return (
      <div className="er-success-card">
        <div className="er-success-icon" aria-hidden>
          🔓
        </div>
        <h2 style={{ color: "white" }}>Communications Stabilized!</h2>
        <div className="er-access-card-message">
          <h3>🎫 ACCESS CARD ACQUIRED! 🎫</h3>
          <p>Access card added to your inventory!</p>
          <div className="mt-3">
            <p className="er-text-muted" style={{ marginBottom: "0.5rem" }}>
              Partial Airlock Code Revealed:
            </p>
            <div className="er-code-display">7 _ 3 _</div>
          </div>
        </div>
        <p className="er-clue-text">Check your inventory to see the Access Card. Proceed to Room C!</p>
        <div className="er-signal-bars" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="er-signal-bar active" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="er-puzzle-frame">
      <div className="er-puzzle-header">
        <h2>🔐 Transmission Decode & Valve Order 🔐</h2>
        <p>Decode the scrambled transmission to reveal the system stabilization order.</p>
        <button className="er-hint-button" onClick={() => setShowHint(!showHint)} disabled={isSubmitting}>
          {showHint ? "Hide Hints" : "💡 Show Hints"}
        </button>
      </div>

      {showHint && !wordsUnscrambled && (
        <div className="er-hint-panel">
          <h4>📡 Transmission Decoding Hints:</h4>
          <ul>
            <li>
              <strong>EVLAV</strong> → Rearrange these letters to form a device that controls flow (5 letters)
            </li>
            <li>
              <strong>KLCO</strong> → Rearrange these letters to form something that secures a door (4 letters)
            </li>
            <li>
              <strong>EURSSPE</strong> → Rearrange these letters to form something that pushes or exerts force (8
              letters)
            </li>
          </ul>
        </div>
      )}

      <div className="er-transmission-section">
        <h3>📻 Scrambled Transmission</h3>
        <div className="er-scrambled-words">
          <div className="er-scrambled-word">{SCRAMBLED_WORDS.word1}</div>
          <div className="er-scrambled-word">{SCRAMBLED_WORDS.word2}</div>
          <div className="er-scrambled-word">{SCRAMBLED_WORDS.word3}</div>
        </div>
      </div>

      <div className="er-puzzle-section er-unscramble-section">
        <h3>🔍 Decoded Transmission</h3>
        <div className="er-unscramble-inputs">
          {(["word1", "word2", "word3"] as const).map((wordKey, idx) => {
            const maxLen = idx === 0 ? 6 : idx === 1 ? 5 : 9;
            return (
              <div className="er-input-group" key={wordKey}>
                <label>Word {idx + 1}:</label>
                <input
                  type="text"
                  value={unscrambledWords[wordKey]}
                  onChange={(e) => handleUnscrambleChange(wordKey, e.target.value)}
                  placeholder="Enter decoded word"
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
          <div className="er-puzzle-section er-stabilization-order">
            <h3>📋 System Stabilization Order</h3>
            <div className="er-order-letters">
              {SYSTEM_ORDER.map((item) => (
                <div key={item.step} className="er-order-letter-item">
                  <span className="er-order-step">{item.step}.</span>
                  <span className="er-order-letter">{item.letter}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="er-puzzle-section er-valves-section">
            <h3>🎛️ Valve Control Panel</h3>
            <p className="er-valve-instruction">
              Click valves in the correct order according to the system stabilization order above.
            </p>
            <div className="er-valves-grid">
              {valves.map((valve) => (
                <button
                  key={valve.color}
                  className={`er-valve-button ${valve.color.toLowerCase()} ${valveOrder.includes(valve.color) ? "activated" : ""}`}
                  onClick={() => handleValveClick(valve.color)}
                  disabled={valveOrder.includes(valve.color) || isSubmitting}
                >
                  <div className="er-valve-color" style={{ backgroundColor: valve.color.toLowerCase() }} />
                  <div className="er-valve-info">
                    <span className="er-valve-label">{valve.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="er-puzzle-section er-current-order">
            <h3>🔧 Current Valve Activation Order</h3>
            <div className="er-order-buttons">
              {valveOrder.length === 0 ? (
                <p className="er-empty-order">No valves activated yet. Click valves in the correct order!</p>
              ) : (
                valveOrder.map((valve, index) => (
                  <div key={index} className="er-order-badge">
                    <span className="er-order-number">{index + 1}</span>
                    <span>{valve}</span>
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
        <button className="er-puzzle-reset" onClick={handleReset} disabled={isSubmitting}>
          🔄 Reset All
        </button>
        <button className="er-puzzle-submit" onClick={handleSubmit} disabled={isSubmitting || !wordsUnscrambled}>
          {isSubmitting ? "Stabilizing..." : "✅ Stabilize Communications"}
        </button>
      </div>
    </div>
  );
};

export default RoomBPuzzle3;
