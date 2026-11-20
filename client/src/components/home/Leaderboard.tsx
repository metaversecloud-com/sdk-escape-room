import { useState } from "react";
import { content } from "@/constants";
import {
  LeaderboardRowType,
  TeamLeaderboardRowType,
} from "@/context/types";
import { formatDuration } from "@/utils";

interface LeaderboardProps {
  leaderboard?: LeaderboardRowType[];
  teamLeaderboard?: TeamLeaderboardRowType[];
}

type LeaderboardMode = "individual" | "teams";

const { leaderboard: leaderboardCopy } = content;

export const Leaderboard = ({
  leaderboard,
  teamLeaderboard,
}: LeaderboardProps) => {
  const [mode, setMode] = useState<LeaderboardMode>("individual");

  const activeLeaderboard =
    mode === "individual" ? leaderboard : teamLeaderboard;

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-3 mb-3">
        <button
          type="button"
          className={
            mode === "individual"
              ? "btn er-btn-primary"
              : "btn btn-outline"
          }
          onClick={() => setMode("individual")}
        >
          Individual
        </button>

        <button
          type="button"
          className={
            mode === "teams"
              ? "btn er-btn-primary"
              : "btn btn-outline"
          }
          onClick={() => setMode("teams")}
        >
          Teams
        </button>
      </div>

      {!activeLeaderboard || activeLeaderboard.length === 0 ? (
        <p className="pt-3 text-center">
          {leaderboardCopy.emptyState}
        </p>
      ) : mode === "individual" ? (
        <table className="table p-0">
          <thead>
            <tr>
              <th></th>
              <th className="h5">{leaderboardCopy.headers.name}</th>
              <th className="h5">{leaderboardCopy.headers.time}</th>
              <th className="h5">{leaderboardCopy.headers.attempts}</th>
            </tr>
          </thead>

          <tbody>
            {(leaderboard || []).map((entry, index) => (
              <tr key={entry.profileId}>
                <td className="p2">{index + 1}</td>
                <td className="p2 max-w-[60px]">{entry.name}</td>
                <td className="p2">
                  {formatDuration(entry.completionTime)}
                </td>
                <td className="p2">{entry.attempts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="table p-0">
          <thead>
            <tr>
              <th></th>
              <th className="h5">Team</th>
              <th className="h5">{leaderboardCopy.headers.time}</th>
            </tr>
          </thead>

          <tbody>
            {(teamLeaderboard || []).map((team, index) => (
              <tr key={team.teamId}>
                <td className="p2">{index + 1}</td>
                <td className="p2 max-w-[60px]">
                  {team.members.join(", ")}
                </td>
                <td className="p2">
                  {formatDuration(team.completionTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Leaderboard;