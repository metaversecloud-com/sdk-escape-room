import { useEffect, useState } from "react";
import { backendAPI } from "../utils/backendAPI";

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
  isLocked: boolean;
}

const INITIAL_PIECES: PuzzlePiece[] = [
  { id: 0, correctPosition: 0, currentPosition: 0, pieceText: "EV", isLocked: false },
  { id: 1, correctPosition: 1, currentPosition: 1, pieceText: "LA", isLocked: false },
  { id: 2, correctPosition: 2, currentPosition: 2, pieceText: "V", isLocked: false },
  { id: 3, correctPosition: 3, currentPosition: 3, pieceText: "KL", isLocked: false },
  { id: 4, correctPosition: 4, currentPosition: 4, pieceText: "C", isLocked: false },
  { id: 5, correctPosition: 5, currentPosition: 5, pieceText: "O", isLocked: false },
  { id: 6, correctPosition: 6, currentPosition: 6, pieceText: "EUR", isLocked: false },
  { id: 7, correctPosition: 7, currentPosition: 7, pieceText: "SSR", isLocked: false },
  { id: 8, correctPosition: 8, currentPosition: 8, pieceText: "PE", isLocked: false },
];

const shufflePieces = (pieces: PuzzlePiece[]): PuzzlePiece[] => {
  const shuffled = [...pieces];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map((piece, index) => ({ ...piece, currentPosition: index, isLocked: false }));
};

const updateLockedStatus = (pieces: PuzzlePiece[]) =>
  pieces.map((piece) => ({ ...piece, isLocked: piece.currentPosition === piece.correctPosition }));

export const RoomBPuzzle2 = ({ onSuccess, sessionKey, refreshGameState }: RoomBPuzzle2Props) => {
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const checkPuzzleCompletion = async () => {
      try {
        const response = await backendAPI.get("/game-state");
        if (response.data?.visitorData?.puzzlesCompleted?.[4]) setSuccess(true);
      } catch (err) {
        console.error("Error checking puzzle completion:", err);
      }
    };
    checkPuzzleCompletion();
    setPieces(updateLockedStatus(shufflePieces(INITIAL_PIECES)));
  }, []);

  const isPuzzleSolved = () => pieces.every((piece) => piece.isLocked);

  const handlePieceClick = (clickedPosition: number) => {
    if (success || isSubmitting) return;
    const clickedPiece = pieces.find((p) => p.currentPosition === clickedPosition);
    if (clickedPiece?.isLocked) {
      setSelectedPiece(null);
      return;
    }

    if (selectedPiece === null) {
      setSelectedPiece(clickedPosition);
      setMessage(null);
      return;
    }
    if (selectedPiece === clickedPosition) {
      setSelectedPiece(null);
      return;
    }

    const targetPiece = pieces.find((p) => p.currentPosition === clickedPosition);
    if (targetPiece?.isLocked) {
      setMessage("🔒 Cannot swap with a locked fragment!");
      setSelectedPiece(null);
      return;
    }

    const newPieces = [...pieces];
    const piece1Index = newPieces.findIndex((p) => p.currentPosition === selectedPiece);
    const piece2Index = newPieces.findIndex((p) => p.currentPosition === clickedPosition);
    newPieces[piece1Index].currentPosition = clickedPosition;
    newPieces[piece2Index].currentPosition = selectedPiece;
    const updated = updateLockedStatus(newPieces);
    setPieces(updated);
    setSelectedPiece(null);

    if (updated.every((piece) => piece.isLocked)) {
      setMessage("✅ All fragments are in their correct positions! Click 'Submit' to decode the message.");
    }
  };

  const getPieceAtPosition = (position: number) => pieces.find((piece) => piece.currentPosition === position);

  const handleReset = () => {
    setPieces(updateLockedStatus(shufflePieces(INITIAL_PIECES)));
    setSelectedPiece(null);
    setError(null);
    setMessage(null);
  };

  const handleSubmit = async () => {
    if (!isPuzzleSolved()) {
      setError(
        "Not all fragments are in their correct positions! Keep rearranging until all fragments lock into place.",
      );
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 4, sessionKey });
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

  const lockedCount = pieces.filter((p) => p.isLocked).length;

  return (
    <div className="er-puzzle-frame">
      <div className="er-puzzle-header">
        <h2>📄 Reconstruct the Transmission 📄</h2>
        <p>Piece together the torn fragments to reveal the hidden message.</p>
      </div>

      <div className="er-puzzle-instructions">
        <p>
          🎯 <strong>How to Play:</strong> Click a fragment to select it, then click another fragment to swap their
          positions.
        </p>
        <p>Correctly placed fragments will show a 🔒 icon and cannot be moved further.</p>
        {message && <div className="er-puzzle-info">{message}</div>}
      </div>

      <div className="er-paper-grid-container">
        <div className="er-paper-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((position) => {
            const piece = getPieceAtPosition(position);
            const isLocked = piece?.isLocked || false;
            const cellClass = `er-paper-cell ${selectedPiece === position ? "selected" : ""} ${isLocked ? "locked" : ""}`;
            return (
              <div key={position} className={cellClass} onClick={() => handlePieceClick(position)}>
                {piece && (
                  <div className="er-paper-piece">
                    <div className="er-paper-text">{piece.pieceText}</div>
                    {isLocked && <div className="er-locked-icon">🔒</div>}
                    <div className="er-paper-crease" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="er-progress-indicator">
        <p>Progress: {lockedCount}/9 fragments correctly placed</p>
        <div className="er-progress-bar">
          <div className="er-progress-fill" style={{ width: `${(lockedCount / 9) * 100}%` }} />
        </div>
      </div>

      {error && <div className="er-puzzle-error">⚠️ {error}</div>}

      <div className="er-puzzle-actions">
        <button className="er-puzzle-reset" onClick={handleReset} disabled={isSubmitting}>
          🔄 Shuffle Fragments
        </button>
        <button className="er-puzzle-submit" onClick={handleSubmit} disabled={isSubmitting || !isPuzzleSolved()}>
          {isSubmitting ? "Reconstructing..." : "📜 Reconstruct Transmission"}
        </button>
      </div>
    </div>
  );
};

export default RoomBPuzzle2;
