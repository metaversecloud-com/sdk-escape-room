import { ReactNode } from "react";
import { ThemeConfig } from "@shared/themes";

interface LibraryStartScreenProps {
  theme: ThemeConfig;
  children: ReactNode;
}

export const LibraryStartScreen = ({
  theme,
  children,
}: LibraryStartScreenProps) => (
  <section
    className="grid gap-3 er-library-start"
    aria-labelledby="library-start-title"
  >
    <div className="er-library-start__briefing">
      <p className="er-library-start__eyebrow">
        ✦ A new chapter awaits ✦
      </p>

      <h2
        id="library-start-title"
        className="er-library-start__title"
      >
        The Library
      </h2>

      <p className="er-library-start__description">
        Search the shelves, uncover forgotten knowledge, and solve
        the mysteries hidden among the books. Your adventure begins
        when you open the first page.
      </p>
    </div>

    <div
      className="grid grid-cols-1 sm:grid-cols-3 gap-3"
      aria-label="Library game details"
    >
      <div className="er-library-start__stat">
        <span className="er-library-start__stat-label">Theme</span>
        <strong>{theme.displayName}</strong>
      </div>

      <div className="er-library-start__stat">
        <span className="er-library-start__stat-label">Rooms</span>
        <strong>{theme.roomCount}</strong>
      </div>

      <div className="er-library-start__stat">
        <span className="er-library-start__stat-label">Puzzles</span>
        <strong>{theme.puzzleCount}</strong>
      </div>
    </div>

    <div className="card-details mt-2 grid gap-3">
      {children}
    </div>
  </section>
);
