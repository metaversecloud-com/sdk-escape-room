import { useState } from "react";

import { backendAPI } from "@/utils";

export interface LibraryPuzzleProps {
  isCompleted: boolean;
  isLoading: boolean;
  refreshGameState: () => Promise<void>;
}

interface LibraryPuzzlePlaceholderProps extends LibraryPuzzleProps {
  puzzleNumber: number;
}

export const LibraryPuzzlePlaceholder = ({
  puzzleNumber,
  isCompleted,
  isLoading,
  refreshGameState,
}: LibraryPuzzlePlaceholderProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const submitPlaceholder = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber });
      if (response.data?.success !== true) {
        throw new Error(response.data?.message || "Unable to complete this puzzle.");
      }
      await refreshGameState();
    } catch (error) {
      const responseError = (error as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setErrorMessage(responseError || (error instanceof Error ? error.message : "Unable to complete this puzzle."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card w-full">
      <div className="card-details">
        <h3 className="card-title">LIBRARY Puzzle {puzzleNumber}</h3>
        <p className="card-description p2">
          Placeholder :)
        </p>
        {isCompleted ? (
          <p className="p2 text-success" role="status">
            Puzzle {puzzleNumber} completed.
          </p>
        ) : (
          <div className="card-actions mt-2">
            <button
              className="btn"
              type="button"
              onClick={() => void submitPlaceholder()}
              disabled={isLoading || isSubmitting}
            >
              {isSubmitting ? "Completing…" : "Complete placeholder"}
            </button>
          </div>
        )}
        {errorMessage && (
          <p className="p3 text-error" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};
