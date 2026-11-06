import {
LeaderboardRowType,
TeamLeaderboardRowType,
} from "@/context/types";
import { formatDuration } from "@/utils";

interface LibraryExitCongratsCardProps {
completionTime?: number | null;
leaderboard?: LeaderboardRowType[];
teamLeaderboard?: TeamLeaderboardRowType[];
teamId?: string | null;
}

const computePlacement = (
completionTime: number | null | undefined,
times: number[],
): number | null => {
if (completionTime == null || !times.length) return null;

const sortedTimes = times
.filter((t) => typeof t === "number")
.sort((a, b) => a - b);

const idx = sortedTimes.findIndex((t) => t >= completionTime);

return idx === -1 ? sortedTimes.length + 1 : idx + 1;
};

export const LibraryExitCongratsCard = ({
completionTime,
leaderboard,
teamLeaderboard,
teamId,
}: LibraryExitCongratsCardProps) => {
const isTeamRun = Boolean(teamId);

const timeText = formatDuration(completionTime ?? undefined);

const placement = isTeamRun
? computePlacement(
completionTime,
(teamLeaderboard || []).map((entry) => entry.completionTime),
)
: computePlacement(
completionTime,
(leaderboard || []).map((entry) => entry.completionTime),
);

const topTeamRows = (teamLeaderboard || []).slice(0, 5);
const topIndividualRows = (leaderboard || []).slice(0, 5);

return (
<div className="library-exit-card">
<p className="p2 library-exit-eyebrow">
ARCHIVE RECORD UPDATED
</p>

  <h3 className="library-exit-title">
    THE MYSTERY IS SOLVED
  </h3>

  <p className="p2 library-exit-message">
    You've uncovered the secrets hidden within the library.
    Your investigation is complete. Well done, detective.
  </p>

  <div className="library-exit-stats">
    <div className="library-exit-stat">
      <p className="p2 library-exit-label">
        INVESTIGATION TIME
      </p>

      <h4 className="h4 library-exit-time">
        {timeText}
      </h4>

      {placement !== null && placement > 0 && (
        <p className="p3 library-exit-muted">
          Your projected ranking: #{placement}
        </p>
      )}
    </div>

    <div className="library-exit-leaderboard">
      <p className="p2 library-exit-label">
        TOP INVESTIGATORS
      </p>

      {isTeamRun ? (
        topTeamRows.length === 0 ? (
          <p className="p2 library-exit-muted">
            No completed investigations yet.
          </p>
        ) : (
          <table className="table library-exit-table">
            <thead>
              <tr>
                <th className="p2">Rank</th>
                <th className="p2">Research Team</th>
                <th className="p2">Time</th>
              </tr>
            </thead>

            <tbody>
              {topTeamRows.map((row, idx) => (
                <tr key={row.teamId}>
                  <td className="p2">#{idx + 1}</td>
                  <td className="p2">{row.members.join(", ")}</td>
                  <td className="p2">
                    {formatDuration(row.completionTime)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : topIndividualRows.length === 0 ? (
        <p className="p2 library-exit-muted">
          No completed investigations yet.
        </p>
      ) : (
        <table className="table library-exit-table">
          <thead>
            <tr>
              <th className="p2">Rank</th>
              <th className="p2">Researcher</th>
              <th className="p2">Time</th>
              <th className="p2">Attempts</th>
            </tr>
          </thead>

          <tbody>
            {topIndividualRows.map((row, idx) => (
              <tr key={row.profileId}>
                <td className="p2">#{idx + 1}</td>
                <td className="p2">{row.name}</td>
                <td className="p2">
                  {formatDuration(row.completionTime)}
                </td>
                <td className="p2">{row.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
</div>

);
};

export default LibraryExitCongratsCard;