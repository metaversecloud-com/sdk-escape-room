export type ParsedLeaderboardEntry = {
  profileId: string;
  name: string;
  completionTime: number;
  escaped: boolean;
  attempts: number;
};

export const getLeaderboard = (
  leaderboardData?: Record<string, string>,
): ParsedLeaderboardEntry[] => {
  if (!leaderboardData) return [];

  const byProfile: Record<string, ParsedLeaderboardEntry> = {};

  for (const profileKey in leaderboardData) {
    const value = leaderboardData[profileKey];
    const [name, completionTimeText] = value.split("|");
    const completionTime = parseInt(completionTimeText || "0", 10) || 0;
    const [profileId, attemptText] = profileKey.split("-");
    const attemptNumber = parseInt(attemptText || "", 10) || 1;

    const existing = byProfile[profileId];
    if (!existing) {
      byProfile[profileId] = {
        profileId,
        name,
        completionTime,
        escaped: true,
        attempts: attemptNumber,
      };
      continue;
    }

    if (
      completionTime > 0 &&
      (existing.completionTime === 0 || completionTime < existing.completionTime)
    ) {
      existing.completionTime = completionTime;
      existing.name = name;
      existing.attempts = attemptNumber;
    }
  }

  const entries = Object.values(byProfile);

  entries.sort((a, b) => {
    if (a.escaped !== b.escaped) return a.escaped ? -1 : 1;
    return a.completionTime - b.completionTime;
  });

  return entries;
};