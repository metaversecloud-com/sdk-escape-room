// client/src/components/RoomBPuzzle3.tsx
import React, { useState, useEffect } from 'react';
import { backendAPI } from '../utils/backendAPI';
import './RoomBPuzzle3.css';

interface RoomBPuzzle3Props {
  onSuccess?: () => void;
  sessionKey?: string;
  refreshGameState?: () => Promise<void>;
}

export const RoomBPuzzle3: React.FC<RoomBPuzzle3Props> = ({ 
  onSuccess, 
  sessionKey,
  refreshGameState 
}) => {
  const [valveOrder, setValveOrder] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [unscrambledWords, setUnscrambledWords] = useState({
    word1: "",
    word2: "",
    word3: ""
  });
  const [wordsUnscrambled, setWordsUnscrambled] = useState(false);

  // Scrambled words (passed from previous puzzle)
  const SCRAMBLED_WORDS = {
    word1: "EVLAV",
    word2: "KLCO", 
    word3: "EURSSPE"
  };

  // Correct unscrambled words
  const CORRECT_WORDS = {
    word1: "VALVE",
    word2: "LOCK",
    word3: "PRESSURE"
  };

  // System stabilization order (letters only)
  const SYSTEM_ORDER = [
    { letter: "L", fullName: "Lock System", step: 1 },
    { letter: "P", fullName: "Pressure System", step: 2 },
    { letter: "V", fullName: "Vent Valve", step: 3 }
  ];

  // Valve configuration (shuffled initially)
  const VALVES_INITIAL = [
    { color: "Blue", letter: "L", label: "Lock System" },
    { color: "Red", letter: "P", label: "Pressure System" },
    { color: "Yellow", letter: "V", label: "Vent Valve" }
  ];

  // Shuffle the valves array
  const shuffleArray = (array: any[]) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const [valves, setValves] = useState(VALVES_INITIAL);

  // Shuffle valves on component mount
  useEffect(() => {
    setValves(shuffleArray(VALVES_INITIAL));
  }, []);

  // Check if words are unscrambled correctly
  const areWordsCorrect = () => {
    return unscrambledWords.word1.toUpperCase() === CORRECT_WORDS.word1 &&
           unscrambledWords.word2.toUpperCase() === CORRECT_WORDS.word2 &&
           unscrambledWords.word3.toUpperCase() === CORRECT_WORDS.word3;
  };

  // Monitor word unscrambling
  useEffect(() => {
    if (areWordsCorrect() && !wordsUnscrambled) {
      setWordsUnscrambled(true);
      setError(null);
    }
  }, [unscrambledWords]);

  // Handle unscramble input changes
  const handleUnscrambleChange = (wordKey: string, value: string) => {
    setUnscrambledWords(prev => ({
      ...prev,
      [wordKey]: value.toUpperCase()
    }));
    if (error) setError(null);
  };

  // Handle valve click
  const handleValveClick = (valveColor: string) => {
    if (success || isSubmitting || !wordsUnscrambled) return;
    
    if (!valveOrder.includes(valveColor)) {
      const newOrder = [...valveOrder, valveColor];
      setValveOrder(newOrder);
      if (error) setError(null);
    }
  };

  // Remove valve from order
  const handleRemoveFromOrder = (index: number) => {
    const newOrder = [...valveOrder];
    newOrder.splice(index, 1);
    setValveOrder(newOrder);
  };

  // Reset everything
  const handleReset = () => {
    setValveOrder([]);
    setUnscrambledWords({ word1: "", word2: "", word3: "" });
    setWordsUnscrambled(false);
    setError(null);
    setShowHint(false);
    setValves(shuffleArray(VALVES_INITIAL));
  };

  // Check if valve order is correct
  const isValveOrderCorrect = () => {
    const correctOrder = ["Blue", "Red", "Yellow"];
    return valveOrder.length === 3 && 
      valveOrder.every((valve, index) => valve === correctOrder[index]);
  };

  // Submit the puzzle
  const handleSubmit = async () => {
    // Validate unscrambled words
    if (!areWordsCorrect()) {
      setError("The transmission words are not correctly unscrambled. Decode the scrambled message first!");
      return;
    }

    // Validate valve order
    if (!isValveOrderCorrect()) {
      setError("The valve activation order is incorrect. Follow the system stabilization order!");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await backendAPI.post('/submit-puzzle', {
        puzzleNumber: 5,
        sessionKey
      });

      if (response.data.success) {
        setSuccess(true);
        if (refreshGameState) {
          await refreshGameState();
        }
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(response.data.message || 'Failed to submit puzzle');
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Puzzle submission error:', err);
    }

    setIsSubmitting(false);
  };

  if (success) {
    return (
      <div className="valve-decode-success">
        <div className="success-animation">
          <div className="success-icon">🔓</div>
          <h2>Communications Stabilized!</h2>
          <div className="access-card-message">
            <h3>🎫 ACCESS CARD ACQUIRED! 🎫</h3>
            <p>Access card added to your inventory!</p>
            <div className="partial-code">
              <p>Partial Airlock Code Revealed:</p>
              <div className="code-display">7 _ 3 _</div>
            </div>
          </div>
          <p className="clue-text">Check your inventory to see the Access Card. Proceed to Room C!</p>
          <div className="signal-bars">
            <div className="signal-bar active"></div>
            <div className="signal-bar active"></div>
            <div className="signal-bar active"></div>
            <div className="signal-bar active"></div>
            <div className="signal-bar active"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="valve-decode-puzzle">
      <div className="puzzle-header">
        <h2>🔐 Transmission Decode & Valve Order 🔐</h2>
        <p>Decode the scrambled transmission to reveal the system stabilization order.</p>
        <button 
          className="hint-button"
          onClick={() => setShowHint(!showHint)}
          disabled={isSubmitting}
        >
          {showHint ? 'Hide Hints' : '💡 Show Hints'}
        </button>
      </div>

      {showHint && !wordsUnscrambled && (
        <div className="hint-panel">
          <h4>📡 Transmission Decoding Hints:</h4>
          <ul>
            <li><strong>EVLAV</strong> → Rearrange these letters to form a device that controls flow (5 letters)</li>
            <li><strong>KLCO</strong> → Rearrange these letters to form something that secures a door (4 letters)</li>
            <li><strong>EURSSPE</strong> → Rearrange these letters to form something that pushes or exerts force (8 letters)</li>
          </ul>
        </div>
      )}

      {/* Scrambled Transmission Section */}
      <div className="transmission-section">
        <h3>📻 Scrambled Transmission</h3>
        <div className="scrambled-words">
          <div className="scrambled-word">{SCRAMBLED_WORDS.word1}</div>
          <div className="scrambled-word">{SCRAMBLED_WORDS.word2}</div>
          <div className="scrambled-word">{SCRAMBLED_WORDS.word3}</div>
        </div>
      </div>

      {/* Unscramble Section */}
      <div className="unscramble-section">
        <h3>🔍 Decoded Transmission</h3>
        <div className="unscramble-inputs">
          <div className="input-group">
            <label>Word 1:</label>
            <input
              type="text"
              value={unscrambledWords.word1}
              onChange={(e) => handleUnscrambleChange('word1', e.target.value)}
              placeholder="Enter decoded word"
              className="unscramble-input"
              maxLength={6}
            />
            {unscrambledWords.word1 === CORRECT_WORDS.word1 && (
              <span className="correct-check">✓</span>
            )}
          </div>
          <div className="input-group">
            <label>Word 2:</label>
            <input
              type="text"
              value={unscrambledWords.word2}
              onChange={(e) => handleUnscrambleChange('word2', e.target.value)}
              placeholder="Enter decoded word"
              className="unscramble-input"
              maxLength={5}
            />
            {unscrambledWords.word2 === CORRECT_WORDS.word2 && (
              <span className="correct-check">✓</span>
            )}
          </div>
          <div className="input-group">
            <label>Word 3:</label>
            <input
              type="text"
              value={unscrambledWords.word3}
              onChange={(e) => handleUnscrambleChange('word3', e.target.value)}
              placeholder="Enter decoded word"
              className="unscramble-input"
              maxLength={9}
            />
            {unscrambledWords.word3 === CORRECT_WORDS.word3 && (
              <span className="correct-check">✓</span>
            )}
          </div>
        </div>
      </div>

      {/* System Stabilization Order - Only shown after words are unscrambled */}
      {wordsUnscrambled && (
        <>
          <div className="stabilization-order">
            <h3>📋 System Stabilization Order</h3>
            <div className="order-letters">
              {SYSTEM_ORDER.map((item) => (
                <div key={item.step} className="order-letter-item">
                  <span className="order-step">{item.step}.</span>
                  <span className="order-letter">{item.letter}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Valve Panel */}
          <div className="valves-section">
            <h3>🎛️ Valve Control Panel</h3>
            <p className="valve-instruction">Click valves in the correct order according to the system stabilization order above.</p>
            <div className="valves-grid">
              {valves.map((valve) => (
                <button
                  key={valve.color}
                  className={`valve-button ${valve.color.toLowerCase()} ${valveOrder.includes(valve.color) ? 'activated' : ''}`}
                  onClick={() => handleValveClick(valve.color)}
                  disabled={valveOrder.includes(valve.color) || isSubmitting}
                >
                  <div className="valve-color" style={{ backgroundColor: valve.color.toLowerCase() }}></div>
                  <div className="valve-info">
                    <span className="valve-label">{valve.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Current Order Display */}
          <div className="current-order">
            <h3>🔧 Current Valve Activation Order</h3>
            <div className="order-buttons">
              {valveOrder.length === 0 ? (
                <p className="empty-order">No valves activated yet. Click valves in the correct order!</p>
              ) : (
                valveOrder.map((valve, index) => (
                  <div key={index} className="order-badge">
                    <span className="order-number">{index + 1}</span>
                    <span className="order-valve">{valve}</span>
                    <button 
                      className="remove-button"
                      onClick={() => handleRemoveFromOrder(index)}
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      <div className="puzzle-actions">
        <button 
          className="reset-button"
          onClick={handleReset}
          disabled={isSubmitting}
        >
          🔄 Reset All
        </button>
        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={isSubmitting || !wordsUnscrambled}
        >
          {isSubmitting ? 'Stabilizing...' : '✅ Stabilize Communications'}
        </button>
      </div>
    </div>
  );
};

export default RoomBPuzzle3;