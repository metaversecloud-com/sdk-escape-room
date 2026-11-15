export const getVisitorSessionDataForUpdate = <
  T extends {
    groupId?: string;
    puzzlesCompleted?: unknown;
    groupProgress?: unknown;
  },
>(
  session: T,
  teamId = session.groupId,
): Omit<T, "groupProgress"> | Omit<Omit<T, "groupProgress">, "puzzlesCompleted"> => {
  const { groupProgress: _legacyGroupProgress, ...sessionWithoutGroupProgress } = session;
  if (!teamId) return sessionWithoutGroupProgress;
  const { puzzlesCompleted: _teamProgress, ...visitorSession } = sessionWithoutGroupProgress;
  return visitorSession;
};
