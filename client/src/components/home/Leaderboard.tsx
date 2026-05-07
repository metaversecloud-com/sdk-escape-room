import { LeaderboardRowType } from "@/context/types";
import { formatDuration } from "@/utils";

interface LeaderboardProps {
  leaderboard?: LeaderboardRowType[];
}

export const Leaderboard = ({ leaderboard }: LeaderboardProps) => (
  <div>
    {!leaderboard || leaderboard.length === 0 ? (
      <p className="p2">No entries yet. Be the first to escape!</p>
    ) : (
      <table className="table p-0">
        <thead>
          <tr>
            <th></th>
            <th className="h5">Name</th>
            <th className="h5">Time</th>
            <th className="h5">Attempts</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, index) => (
            <tr key={entry.profileId}>
              <td className="p2">{index + 1}</td>
              <td className="p2 max-w-[60px]">{entry.name}</td>
              <td className="p2">{formatDuration(entry.completionTime)}</td>
              <td className="p2">{entry.attempts}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default Leaderboard;
