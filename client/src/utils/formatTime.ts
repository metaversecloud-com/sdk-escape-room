/** "MM:SS" — used for the live in-game stopwatch where colon-padded reads like a timer. */
export const formatTime = (seconds?: number | null): string => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return "--:--";
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
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

export const formatElapsedFromTimestamp = (startedAtMs: number | null | undefined): string => {
  if (!startedAtMs) return "--:--";
  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
  return formatTime(elapsedSeconds);
};

/**
 * Countdown timer formatted as "MM:SS". Returns "--:--" before the session
 * starts and "00:00" once the deadline has passed. `maxMinutes` defaults to
 * 30 to match the server's `DEFAULT_MAX_SESSION_MINUTES`.
 */
export const formatCountdownFromTimestamp = (
  startedAtMs: number | null | undefined,
  maxMinutes: number = 30,
): string => {
  if (!startedAtMs) return "--:--";
  const endMs = startedAtMs + maxMinutes * 60 * 1000;
  const remainingSeconds = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
  return formatTime(remainingSeconds);
};

/** Whole seconds left until the deadline (clamped at 0). Used to fire actions when time expires. */
export const remainingSecondsFromTimestamp = (
  startedAtMs: number | null | undefined,
  maxMinutes: number = 30,
): number => {
  if (!startedAtMs) return 0;
  const endMs = startedAtMs + maxMinutes * 60 * 1000;
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
};
