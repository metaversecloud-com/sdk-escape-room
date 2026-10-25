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
import libraryOpenBook from "@/assets/library-open-book.jpg";

const c = content.libraryPuzzles[2];
const book = content.libraryBookPuzzle;

interface LibraryPuzzle2Props {
  isCompleted: boolean;
  isLoading: boolean;
  refreshGameState: () => Promise<void>;
}

interface Draft {
  currentPage: number;
  answer: string;
}

const EXPECTED_WORD = "AISLE";

export const Puzzle2 = ({
  isCompleted,
  isLoading,
  refreshGameState,
}: LibraryPuzzle2Props) => {
  const dispatch = useContext(GlobalDispatchContext);
  const savedDraft = useInitialPuzzleDraft<Draft>(2);

  const pages = book.pages;
  const pageCount = pages.length;

  const [currentPage, setCurrentPage] = useState(() =>
    Math.min(
      Math.max(savedDraft?.currentPage ?? 0, 0),
      Math.max(pageCount - 1, 0)
    )
  );
  const [answer, setAnswer] = useState(savedDraft?.answer ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [pendingPage, setPendingPage] = useState<number | null>(null);

  usePuzzleDraft(2, { currentPage, answer });

  const handlePageChange = (direction: -1 | 1) => {
    if (isLoading || isSubmitting || isFlipping) return;

    const nextPage = currentPage + direction;

    if (nextPage < 0 || nextPage >= pageCount) return;

    setPendingPage(nextPage);
    setIsFlipping(true);
  };

  const handleSubmit = async () => {
    if (isSubmitting || isCompleted || isLoading) return;

    const normalizedAnswer = answer.trim().toUpperCase();

    if (!normalizedAnswer) {
      setError(c.errors.emptyAnswer);
      return;
    }

    if (normalizedAnswer !== EXPECTED_WORD) {
      setError(c.errors.wrongAnswer);
      reportWrongAttempt(2);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await backendAPI.post("/submit-puzzle", {
        puzzleNumber: 2,
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

  const page = pages[currentPage];

  return (
    <div className="library-lock grid gap-4 w-full">
      <LibraryPuzzleHeader
        title={c.title}
        description={c.description}
      />

      {/* Open book */}
      <div className="library-book">
        <div
          className="library-book-pages"
          style={{ backgroundImage: `url(${libraryOpenBook})` }}
        >
          <div
            className={`library-book-page ${
              isFlipping ? "is-flipping" : ""
            }`}
            onAnimationEnd={() => {
              if (pendingPage !== null) {
                setCurrentPage(pendingPage);
              }

              setPendingPage(null);
              setIsFlipping(false);
            }}
          >
            <div className="library-book-page-number">
              {c.pageLabel} {currentPage + 1} of {pageCount}
            </div>

            {page && (
              <p className="library-book-text">
                {book.emphasizeFirstLetter && page.text.length > 0 ? (
                  <>
                    <span className="library-book-first-letter">
                      {page.text[0]}
                    </span>
                    {page.text.slice(1)}
                  </>
                ) : (
                  page.text
                )}
              </p>
            )}

            <div className="library-book-page-footer">
              THE GRAND ARCHIVE
            </div>
          </div>
        </div>

        <div className="library-book-controls">
          <button
            type="button"
            className="library-book-nav"
            onClick={() => handlePageChange(-1)}
            disabled={
              currentPage === 0 ||
              isLoading ||
              isSubmitting ||
              isFlipping
            }
          >
            ← {c.previousPageLabel}
          </button>

          <span className="library-book-progress">
            {isFlipping && pendingPage !== null
              ? `${pendingPage + 1} / ${pageCount}`
              : `${currentPage + 1} / ${pageCount}`}
          </span>

          <button
            type="button"
            className="library-book-nav"
            onClick={() => handlePageChange(1)}
            disabled={
              currentPage >= pageCount - 1 ||
              isLoading ||
              isSubmitting ||
              isFlipping
            }
          >
            {c.nextPageLabel} →
          </button>
        </div>
      </div>

      {/* Answer input */}
      <form
        className="library-book-answer"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit();
        }}
      >
        <label
          htmlFor="library-book-answer-input"
          className="library-book-answer-label"
        >
          There is a password protected lockbox sitting on the desk.<br />
        </label>

        <input
          id="library-book-answer-input"
          type="text"
          value={answer}
          onChange={(event) => {
            setAnswer(event.target.value);
            setError("");
          }}
          placeholder={c.answerPlaceholder}
          autoComplete="off"
          disabled={isLoading || isSubmitting}
          className="library-book-answer-input"
        />

        {error && (
          <div className="er-puzzle-error" role="alert">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          className="btn er-puzzle-submit"
          disabled={isLoading || isSubmitting}
        >
          {isSubmitting ? c.submittingLabel : c.submitLabel}
        </button>
      </form>
    </div>
  );
};

export default Puzzle2;