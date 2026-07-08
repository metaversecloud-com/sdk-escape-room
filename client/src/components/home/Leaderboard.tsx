import { content } from "@/constants";
import { LeaderboardRowType } from "@/context/types";
import { formatDuration } from "@/utils";

interface LeaderboardProps {
  leaderboard?: LeaderboardRowType[];
}

const { leaderboard: leaderboardCopy } = content;

export const Leaderboard = ({ leaderboard }: LeaderboardProps) => (
  <div>
    {!leaderboard || leaderboard.length === 0 ? (
      <p className="pt-3 text-center">{leaderboardCopy.emptyState}</p>
    ) : (
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
