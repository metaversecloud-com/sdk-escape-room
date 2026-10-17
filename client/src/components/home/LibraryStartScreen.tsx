import { ReactNode } from "react";

import { ThemeConfig } from "@shared/themes";

interface LibraryStartScreenProps {
  theme: ThemeConfig;
  children: ReactNode;
}

export const LibraryStartScreen = ({ theme, children }: LibraryStartScreenProps) => (
  <section className="grid gap-3 er-library-start" aria-labelledby="library-start-title">
    <div className="er-library-start__briefing">
      <p className="er-eyebrow er-text--cyan">A new adventure awaits</p>
      <h2 id="library-start-title" className="card-title er-library-start__title">
        The Library
      </h2>
      <p className="p2 er-text">
        Search the shelves, uncover hidden knowledge, and solve every puzzle to escape the
        Library. Choose how you would like to play to begin.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" aria-label="Library game details">
      <div className="er-library-start__stat">
        <span className="er-eyebrow er-text-muted">Theme</span>
        <strong>{theme.displayName}</strong>
      </div>
      <div className="er-library-start__stat">
        <span className="er-eyebrow er-text-muted">Rooms</span>
        <strong>{theme.roomCount}</strong>
      </div>
      <div className="er-library-start__stat">
        <span className="er-eyebrow er-text-muted">Puzzles</span>
        <strong>{theme.puzzleCount}</strong>
      </div>
    </div>

    <div className="card-details mt-2 grid gap-3">{children}</div>
  </section>
);
