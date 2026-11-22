import { content } from "@/constants";
import {
  LeaderboardRowType,
  TeamLeaderboardRowType,
} from "@/context/types";
import { formatDuration } from "@/utils";

interface ExitCongratsCardProps {
  completionTime?: number | null;
  leaderboard?: LeaderboardRowType[];
  teamLeaderboard?: TeamLeaderboardRowType[];
  teamId?: string | null;
}

const { exitScreen } = content;

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

export const ExitCongratsCard = ({
  completionTime,
  leaderboard,
  teamLeaderboard,
  teamId,
}: ExitCongratsCardProps) => {
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
    <div className="grid gap-4 w-full">
      <p className="p2 er-eyebrow er-text--cyan">
        {exitScreen.eyebrow}
      </p>

      <h3 className="er-title-gold">{exitScreen.title}</h3>

      <p className="p2 er-text">{exitScreen.message}</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="er-stat-tile">
          <p className="p2 er-eyebrow er-text--violet">
            {exitScreen.yourTimeLabel}
          </p>

          <h4 className="h4" style={{ color: "var(--er-gold)" }}>
            {timeText}
          </h4>

          {placement !== null && placement > 0 && (
            <p className="p3 er-text-muted">
              {exitScreen.projectedRankPrefix}
              {placement}
            </p>
          )}
        </div>

        <div className="md:col-span-2">
          <p className="p2 er-eyebrow er-text--cyan">
            {exitScreen.topTimesLabel}
          </p>

          {isTeamRun ? (
            topTeamRows.length === 0 ? (
              <p className="p2 er-text-muted">
                {exitScreen.emptyLeaderboard}
              </p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th className="p2">
                      {exitScreen.tableHeaders.rank}
                    </th>
                    <th className="p2">
                      {exitScreen.tableHeaders.crew}
                    </th>
                    <th className="p2">
                      {exitScreen.tableHeaders.time}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {topTeamRows.map((row, idx) => (
                    <tr key={row.teamId}>
                      <td className="p2">#{idx + 1}</td>
                      <td className="p2">
                        {row.members.join(", ")}
                      </td>
                      <td className="p2">
                        {formatDuration(row.completionTime)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : topIndividualRows.length === 0 ? (
            <p className="p2 er-text-muted">
              {exitScreen.emptyLeaderboard}
            </p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th className="p2">
                    {exitScreen.tableHeaders.rank}
                  </th>
                  <th className="p2">
                    {exitScreen.tableHeaders.crew}
                  </th>
                  <th className="p2">
                    {exitScreen.tableHeaders.time}
                  </th>
                  <th className="p2">
                    {exitScreen.tableHeaders.attempts}
                  </th>
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

export default ExitCongratsCard;