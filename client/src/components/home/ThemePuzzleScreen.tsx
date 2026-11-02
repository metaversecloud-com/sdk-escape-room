import { ThemeConfig } from "@shared/themes";

import { content } from "@/constants";
import { LeaderboardRowType } from "@/context/types";
import { ExitCongratsCard } from "@/components/home/ExitCongratsCard";
import { LockedState } from "@/components/LockedState";
import { PuzzleCompleteCard } from "@/components/puzzles/PuzzleCompleteCard";
import { Room1Puzzle1 } from "@/components/puzzles/Room1Puzzle1";
import { Room1Puzzle2 } from "@/components/puzzles/Room1Puzzle2";
import { Room2Puzzle1 } from "@/components/puzzles/Room2Puzzle1";
import { Room2Puzzle2 } from "@/components/puzzles/Room2Puzzle2";
import { Room2Puzzle3 } from "@/components/puzzles/Room2Puzzle3";
import { Room3Puzzle1 } from "@/components/puzzles/Room3Puzzle1";
import { Room3Puzzle2 } from "@/components/puzzles/Room3Puzzle2";
import { Puzzle1 as LibraryPuzzle1 } from "@/components/puzzles/library/Puzzle1";
import { Puzzle2 as LibraryPuzzle2 } from "@/components/puzzles/library/Puzzle2";
import { Puzzle3 as LibraryPuzzle3 } from "@/components/puzzles/library/Puzzle3";
import { Puzzle4 as LibraryPuzzle4 } from "@/components/puzzles/library/Puzzle4";

interface ThemePuzzleScreenProps {
  theme: ThemeConfig;
  puzzleNumber: number;
  puzzlesCompleted?: Record<number, boolean>;
  isRoomComplete: (roomId: number) => boolean;
  wasJustCompleted: (puzzleNumber: number) => boolean;
  isLoading: boolean;
  onTeleportToNextRoom: () => Promise<void>;
  refreshGameState: () => Promise<void>;
  completionTime?: number | null;
  leaderboard?: LeaderboardRowType[];
}

export const ThemePuzzleScreen = ({
  theme,
  puzzleNumber,
  puzzlesCompleted,
  isRoomComplete,
  wasJustCompleted,
  isLoading,
  onTeleportToNextRoom,
  refreshGameState,
  completionTime,
  leaderboard,
}: ThemePuzzleScreenProps) => {
  if (theme.themeID === "LIBRARY") {
    const libraryProps = {
      isCompleted: puzzlesCompleted?.[puzzleNumber] === true,
      isLoading,
      refreshGameState,
    };
    switch (puzzleNumber) {
      case 1:
        return <LibraryPuzzle1 {...libraryProps} />;
      case 2:
        return <LibraryPuzzle2 {...libraryProps} />;
      case 3:
        return <LibraryPuzzle3 {...libraryProps} />;
      case 4:
        return <LibraryPuzzle4 {...libraryProps} />;
      default:
        return <LockedState title="Puzzle unavailable" message="This puzzle is not configured for the LIBRARY theme." />;
    }
  }

  const showCompleteCard = (number: 1 | 2 | 3 | 5 | 6, canTeleport = false) => (
    <PuzzleCompleteCard
      {...(wasJustCompleted(number) ? content.puzzles[number].complete : content.puzzles[number].alreadyComplete)}
      playAcquisitionAnimation={wasJustCompleted(number)}
      showTeleportButton={canTeleport && isRoomComplete(getRoomId(number))}
      onTeleportToNextRoom={onTeleportToNextRoom}
      isTeleporting={isLoading}
    />
  );

  const getRoomId = (number: number) =>
    theme.rooms.find((room) => room.puzzleNumbers.includes(number))?.id ?? 1;

  const room2Done = isRoomComplete(2);
  const room1Done = isRoomComplete(1);

  switch (puzzleNumber) {
    case 1:
      return puzzlesCompleted?.[1] ? showCompleteCard(1, true) : <Room1Puzzle1 refreshGameState={refreshGameState} />;
    case 2:
      return puzzlesCompleted?.[2] ? showCompleteCard(2, true) : <Room1Puzzle2 refreshGameState={refreshGameState} />;
    case 3:
      return !room1Done ? (
        <LockedState title={content.states.room2Locked.title} message={content.states.room2Locked.message} />
      ) : puzzlesCompleted?.[3] ? (
        showCompleteCard(3, true)
      ) : (
        <Room2Puzzle1 refreshGameState={refreshGameState} />
      );
    case 4:
      return !room1Done ? (
        <LockedState title={content.states.room2Locked.title} message={content.states.room2Locked.message} />
      ) : puzzlesCompleted?.[4] ? (
        <PuzzleCompleteCard
          {...(wasJustCompleted(4) ? content.puzzles[4].complete : content.puzzles[5].alreadyComplete)}
          playAcquisitionAnimation={wasJustCompleted(4)}
        >
          <div className="er-reconstructed-message my-2 p-3 grid gap-3">
            <h4>{content.puzzles[4].complete.heading}</h4>
            <div className="er-scrambled-output my-2">
              {content.puzzles[4].complete.scrambled.map((line) => (
                <div key={line} className="er-scrambled-line">
                  {line}
                </div>
              ))}
            </div>
          </div>
          <p className="er-next-clue">{content.puzzles[4].complete.teaser}</p>
        </PuzzleCompleteCard>
      ) : (
        <Room2Puzzle2 refreshGameState={refreshGameState} />
      );
    case 5:
      return !puzzlesCompleted?.[4] ? (
        <LockedState title={content.states.puzzle5Locked.title} message={content.states.puzzle5Locked.message} />
      ) : puzzlesCompleted?.[5] ? (
        showCompleteCard(5, true)
      ) : (
        <Room2Puzzle3 refreshGameState={refreshGameState} />
      );
    case 6:
      return !room2Done ? (
        <LockedState title={content.states.room3Locked.title} message={content.states.room3Locked.message} />
      ) : puzzlesCompleted?.[6] ? (
        showCompleteCard(6)
      ) : (
        <Room3Puzzle1 refreshGameState={refreshGameState} />
      );
    case 7:
      return !room2Done ? (
        <LockedState title={content.states.room3Locked.title} message={content.states.room3Locked.message} />
      ) : !puzzlesCompleted?.[6] ? (
        <LockedState title={content.states.finalPuzzleLocked.title} message={content.states.finalPuzzleLocked.message} />
      ) : puzzlesCompleted?.[7] ? (
        <ExitCongratsCard completionTime={completionTime} leaderboard={leaderboard} />
      ) : (
        <Room3Puzzle2 refreshGameState={refreshGameState} />
      );
    default:
      return <LockedState title="Puzzle unavailable" message="This puzzle is not configured for the SPACE theme." />;
  }
};
