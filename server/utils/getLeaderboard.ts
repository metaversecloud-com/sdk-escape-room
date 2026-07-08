export type ParsedLeaderboardEntry = {
  profileId: string;
  name: string;
  completionTime: number;
  attempts: number;
};

/**
 * Parses the leaderboard data object into a sorted list.
 *
 * Storage shape: `{ [profileId]: "name|bestCompletionTime|attempts" }` — one
 * row per profile, written by handleSubmitPuzzle on each escape. Sorted by
 * fastest completion time ascending.
 */
export const getLeaderboard = (leaderboardData?: Record<string, string>): ParsedLeaderboardEntry[] => {
  if (!leaderboardData) return [];

  const entries: ParsedLeaderboardEntry[] = [];
  for (const profileId in leaderboardData) {
    const [name = "", timeText = "0", attemptsText = "1"] = (leaderboardData[profileId] || "").split("|");
    entries.push({
      profileId,
      name,
      completionTime: parseInt(timeText, 10) || 0,
      attempts: parseInt(attemptsText, 10) || 1,
    });
  }

  return entries.sort((a, b) => a.completionTime - b.completionTime);
};
