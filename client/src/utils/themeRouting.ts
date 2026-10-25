import { ArtifactScreen, getFinalPuzzleNumber, THEME_CONFIGS, ThemeConfig } from "@shared/themes";

const COMMON_SCREENS = new Set(["start", "exit", "teleport", "leaderboard"]);

export type ThemeScreen =
  | "start"
  | "exit"
  | "teleport"
  | "leaderboard"
  | "decoy"
  | ArtifactScreen
  | `room${number}`
  | `puzzle${number}`
  | "null";

export const isArtifactScreen = (screen: ThemeScreen, theme: ThemeConfig): screen is ArtifactScreen =>
  theme.artifactScreens.some((artifactScreen) => artifactScreen === screen);

export const resolveThemeScreen = (screen: string | null, theme: ThemeConfig): ThemeScreen => {
  if (!screen) return "null";
  if (COMMON_SCREENS.has(screen)) return screen as ThemeScreen;

  if (
    theme.artifactScreens.some((artifactScreen) => artifactScreen === screen) ||
    (theme.themeID === "SPACE" && screen === "decoy")
  ) {
    return screen as ThemeScreen;
  }

  const roomMatch = /^room(\d+)$/.exec(screen);
  if (roomMatch && theme.rooms.some((room) => room.id === Number(roomMatch[1]))) {
    return screen as ThemeScreen;
  }

  const puzzleMatch = /^puzzle(\d+)$/.exec(screen);
  const puzzleNumber = Number(puzzleMatch?.[1]);
  if (
    puzzleMatch &&
    puzzleNumber >= 1 &&
    theme.rooms.some((room) => room.puzzleNumbers.includes(puzzleNumber))
  ) {
    return screen as ThemeScreen;
  }

  return "null";
};

export const getRoomForScreen = (screen: ThemeScreen, theme: ThemeConfig): number | undefined => {
  const roomMatch = /^room(\d+)$/.exec(screen);
  if (roomMatch) return Number(roomMatch[1]);

  const puzzleMatch = /^puzzle(\d+)$/.exec(screen);
  if (!puzzleMatch) return undefined;

  const puzzleNumber = Number(puzzleMatch[1]);
  return theme.rooms.find((room) => room.puzzleNumbers.includes(puzzleNumber))?.id;
};

export const getPuzzleNumberFromScreen = (screen: ThemeScreen): number | undefined => {
  const puzzleMatch = /^puzzle(\d+)$/.exec(screen);
  return puzzleMatch ? Number(puzzleMatch[1]) : undefined;
};

export const isRoomComplete = (
  theme: ThemeConfig,
  puzzlesCompleted: Record<number, boolean> | undefined,
  roomId: number,
): boolean => {
  const room = theme.rooms.find(({ id }) => id === roomId);
  return !!room && room.puzzleNumbers.every((puzzleNumber) => puzzlesCompleted?.[puzzleNumber] === true);
};

export const isThemeComplete = (
  theme: ThemeConfig,
  puzzlesCompleted: Record<number, boolean> | undefined,
): boolean => {
  const finalPuzzleNumber = getFinalPuzzleNumber(theme);
  if (finalPuzzleNumber === undefined) return false;
  return puzzlesCompleted?.[finalPuzzleNumber] === true;
};

export const SPACE_THEME = THEME_CONFIGS.SPACE;
