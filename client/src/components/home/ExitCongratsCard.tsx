import { LeaderboardRowType } from "@/context/types";
import { formatDuration } from "@/utils";

interface ExitCongratsCardProps {
  completionTime?: number | null;
  leaderboard?: LeaderboardRowType[];
}

const computePlacement = (
  completionTime: number | null | undefined,
  leaderboard: LeaderboardRowType[] | undefined,
): number | null => {
  if (completionTime == null || !leaderboard?.length) return null;
  const sortedTimes = leaderboard
    .map((entry) => entry.completionTime)
    .filter((t) => typeof t === "number")
    .sort((a, b) => a - b);
  const idx = sortedTimes.findIndex((t) => t >= completionTime);
  return idx === -1 ? leaderboard.length + 1 : idx + 1;
};

export const ExitCongratsCard = ({ completionTime, leaderboard }: ExitCongratsCardProps) => {
  const timeText = formatDuration(completionTime ?? undefined);
  const placement = computePlacement(completionTime, leaderboard);
  const topRows = leaderboard ? leaderboard.slice(0, 5) : [];

  return (
    <div className="grid gap-4 w-full">
      <p className="p2 er-eyebrow er-text--cyan">Mission Complete</p>
      <h3 className="er-title-gold">Congratulations — Airlock Opened</h3>
      <p className="p2 er-text">
        Commander Vega: “Great work, crew. You restored Power, Comms, and Airlock. Grab your stats and see how you
        rank.”
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="er-stat-tile">
          <p className="p2 er-eyebrow er-text--violet">Your Time</p>
          <h4 className="h4" style={{ color: "var(--er-gold)" }}>
            {timeText}
          </h4>
          {placement !== null && placement > 0 && <p className="p3 er-text-muted">Projected rank: #{placement}</p>}
        </div>
        <p className="p2 er-eyebrow er-text--cyan">Top Escape Times</p>
        {topRows.length === 0 ? (
          <p className="p2 er-text-muted">No leaderboard entries yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="p2">Rank</th>
                <th className="p2">Crew</th>
                <th className="p2">Time</th>
                <th className="p2">Attempts</th>
              </tr>
            </thead>
            <tbody>
              {topRows.map((row, idx) => (
                <tr key={row.profileId}>
                  <td className="p2">#{idx + 1}</td>
                  <td className="p2">{row.name}</td>
                  <td className="p2">{formatDuration(row.completionTime)}</td>
                  <td className="p2">{row.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ExitCongratsCard;
