import { ReactNode } from "react";

export const LibraryPuzzleHeader = ({
  title,
  description,
  howToPlay,
  children,
}: {
  title: string;
  description: string;
  howToPlay?: string;
  children?: ReactNode;
}) => (
  <>
    <div className="library-puzzle-header grid gap-2">
      <div className="library-header-label">
        <span aria-hidden="true">✦</span>
        <span>THE GRAND ARCHIVE</span>
        <span aria-hidden="true">✦</span>
      </div>

      <h2 className="library-title">{title}</h2>

      <div className="library-header-divider">
        <span aria-hidden="true">❧</span>
      </div>

      <p className="library-description">{description}</p>

      {children}
    </div>

    {howToPlay && (
      <div className="library-puzzle-instructions">
        <p>
          <strong>How to Proceed</strong>
          <span className="library-instruction-separator"> — </span>
          {howToPlay}
        </p>
      </div>
    )}
  </>
);

export default LibraryPuzzleHeader;