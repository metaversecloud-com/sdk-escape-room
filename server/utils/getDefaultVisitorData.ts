import { VisitorData } from "@shared/types/VisitorData.js";

export const getDefaultVisitorData = (): VisitorData => {
  return {
    startTime: null,
    endTime: null,
    sessionActive: false,
    timedOut: false,
    currentRoom: null,
    puzzlesCompleted: {
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false,
      7: false,
    },
    completionTime: null,
    puzzleDrafts: {},
  };
};
