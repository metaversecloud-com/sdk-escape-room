export type ThemeID = "SPACE" | "LIBRARY";

export const LIBRARY_PUZZLE_REWARD_SELECTORS = {
  1: "library-9f31",
  2: "library-4c82",
  3: "library-d7a6",
} as const;

export type ArtifactScreen =
  | "Room1Artifact"
  | "CrewPortrait1"
  | "CrewPortrait2"
  | "CrewPortrait3"
  | "AlphaStation"
  | "BetaStation"
  | "OmegaStation"
  | "Room3Artifact"
  | "paper1"
  | "paper2"
  | "paper3"
  | "paper4"
  | "bookcase";

export interface ThemeRoom {
  id: number;
  puzzleNumbers: readonly number[];
  requiredPuzzleNumbers: readonly number[];
  spawnUniqueName: string;
  entryAnalyticName: string;
}

export interface ThemeRoomTransition {
  fromRoom: number;
  toRoom: number;
  analyticName: string;
  badgeKey: "POWER_RESTORED" | "SIGNAL_RECOVERED";
  walkPadUniqueName: string;
}

export interface ThemePuzzleReward {
  itemName?: string;
  selector?: string;
}

export interface ThemePuzzleBadge {
  badgeKey: "AIRLOCK_ENGINEER" | "STATION_SURVIVOR" | "WARP_SPEED";
}

export interface ThemeConfig {
  themeID: ThemeID;
  displayName: string;
  roomCount: number;
  puzzleCount: number;
  rooms: readonly ThemeRoom[];
  artifactScreens: readonly ArtifactScreen[];
  defaultPuzzles: Record<number, boolean>;
  transitions: readonly ThemeRoomTransition[];
  puzzleRewards: Readonly<Record<number, ThemePuzzleReward>>;
  puzzleBadges: Readonly<Record<number, readonly ThemePuzzleBadge[]>>;
  completionToast: "escaped" | "libraryEscaped";
}

const defineTheme = (
  config: Omit<ThemeConfig, "roomCount" | "puzzleCount" | "defaultPuzzles">,
): ThemeConfig => {
  const puzzleNumbers = config.rooms.flatMap((room) => room.puzzleNumbers);
  return {
    ...config,
    roomCount: config.rooms.length,
    puzzleCount: puzzleNumbers.length,
    defaultPuzzles: Object.fromEntries(puzzleNumbers.map((number) => [number, false])),
  };
};

export const THEME_CONFIGS: Record<ThemeID, ThemeConfig> = {
  SPACE: defineTheme({
    themeID: "SPACE",
    displayName: "SPACE",
    rooms: [
      {
        id: 1,
        puzzleNumbers: [1, 2],
        requiredPuzzleNumbers: [],
        spawnUniqueName: "EscapeRoom_room1_teleport",
        entryAnalyticName: "room1Entries",
      },
      {
        id: 2,
        puzzleNumbers: [3, 4, 5],
        requiredPuzzleNumbers: [1, 2],
        spawnUniqueName: "EscapeRoom_room2_teleport",
        entryAnalyticName: "room2Entries",
      },
      {
        id: 3,
        puzzleNumbers: [6, 7],
        requiredPuzzleNumbers: [3, 4, 5],
        spawnUniqueName: "EscapeRoom_room3_teleport",
        entryAnalyticName: "room3Entries",
      },
    ],
    artifactScreens: [
      "Room1Artifact",
      "CrewPortrait1",
      "CrewPortrait2",
      "CrewPortrait3",
      "AlphaStation",
      "BetaStation",
      "OmegaStation",
      "Room3Artifact",
    ],
    transitions: [
      {
        fromRoom: 1,
        toRoom: 2,
        analyticName: "room2Entries",
        badgeKey: "POWER_RESTORED",
        walkPadUniqueName: "EscapeRoom_room1_teleportRoom2",
      },
      {
        fromRoom: 2,
        toRoom: 3,
        analyticName: "room3Entries",
        badgeKey: "SIGNAL_RECOVERED",
        walkPadUniqueName: "EscapeRoom_room2_teleportRoom3",
      },
    ],
    puzzleRewards: {
      1: { itemName: "Battery" },
      2: { itemName: "Fuse" },
      3: { itemName: "Wrench" },
      5: { itemName: "Circuit Chip" },
    },
    puzzleBadges: {
      6: [{ badgeKey: "AIRLOCK_ENGINEER" }],
      7: [{ badgeKey: "STATION_SURVIVOR" }, { badgeKey: "WARP_SPEED" }],
    },
    completionToast: "escaped",
  }),
  LIBRARY: defineTheme({
    themeID: "LIBRARY",
    displayName: "LIBRARY",
    rooms: [{
      id: 1,
      puzzleNumbers: [1, 2, 3, 4],
      requiredPuzzleNumbers: [],
      spawnUniqueName: "EscapeRoom_room1_teleport",
      entryAnalyticName: "room1Entries",
    }],
    artifactScreens: ["paper1", "paper2", "paper3", "paper4", "bookcase"],
    transitions: [],
    puzzleRewards: Object.fromEntries(
      Object.entries(LIBRARY_PUZZLE_REWARD_SELECTORS).map(([puzzle, selector]) => [
        puzzle,
        { selector },
      ]),
    ),
    puzzleBadges: {},
    completionToast: "libraryEscaped",
  }),
};

export const DEFAULT_THEME_ID: ThemeID = "SPACE";

export const getArtifactItemName = (screen: ArtifactScreen): string =>
  screen
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());

export const getFinalPuzzleNumber = (theme: ThemeConfig): number | undefined => {
  const puzzleNumbers = theme.rooms.flatMap((room) => room.puzzleNumbers);
  return puzzleNumbers.length > 0 ? Math.max(...puzzleNumbers) : undefined;
};

export const getDefaultPuzzles = (theme: ThemeConfig): Record<number, boolean> => ({
  ...theme.defaultPuzzles,
});

export const getInitialRoom = (theme: ThemeConfig): ThemeRoom => {
  const room = theme.rooms[0];
  if (!room) throw new Error(`Theme "${theme.themeID}" must define at least one room.`);
  return room;
};

export const isRoomReady = (
  theme: ThemeConfig,
  roomId: number,
  puzzlesCompleted: Record<number, boolean>,
): boolean => {
  const room = theme.rooms.find(({ id }) => id === roomId);
  return !!room && room.requiredPuzzleNumbers.every((number) => puzzlesCompleted[number] === true);
};

export const getCurrentRoomFromProgress = (
  theme: ThemeConfig,
  puzzlesCompleted: Record<number, boolean>,
): number | null => {
  const readyRooms = theme.rooms.filter(({ id }) => isRoomReady(theme, id, puzzlesCompleted));
  return readyRooms.length > 0 ? Math.max(...readyRooms.map(({ id }) => id)) : null;
};

export const isPuzzleInTheme = (theme: ThemeConfig, puzzleNumber: unknown): puzzleNumber is number =>
  typeof puzzleNumber === "number" &&
  theme.rooms.some((room) => room.puzzleNumbers.includes(puzzleNumber));
