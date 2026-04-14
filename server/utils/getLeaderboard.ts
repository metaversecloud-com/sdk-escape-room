export type ParsedLeaderboardEntry = {
  profileId: string;
  name: string;
  completionTime: number;
  escaped: boolean;
};

export const getLeaderboard = (
  leaderboardData?: Record<string, string>,
): ParsedLeaderboardEntry[] => {
  if (!leaderboardData) return [];

  const entries: ParsedLeaderboardEntry[] = [];

  for (const profileId in leaderboardData) {
    const value = leaderboardData[profileId];
    const [name, completionTime] = value.split("|");
    const baseProfileId = profileId.split("-")[0];

    entries.push({
      profileId: baseProfileId,
      name,
      completionTime: parseInt(completionTime || "0", 10) || 0,
      escaped: true,
    });
  }

  entries.sort((a, b) => {
    if (a.escaped !== b.escaped) return a.escaped ? -1 : 1;
    if (a.escaped && b.escaped) return a.completionTime - b.completionTime;
    return 0;
  });

  return entries;
};
