import { ReactNode } from "react";

/**
 * Eyebrow defaults to "Puzzle Complete" but can be overridden per puzzle
 * if a theme wants a different beat (e.g. "Door Unlocked", "Chapter End").
 */
export const PuzzleCompleteCard = ({
  title,
  eyebrow = "Puzzle Complete",
  children,
}: {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
}) => (
  <div className="grid gap-3">
    <div aria-hidden className="er-card__glow" />
    <p className="p2 er-eyebrow er-text--green">{eyebrow}</p>
    <h3 className="er-title-gold">{title}</h3>
    {children}
  </div>
);

export default PuzzleCompleteCard;
