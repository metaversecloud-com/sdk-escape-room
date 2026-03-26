/**
 * Session timer helper.
 * Returns whether the session has expired and the remaining time in ms.
 */
export const checkSessionTimer = (startedAt: number | null, maxMinutes = 30) => {
  // If the session hasn't started, it's not expired and we don't have a remaining time to return.
  if (!startedAt) {
    return { expired: false, remainingMs: undefined };
  }

  const now = Date.now();
  const maxMs = maxMinutes * 60 * 1000;
  // Calculate elapsed time and remaining time, ensuring that remaining time doesn't go negative.
  const elapsed = now - startedAt;
  // If elapsed time exceeds max time, the session is expired. Remaining time is max time minus elapsed time, but not less than 0.
  const remainingMs = Math.max(maxMs - elapsed, 0);

  return {
    expired: elapsed >= maxMs,
    remainingMs,
  };
};

