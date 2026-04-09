// client/src/components/RoomBPuzzle1.tsx
import React, { useState } from 'react';
import { backendAPI } from '../utils/backendAPI';
import './RoomBPuzzle1.css';

interface RoomBPuzzle1Props {
  onSuccess?: () => void;
  sessionKey?: string;
  refreshGameState?: () => Promise<void>;
}

export const RoomBPuzzle1: React.FC<RoomBPuzzle1Props> = ({ 
  onSuccess, 
  sessionKey,
  refreshGameState 
}) => {
  const [alpha, setAlpha] = useState(0);
  const [beta, setBeta] = useState(0);
  const [gamma, setGamma] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputError, setInputError] = useState<{ [key: string]: string }>({});
  const [success, setSuccess] = useState(false);
  const [showHints, setShowHints] = useState(false);

  const MIN_VALUE = 0;
  const MAX_VALUE = 10;
  
  // Correct values
  const CORRECT_VALUES = {
    alpha: 7,
    beta: 7,
    gamma: 6 //named as omega station in the art
  };

  // Helper function to validate and update values
  const validateAndUpdate = (
    value: number, 
    setter: React.Dispatch<React.SetStateAction<number>>,
    fieldName: string
  ) => {
    setInputError(prev => ({ ...prev, [fieldName]: '' }));
    
    if (isNaN(value)) {
      setInputError(prev => ({ ...prev, [fieldName]: 'Please enter a valid number' }));
      return false;
    }
    
    if (value < MIN_VALUE || value > MAX_VALUE) {
      setInputError(prev => ({ ...prev, [fieldName]: `Value must be between ${MIN_VALUE} and ${MAX_VALUE}` }));
      return false;
    }
    
    setter(value);
    return true;
  };

  const handleAlphaChange = (value: number) => {
    validateAndUpdate(value, setAlpha, 'alpha');
  };

  const handleBetaChange = (value: number) => {
    validateAndUpdate(value, setBeta, 'beta');
  };

  const handleGammaChange = (value: number) => {
    validateAndUpdate(value, setGamma, 'gamma');
  };

  const handleAlphaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numValue = parseInt(rawValue);
    
    if (rawValue === '') {
      setInputError(prev => ({ ...prev, alpha: 'Please enter a value' }));
      return;
    }
    
    handleAlphaChange(numValue);
  };

  const handleBetaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numValue = parseInt(rawValue);
    
    if (rawValue === '') {
      setInputError(prev => ({ ...prev, beta: 'Please enter a value' }));
      return;
    }
    
    handleBetaChange(numValue);
  };

  const handleGammaInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const numValue = parseInt(rawValue);
    
    if (rawValue === '') {
      setInputError(prev => ({ ...prev, gamma: 'Please enter a value' }));
      return;
    }
    
    handleGammaChange(numValue);
  };

  const handleAlphaIncrement = () => {
    if (alpha < MAX_VALUE) {
      setAlpha(alpha + 1);
      setInputError(prev => ({ ...prev, alpha: '' }));
    } else {
      setInputError(prev => ({ ...prev, alpha: `Maximum value is ${MAX_VALUE}` }));
    }
  };

  const handleAlphaDecrement = () => {
    if (alpha > MIN_VALUE) {
      setAlpha(alpha - 1);
      setInputError(prev => ({ ...prev, alpha: '' }));
    } else {
      setInputError(prev => ({ ...prev, alpha: `Minimum value is ${MIN_VALUE}` }));
    }
  };

  const handleBetaIncrement = () => {
    if (beta < MAX_VALUE) {
      setBeta(beta + 1);
      setInputError(prev => ({ ...prev, beta: '' }));
    } else {
      setInputError(prev => ({ ...prev, beta: `Maximum value is ${MAX_VALUE}` }));
    }
  };

  const handleBetaDecrement = () => {
    if (beta > MIN_VALUE) {
      setBeta(beta - 1);
      setInputError(prev => ({ ...prev, beta: '' }));
    } else {
      setInputError(prev => ({ ...prev, beta: `Minimum value is ${MIN_VALUE}` }));
    }
  };

  const handleGammaIncrement = () => {
    if (gamma < MAX_VALUE) {
      setGamma(gamma + 1);
      setInputError(prev => ({ ...prev, gamma: '' }));
    } else {
      setInputError(prev => ({ ...prev, gamma: `Maximum value is ${MAX_VALUE}` }));
    }
  };

  const handleGammaDecrement = () => {
    if (gamma > MIN_VALUE) {
      setGamma(gamma - 1);
      setInputError(prev => ({ ...prev, gamma: '' }));
    } else {
      setInputError(prev => ({ ...prev, gamma: `Minimum value is ${MIN_VALUE}` }));
    }
  };

  const handleSubmit = async () => {
    let hasError = false;
    
    if (alpha < MIN_VALUE || alpha > MAX_VALUE) {
      setInputError(prev => ({ ...prev, alpha: `Alpha must be between ${MIN_VALUE} and ${MAX_VALUE}` }));
      hasError = true;
    }
    
    if (beta < MIN_VALUE || beta > MAX_VALUE) {
      setInputError(prev => ({ ...prev, beta: `Beta must be between ${MIN_VALUE} and ${MAX_VALUE}` }));
      hasError = true;
    }
    
    if (gamma < MIN_VALUE || gamma > MAX_VALUE) {
      setInputError(prev => ({ ...prev, gamma: `Gamma must be between ${MIN_VALUE} and ${MAX_VALUE}` }));
      hasError = true;
    }
    
    if (hasError) {
      setError('Please correct the values before submitting.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);

    if (alpha === CORRECT_VALUES.alpha && 
        beta === CORRECT_VALUES.beta && 
        gamma === CORRECT_VALUES.gamma) {
      
      try {
        const response = await backendAPI.post('/submit-puzzle', {
          puzzleNumber: 3,
          alpha, beta, gamma,
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
    } else {
      setError('Incorrect alignment. The satellites are not properly aligned.');
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
    const safeValue = Math.min(MAX_VALUE, Math.max(MIN_VALUE, value));
    return '★'.repeat(safeValue) + '☆'.repeat(MAX_VALUE - safeValue);
  };

  // if (success) {
  //   return (
  //     <div className="satellite-success">
  //       <div className="success-animation">
  //         <div className="satellite-icon">🛰️</div>
  //         <h2>Communication Signal Aligned!</h2>
  //         <p>The satellites are now in perfect alignment. Communication restored!</p>
  //         <div className="signal-bars">
  //           <div className="signal-bar active"></div>
  //           <div className="signal-bar active"></div>
  //           <div className="signal-bar active"></div>
  //           <div className="signal-bar active"></div>
  //           <div className="signal-bar active"></div>
  //         </div>
  //         <button 
  //           className="next-clue-button"
  //           onClick={() => {
  //             if (onSuccess) onSuccess();
  //           }}
  //         >
  //           View Next Clue →
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="satellite-alignment">
      <div className="puzzle-header">
        <h2>Satellite Alignment System</h2>
        <p>Align the communication satellites to restore the signal.</p>
        <button 
          className="hint-toggle"
          onClick={() => setShowHints(!showHints)}
        >
          {showHints ? 'Hide' : 'Show'} Constellation Reference
        </button>
      </div>

      {showHints && (
        <div className="constellation-reference">
          <h3>Constellation References</h3>
          <div className="constellation-grid">
            <div className="constellation-card">
              <h4>Alpha Station</h4>
              <div className="star-pattern">
                <div className="stars">★ ★ ★ ★ ☆</div>
                <div className="constellation-name">Ursa Major</div>
                <div className="star-count">Count the bright stars: 4</div>
              </div>
            </div>
            <div className="constellation-card">
              <h4>Beta Station</h4>
              <div className="star-pattern">
                <div className="stars">★ ★ ☆ ☆ ☆</div>
                <div className="constellation-name">Orion's Belt</div>
                <div className="star-count">Count the aligned stars: 2</div>
              </div>
            </div>
            <div className="constellation-card">
              <h4>Gamma Station</h4>
              <div className="star-pattern">
                <div className="stars">★ ★ ★ ★ ★</div>
                <div className="constellation-name">Pleiades</div>
                <div className="star-count">Count the cluster stars: 5</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="satellite-controls">
        {/* Alpha Satellite Control */}
        <div className="control-group">
          <label>
            <span className="satellite-name">Alpha Satellite</span>
            <span className="satellite-value">{alpha}</span>
          </label>
          <div className="slider-container">
            <input
              type="range"
              min={MIN_VALUE}
              max={MAX_VALUE}
              step="1"
              value={alpha}
              onChange={(e) => handleAlphaChange(parseInt(e.target.value))}
              className="slider"
            />
            <div className="star-display">{getStarDisplay(alpha)}</div>
          </div>
          <div className="numeric-controls">
            <button onClick={handleAlphaDecrement} disabled={alpha <= MIN_VALUE}>-</button>
            <input
              type="number"
              min={MIN_VALUE}
              max={MAX_VALUE}
              value={alpha}
              onChange={handleAlphaInputChange}
              className="number-input"
            />
            <button onClick={handleAlphaIncrement} disabled={alpha >= MAX_VALUE}>+</button>
          </div>
          {inputError.alpha && (
            <div className="input-error-message">{inputError.alpha}</div>
          )}
        </div>

        {/* Beta Satellite Control */}
        <div className="control-group">
          <label>
            <span className="satellite-name">Beta Satellite</span>
            <span className="satellite-value">{beta}</span>
          </label>
          <div className="slider-container">
            <input
              type="range"
              min={MIN_VALUE}
              max={MAX_VALUE}
              step="1"
              value={beta}
              onChange={(e) => handleBetaChange(parseInt(e.target.value))}
              className="slider"
            />
            <div className="star-display">{getStarDisplay(beta)}</div>
          </div>
          <div className="numeric-controls">
            <button onClick={handleBetaDecrement} disabled={beta <= MIN_VALUE}>-</button>
            <input
              type="number"
              min={MIN_VALUE}
              max={MAX_VALUE}
              value={beta}
              onChange={handleBetaInputChange}
              className="number-input"
            />
            <button onClick={handleBetaIncrement} disabled={beta >= MAX_VALUE}>+</button>
          </div>
          {inputError.beta && (
            <div className="input-error-message">{inputError.beta}</div>
          )}
        </div>

        {/* Gamma Satellite Control (using omega title in game to match art)*/}
        <div className="control-group">
          <label>
            <span className="satellite-name">Omega Satellite</span> 
            <span className="satellite-value">{gamma}</span>
          </label>
          <div className="slider-container">
            <input
              type="range"
              min={MIN_VALUE}
              max={MAX_VALUE}
              step="1"
              value={gamma}
              onChange={(e) => handleGammaChange(parseInt(e.target.value))}
              className="slider"
            />
            <div className="star-display">{getStarDisplay(gamma)}</div>
          </div>
          <div className="numeric-controls">
            <button onClick={handleGammaDecrement} disabled={gamma <= MIN_VALUE}>-</button>
            <input
              type="number"
              min={MIN_VALUE}
              max={MAX_VALUE}
              value={gamma}
              onChange={handleGammaInputChange}
              className="number-input"
            />
            <button onClick={handleGammaIncrement} disabled={gamma >= MAX_VALUE}>+</button>
          </div>
          {inputError.gamma && (
            <div className="input-error-message">{inputError.gamma}</div>
          )}
        </div>
      </div>

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
          Reset
        </button>
        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Aligning...' : 'Align Satellites'}
        </button>
      </div>
    </div>
  );
};

export default RoomBPuzzle1;