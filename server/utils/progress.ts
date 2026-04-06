// server/utils/progress.ts
import { VisitorData } from "../../shared/types/VisitorData.js";

export const canAccessPuzzle = (
  puzzleId: number,
  visitorData: VisitorData
): boolean => {
  if (!visitorData.sessionActive) return false;

  // Room A puzzles (1-2)
  if (puzzleId <= 2) {
    return visitorData.currentRoom === 'A';
  }
  
  // Room B puzzles (3-5)
  if (puzzleId >= 3 && puzzleId <= 5) {
    return visitorData.currentRoom === 'B';
  }
  
  // Room C puzzles (6)
  if (puzzleId === 6) {
    return visitorData.currentRoom === 'C';
  }
  
  return false;
};

export const isRoomComplete = (
  room: 'A' | 'B' | 'C',
  puzzlesCompleted: VisitorData['puzzlesCompleted']
): boolean => {
  if (room === 'A') {
    return puzzlesCompleted[1] && puzzlesCompleted[2];
  }
  if (room === 'B') {
    return puzzlesCompleted[3] && puzzlesCompleted[4] && puzzlesCompleted[5];
  }
  if (room === 'C') {
    return puzzlesCompleted[6];
  }
  return false;
};