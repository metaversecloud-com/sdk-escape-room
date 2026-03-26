import { useMemo } from "react";

type Props = {
  startedAt?: number | null;
  maxMinutes?: number;
};

const formatMs = (ms: number) => {
  const totalSeconds = Math.max(Math.floor(ms / 1000), 0);
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

export const TimerBadge = ({ startedAt, maxMinutes = 30 }: Props) => {
  const remainingMs = useMemo(() => {
    if (!startedAt) return null;
    const maxMs = maxMinutes * 60 * 1000;
    return maxMs - (Date.now() - startedAt);
  }, [startedAt, maxMinutes]);

  if (!startedAt || remainingMs === null) return null;

  const isDanger = remainingMs <= 3 * 60 * 1000;

  return (
    <div className={`badge ${isDanger ? "bg-error text-white" : "bg-neutral-200 text-neutral-900"}`}>
      ⏱ {formatMs(remainingMs)}
    </div>
  );
};

export default TimerBadge;
