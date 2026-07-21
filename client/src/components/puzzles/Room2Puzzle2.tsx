import { useContext, useEffect, useState } from "react";
import { content } from "@/constants";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI } from "@/utils/backendAPI";
import { setErrorMessage, useInitialPuzzleDraft, usePuzzleDraft } from "@/utils";
import { PuzzleHeader } from "./PuzzleHeader";
import paper0 from "@/assets/paper0.png";
import paper1 from "@/assets/paper1.png";
import paper2 from "@/assets/paper2.png";
import paper3 from "@/assets/paper3.png";
import paper4 from "@/assets/paper4.png";
import paper5 from "@/assets/paper5.png";
import paper6 from "@/assets/paper6.png";
import paper7 from "@/assets/paper7.png";
import paper8 from "@/assets/paper8.png";

/**
 * Paper-piece images indexed by `correctPosition` — i.e. paper0.png belongs
 * in grid cell 0 when the puzzle is solved. Each piece carries its image
 * through shuffles (the image follows the piece, not the grid cell), which
 * is how the player visually tracks where each fragment needs to land.
 */
const PAPER_IMAGES = [paper0, paper1, paper2, paper3, paper4, paper5, paper6, paper7, paper8];

interface Draft {
  pieces: PuzzlePiece[];
}

const c = content.puzzles[4];

interface Room2Puzzle2Props {
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

export const Room2Puzzle2 = ({ onSuccess, sessionKey, refreshGameState }: Room2Puzzle2Props) => {
  const dispatch = useContext(GlobalDispatchContext);
  const savedDraft = useInitialPuzzleDraft<Draft>(4);
  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  usePuzzleDraft(4, { pieces });

  useEffect(() => {
    const checkPuzzleCompletion = async () => {
      try {
        const response = await backendAPI.get("/game-state");
        if (response.data?.visitorData?.puzzlesCompleted?.[4]) setSuccess(true);
      } catch (err) {
        setErrorMessage(dispatch, err as ErrorType);
      }
    };
    checkPuzzleCompletion();
    // Resume from saved positions if the player closed mid-puzzle; otherwise
    // start a fresh shuffle.
    if (savedDraft?.pieces?.length === INITIAL_PIECES.length) {
      setPieces(updateLockedStatus(savedDraft.pieces));
    } else {
      setPieces(updateLockedStatus(shufflePieces(INITIAL_PIECES)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      setMessage(c.errors.cannotSwapLocked);
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
      setError(c.errors.notAllLocked);
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
      setErrorMessage(dispatch, err as ErrorType);
    }
    setIsSubmitting(false);
  };

  const lockedCount = pieces.filter((p) => p.isLocked).length;

  return (
    <div className="grid gap-4 w-full">
      <PuzzleHeader title={c.title} description={c.description} howToPlay={c.howToPlay} />

      {message && <div className="er-puzzle-info">{message}</div>}

      <div className="er-paper-grid-container">
        <div className="er-paper-grid">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((position) => {
            const piece = getPieceAtPosition(position);
            const isLocked = piece?.isLocked || false;
            const cellClass = `er-paper-cell ${selectedPiece === position ? "selected" : ""} ${isLocked ? "locked" : ""}`;
            return (
              <div key={position} className={cellClass} onClick={() => handlePieceClick(position)}>
                {piece && (
                  <div
                    className="er-paper-piece"
                    style={{
                      background: `url(${PAPER_IMAGES[piece.correctPosition]}) center/contain no-repeat`,
                    }}
                  >
                    <div className="er-paper-text">{piece.pieceText}</div>
                    {isLocked && <div className="er-locked-icon">🔒</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="er-progress-indicator mb-2">
        <p className="p2 er-text-dim">
          {c.progressTemplate.replace("{locked}", String(lockedCount)).replace("{total}", "9")}
        </p>
        <div className="er-progress-bar">
          <div className="er-progress-fill" style={{ width: `${(lockedCount / 9) * 100}%` }} />
        </div>
      </div>

      {error && <div className="er-puzzle-error">⚠️ {error}</div>}

      <div className="er-puzzle-actions">
        <button className="btn er-puzzle-reset" onClick={handleReset} disabled={isSubmitting}>
          {c.shuffleLabel}
        </button>
        <button className="btn er-puzzle-submit" onClick={handleSubmit} disabled={isSubmitting || !isPuzzleSolved()}>
          {isSubmitting ? c.submitBusyLabel : c.submitIdleLabel}
        </button>
      </div>
    </div>
  );
};

export default Room2Puzzle2;
