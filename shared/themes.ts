export type ThemeID = "SPACE" | "LIBRARY";

export interface ThemeRoom {
  id: number;
  puzzleNumbers: readonly number[];
}

export interface ThemeConfig {
  themeID: ThemeID;
  displayName: string;
  roomCount: number;
  puzzleCount: number;
  rooms: readonly ThemeRoom[];
}

export const THEME_CONFIGS: Record<ThemeID, ThemeConfig> = {
  SPACE: {
    themeID: "SPACE",
    displayName: "SPACE",
    roomCount: 3,
    puzzleCount: 7,
    rooms: [
      { id: 1, puzzleNumbers: [1, 2] },
      { id: 2, puzzleNumbers: [3, 4, 5] },
      { id: 3, puzzleNumbers: [6, 7] },
    ],
  },
  LIBRARY: {
    themeID: "LIBRARY",
    displayName: "LIBRARY",
    roomCount: 1,
    puzzleCount: 4,
    rooms: [{ id: 1, puzzleNumbers: [1, 2, 3, 4] }],
  },
};

export const DEFAULT_THEME_ID: ThemeID = "SPACE";

export const getFinalPuzzleNumber = (theme: ThemeConfig): number | undefined => {
  const puzzleNumbers = theme.rooms.flatMap((room) => room.puzzleNumbers);
  return puzzleNumbers.length > 0 ? Math.max(...puzzleNumbers) : undefined;
};

export const isPuzzleInTheme = (theme: ThemeConfig, puzzleNumber: unknown): puzzleNumber is number =>
  typeof puzzleNumber === "number" &&
  theme.rooms.some((room) => room.puzzleNumbers.includes(puzzleNumber));
