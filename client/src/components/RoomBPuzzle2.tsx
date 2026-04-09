import React, { useState, useEffect } from 'react';
import { backendAPI } from '../utils/backendAPI';
import './RoomBPuzzle2.css';

interface RoomBPuzzle2Props {
  onSuccess?: () => void;
  sessionKey?: string;
  refreshGameState?: () => Promise<void>;
}

interface PuzzlePiece {
  id: number;
  correctPosition: number;
  currentPosition: number;
  pieceText: string;
}

export const RoomBPuzzle2: React.FC<RoomBPuzzle2Props> = ({ 
  onSuccess, 
  sessionKey,
  refreshGameState 
}) => {
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showReconstructedMessage, setShowReconstructedMessage] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // The scrambled words that will be revealed when puzzle is solved
  const SCRAMBLED_WORDS = {
    word1: "EVLAV",
    word2: "KLCO",
    word3: "EURSSPE"
  };

  // Define the 9 pieces (3x3 grid) - each piece contains part of the message
  // When arranged correctly, they reveal the scrambled words
  const INITIAL_PIECES: PuzzlePiece[] = [
    { id: 0, correctPosition: 0, currentPosition: 0, pieceText: "EV" },
    { id: 1, correctPosition: 1, currentPosition: 1, pieceText: "LA" },
    { id: 2, correctPosition: 2, currentPosition: 2, pieceText: "V" },
    { id: 3, correctPosition: 3, currentPosition: 3, pieceText: "KL" },
    { id: 4, correctPosition: 4, currentPosition: 4, pieceText: "C" },
    { id: 5, correctPosition: 5, currentPosition: 5, pieceText: "O" },
    { id: 6, correctPosition: 6, currentPosition: 6, pieceText: "EUR" },
    { id: 7, correctPosition: 7, currentPosition: 7, pieceText: "SSR" },
    { id: 8, correctPosition: 8, currentPosition: 8, pieceText: "PE" }
  ];

  // Shuffle the pieces on initialization
  const shufflePieces = (piecesArray: PuzzlePiece[]) => {
    const shuffled = [...piecesArray];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    // Update current positions based on shuffled order
    return shuffled.map((piece, index) => ({
      ...piece,
      currentPosition: index
    }));
  };

  useEffect(() => {
    // Check if puzzle is already completed from saved state
    const checkPuzzleCompletion = async () => {
      try {
        const response = await backendAPI.get('/game-state');
        const visitorData = response.data?.visitorData;
        if (visitorData?.puzzlesCompleted?.[4]) {
          setSuccess(true);
          setShowReconstructedMessage(true);
        }
      } catch (err) {
        console.error('Error checking puzzle completion:', err);
      }
    };
    
    checkPuzzleCompletion();
    
    // Initialize the puzzle with shuffled pieces
    setPieces(shufflePieces(INITIAL_PIECES));
  }, []);

  // Check if the puzzle is solved
  const isPuzzleSolved = () => {
    return pieces.every(piece => piece.currentPosition === piece.correctPosition);
  };

  // Handle piece click
  const handlePieceClick = (clickedPosition: number) => {
    if (success || isSubmitting) return;

    if (selectedPiece === null) {
      // Select the piece
      setSelectedPiece(clickedPosition);
      setMessage(null);
    } else if (selectedPiece === clickedPosition) {
      // Deselect the same piece
      setSelectedPiece(null);
    } else {
      // Swap the selected piece with the clicked piece
      const newPieces = [...pieces];
      const piece1Index = newPieces.findIndex(p => p.currentPosition === selectedPiece);
      const piece2Index = newPieces.findIndex(p => p.currentPosition === clickedPosition);
      
      // Swap positions
      newPieces[piece1Index].currentPosition = clickedPosition;
      newPieces[piece2Index].currentPosition = selectedPiece;
      
      setPieces(newPieces);
      setSelectedPiece(null);
      
      // Check if puzzle is solved after swap
      if (newPieces.every(piece => piece.currentPosition === piece.correctPosition)) {
        setMessage("✅ The transmission is fully reconstructed! Click 'Submit' to decode the message.");
      }
    }
  };

  // Get piece at a specific grid position
  const getPieceAtPosition = (position: number) => {
    return pieces.find(piece => piece.currentPosition === position);
  };

  // Reset the puzzle
  const handleReset = () => {
    setPieces(shufflePieces(INITIAL_PIECES));
    setSelectedPiece(null);
    setError(null);
    setMessage(null);
  };

  // Submit the solved puzzle
  const handleSubmit = async () => {
    if (!isPuzzleSolved()) {
      setError("The transmission pieces are not in the correct order. Keep rearranging until the message forms correctly!");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await backendAPI.post('/submit-puzzle', {
        puzzleNumber: 4,
        sessionKey
      });

      if (response.data.success) {
        setSuccess(true);
        setShowReconstructedMessage(true);
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

  // Auto-solve hint (for testing/accessibility)
  const handleAutoSolve = () => {
    const solvedPieces = [...pieces].sort((a, b) => a.correctPosition - b.correctPosition);
    setPieces(solvedPieces);
    setSelectedPiece(null);
    setMessage("✅ The transmission is fully reconstructed! Click 'Submit' to decode the message.");
  };

  // if (success && showReconstructedMessage) {
  //   return (
  //     <div className="transmission-reconstruct-success">
  //       <div className="success-animation">
  //         <h2>Transmission Reconstructed!</h2>
  //         <div className="reconstructed-message">
  //           <h3>The torn fragments reveal a scrambled transmission:</h3>
  //           <div className="scrambled-output">
  //             <div className="scrambled-line">{SCRAMBLED_WORDS.word1}</div>
  //             <div className="scrambled-line">{SCRAMBLED_WORDS.word2}</div>
  //             <div className="scrambled-line">{SCRAMBLED_WORDS.word3}</div>
  //           </div>
  //           <p className="next-clue">These scrambled words hold the key to the next puzzle...</p>
  //         </div>
  //         <button 
  //           className="continue-button"
  //           onClick={() => {
  //             if (refreshGameState) refreshGameState();
  //           }}
  //         >
  //           Continue to Next Challenge →
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

  return (
    <div className="transmission-reconstruct-puzzle">
      <div className="puzzle-header">
        <h2>📄 Reconstruct the Transmission 📄</h2>
        <p>Piece together the torn fragments to reveal the hidden message.</p>
        <button 
          className="hint-button"
          onClick={handleAutoSolve}
          disabled={isSubmitting}
        >
          🔧 Auto-Solve (Test)
        </button>
      </div>

      <div className="puzzle-instructions">
        <p>🎯 <strong>How to Play:</strong> Click a paper fragment to select it, then click another fragment to swap their positions.</p>
        {selectedPiece !== null && (
          <p className="selected-indicator">📌 Selected fragment at position {selectedPiece + 1}</p>
        )}
        {message && (
          <div className="info-message">{message}</div>
        )}
      </div>

      <div className="paper-grid-container">
        <div className="grid-3x3 paper-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((position) => {
            const piece = getPieceAtPosition(position);
            return (
              <div
                key={position}
                className={`paper-cell ${selectedPiece === position ? 'selected' : ''} ${piece?.currentPosition === piece?.correctPosition ? 'correct-position' : ''}`}
                onClick={() => handlePieceClick(position)}
              >
                {piece && (
                  <div className="paper-piece">
                    <div className="paper-text">{piece.pieceText}</div>
                    <div className="paper-crease"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="progress-indicator">
        <p>Progress: {pieces.filter(p => p.currentPosition === p.correctPosition).length}/9 fragments in correct position</p>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${(pieces.filter(p => p.currentPosition === p.correctPosition).length / 9) * 100}%` }}
          />
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
          🔄 Shuffle Fragments
        </button>
        <button 
          className="submit-button"
          onClick={handleSubmit}
          disabled={isSubmitting || !isPuzzleSolved()}
        >
          {isSubmitting ? 'Reconstructing...' : '📜 Reconstruct Transmission'}
        </button>
      </div>
    </div>
  );
};

export default RoomBPuzzle2;