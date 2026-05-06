import { LeaderboardRowType } from "@/context/types";

interface LeaderboardPanelProps {
  leaderboard?: LeaderboardRowType[];
}

export const LeaderboardPanel = ({ leaderboard }: LeaderboardPanelProps) => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">Leaderboard</h3>
      <p className="p2">Top Escape Room Times</p>
      {!leaderboard || leaderboard.length === 0 ? (
        <p className="p2">No entries yet. Be the first to escape!</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th className="h5">Name</th>
              <th className="h5">Time</th>
              <th className="h5">Attempts</th>
              <th className="h5">Escaped</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={entry.profileId}>
                <td className="p2">{index + 1}</td>
                <td className="p2">{entry.name}</td>
                <td className="p2">{entry.completionTime}s</td>
                <td className="p2">{entry.attempts}</td>
                <td className="p2">{entry.escaped ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

export default LeaderboardPanel;
