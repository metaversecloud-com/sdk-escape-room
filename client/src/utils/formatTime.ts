/** "MM:SS" — used for the live in-game stopwatch where colon-padded reads like a timer. */
export const formatTime = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return "--:--";
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

/** "XmYs" — used for completion times (leaderboard rows, results screens). */
export const formatDuration = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return "--";
  const safe = Math.max(0, Math.floor(seconds));
  const mm = Math.floor(safe / 60);
  const ss = safe % 60;
  return `${mm}m ${ss}s`;
};

/**
 * Live count-up stopwatch formatted as "MM:SS". Returns "--:--" before the
 * session starts. There's no upper bound — the game does not end on time,
 * so the display just keeps going up (e.g. "104:52").
 */
export const formatElapsedFromTimestamp = (startedAtMs: number | null | undefined): string => {
  if (!startedAtMs) return "--:--";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
  return formatTime(elapsedSeconds);
};
