import { useContext, useState } from "react";
import { content } from "@/constants";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import {
  backendAPI,
  reportWrongAttempt,
  setErrorMessage,
  setGameState,
  useInitialPuzzleDraft,
  usePuzzleDraft,
} from "@/utils";
import { LibraryPuzzleHeader } from "./PuzzleHeader";

const c = content.libraryPuzzles[3];

interface LibraryPuzzle3Props {
  isCompleted: boolean;
  isLoading: boolean;
  refreshGameState: () => Promise<void>;
}

interface Draft {
  topShelf: number;
  middleShelf: number;
  bottomShelf: number;
}

const MIN_VALUE = 0;
const MAX_VALUE = 10;

const CORRECT_VALUES = {
  topShelf: 6,
  middleShelf: 3,
  bottomShelf: 5,
} as const;

type ShelfName = keyof Draft;

export const Puzzle3 = ({
  isCompleted,
  isLoading,
  refreshGameState,
}: LibraryPuzzle3Props) => {
  const dispatch = useContext(GlobalDispatchContext);
  const savedDraft = useInitialPuzzleDraft<Draft>(3);

  const [topShelf, setTopShelf] = useState(
    savedDraft?.topShelf ?? 0
  );
  const [middleShelf, setMiddleShelf] = useState(
    savedDraft?.middleShelf ?? 0
  );
  const [bottomShelf, setBottomShelf] = useState(
    savedDraft?.bottomShelf ?? 0
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  usePuzzleDraft(3, { topShelf, middleShelf, bottomShelf });

  const values: Draft = {
    topShelf,
    middleShelf,
    bottomShelf,
  };

  const setters: Record<ShelfName, (value: number) => void> = {
    topShelf: setTopShelf,
    middleShelf: setMiddleShelf,
    bottomShelf: setBottomShelf,
  };

  const shelfLabels: Record<ShelfName, string> = {
    topShelf: c.shelfNames[0],
    middleShelf: c.shelfNames[1],
    bottomShelf: c.shelfNames[2],
  };

  const handleSliderChange = (
    shelf: ShelfName,
    value: number
  ) => {
    if (isSubmitting || isCompleted || isLoading) return;

    setters[shelf](value);
    setError(null);
  };

  const handleReset = () => {
    if (isSubmitting || isCompleted || isLoading) return;

    setTopShelf(0);
    setMiddleShelf(0);
    setBottomShelf(0);
    setError(null);
  };

  const handleSubmit = async () => {
    if (isSubmitting || isCompleted || isLoading) return;

    setIsSubmitting(true);
    setError(null);

    const isCorrect =
      topShelf === CORRECT_VALUES.topShelf &&
      middleShelf === CORRECT_VALUES.middleShelf &&
      bottomShelf === CORRECT_VALUES.bottomShelf;

    if (!isCorrect) {
      setError(c.errors.wrongSequence);
      reportWrongAttempt(3);
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await backendAPI.post("/submit-puzzle", {
        puzzleNumber: 3,
        alpha: topShelf,
        beta: middleShelf,
        gamma: bottomShelf,
      });

      setGameState(dispatch, response.data);
      await refreshGameState();
    } catch (err) {
      setErrorMessage(dispatch, err as ErrorType);
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="card w-full">
        <div className="card-details">
          <h3 className="card-title">{c.title}</h3>
          <p className="p2 text-success" role="status">
            {c.complete.body}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="library-lock grid gap-4 w-full">
      <LibraryPuzzleHeader
        title={c.title}
        description={c.description}
      />

      <div className="grid gap-4">
        {(Object.keys(values) as ShelfName[]).map((shelf) => (
          <div className="er-control-group" key={shelf}>
            <label>
              <span className="er-shelf-name">
                {shelfLabels[shelf]}
              </span>
              <span className="er-shelfe-value">
                {values[shelf]}
              </span>
            </label>

            <input
              type="range"
              min={MIN_VALUE}
              max={MAX_VALUE}
              step={1}
              value={values[shelf]}
              onChange={(event) =>
                handleSliderChange(
                  shelf,
                  Number(event.target.value)
                )
              }
              className="er-slider"
              aria-label={shelfLabels[shelf]}
              disabled={isLoading || isSubmitting}
            />

            <div className="library-shelf-counts">
              {MIN_VALUE} 
              <span>{MAX_VALUE} </span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="er-puzzle-error" role="alert">
          ⚠️ {error}
        </div>
      )}

      <div className="er-puzzle-actions">
        <button
          type="button"
          className="btn er-puzzle-reset"
          onClick={handleReset}
          disabled={isLoading || isSubmitting}
        >
          {c.resetLabel}
        </button>

        <button
          type="button"
          className="btn er-puzzle-submit"
          onClick={handleSubmit}
          disabled={isLoading || isSubmitting}
        >
          {isSubmitting ? c.submittingLabel : c.submitLabel}
        </button>
      </div>
    </div>
  );
};

export default Puzzle3;