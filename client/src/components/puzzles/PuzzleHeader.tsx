import { ReactNode } from "react";

/**
 * Shared header for an active puzzle: title + description + optional
 * "How to Play" callout. Used by every puzzle component so the layout
 * and styling stay consistent. Children render after the description
 * (e.g. for a Show/Hide Hints toggle on puzzles that have hints).
 */
export const PuzzleHeader = ({
  title,
  description,
  howToPlay,
  children,
}: {
  title: string;
  description: string;
  /** Optional "🎯 How to Play: ..." instruction line shown in its own panel. */
  howToPlay?: string;
  children?: ReactNode;
}) => (
  <>
    <div className="er-puzzle-header grid gap-2">
      <h2 className="er-title-gold">{title}</h2>
      <p className="p2 er-text">{description}</p>
      {children}
    </div>
    {howToPlay && (
      <div className="er-puzzle-instructions p-2">
        <p className="p2 er-text-dim">
          🎯 <strong>How to Play:</strong> {howToPlay}
        </p>
      </div>
    )}
  </>
);

export default PuzzleHeader;
