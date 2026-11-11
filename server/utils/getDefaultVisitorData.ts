import { VisitorData } from "@shared/types/VisitorData.js";
import {
  DEFAULT_THEME_ID,
  getDefaultPuzzles,
  THEME_CONFIGS,
  ThemeConfig,
} from "@shared/themes.js";

export const getDefaultVisitorData = (
  theme: ThemeConfig = THEME_CONFIGS[DEFAULT_THEME_ID],
): VisitorData => {
  return {
    startTime: null,
    endTime: null,
    sessionActive: false,
    currentRoom: null,
    physicalRoom: null,
    puzzlesCompleted: getDefaultPuzzles(theme),
    completionTime: null,
    puzzleDrafts: {},
    wrongAttempts: {},
  };
};
