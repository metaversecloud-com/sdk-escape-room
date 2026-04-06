// server/utils/timer.ts
import { VisitorData } from "../../shared/types/VisitorData.js";

export const checkSessionTimeout = (
  startTime: string | undefined,
  maxMinutes: number = 30
): { expired: boolean; timeRemaining: number } => {
  if (!startTime) {
    return { expired: false, timeRemaining: maxMinutes * 60 };
  }

  const start = new Date(startTime).getTime();
  const now = Date.now();
  const elapsedSeconds = (now - start) / 1000;
  const maxSeconds = maxMinutes * 60;
  const timeRemaining = Math.max(0, maxSeconds - elapsedSeconds);

  return {
    expired: elapsedSeconds >= maxSeconds,
    timeRemaining,
  };
};