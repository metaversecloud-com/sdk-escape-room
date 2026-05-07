import { useContext, useEffect, useMemo, useState } from "react";

import {
  ConfirmationModal,
  ExitCongratsCard,
  ExitGameCard,
  InfoCard,
  InventoryPanel,
  LeaderboardPanel,
  LockedState,
  PageContainer,
  PageFooter,
  RoomAPuzzle1Complete,
  RoomAPuzzle2Complete,
  RoomBPuzzle1Complete,
  RoomBPuzzle2Complete,
  RoomBPuzzle3Complete,
  RoomCPuzzle1Complete,
  RoomAPuzzle1,
  RoomAPuzzle2,
  RoomBIntroCard,
  RoomBPuzzle1,
  RoomBPuzzle2,
  RoomBPuzzle3,
  RoomCPuzzle1,
  RoomCPuzzle2,
  SessionRunningCard,
  StartGameCard,
  StatusBar,
} from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, formatElapsedFromTimestamp, setErrorMessage, setGameState } from "@/utils";

type ScreenType =
  | "start"
  | "exit"
  | "leaderboard"
  | "puzzle1"
  | "puzzle2"
  | "puzzle3"
  | "puzzle4"
  | "puzzle5"
  | "puzzle6"
  | "puzzle7"
  | "null";

const SCREENS: ScreenType[] = [
  "start",
  "exit",
  "leaderboard",
  "puzzle1",
  "puzzle2",
  "puzzle3",
  "puzzle4",
  "puzzle5",
  "puzzle6",
  "puzzle7",
];

const isScreen = (value: string | null): value is ScreenType => value !== null && (SCREENS as string[]).includes(value);

const getScreenFromSearch = (): ScreenType => {
  const screen = new URLSearchParams(window.location.search).get("screen");
  return isScreen(screen) ? screen : "null";
};

const getForceRefreshInventoryFromSearch = () =>
  new URLSearchParams(window.location.search).get("forceRefreshInventory") === "true";

const ROOM_B_LOCKED_MESSAGE = "You must restore power in Room A before accessing the Comms Deck.";
const ROOM_C_LOCKED_MESSAGE = "You must complete Room B before accessing the reactor control room.";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, visitorData, visitorInventory, leaderboard, hasSessionExpired } =
    useContext(GlobalStateContext);
  const visitorSession = visitorData || null;
  const puzzlesCompleted = visitorSession?.puzzlesCompleted;

  const screen = useMemo(() => getScreenFromSearch(), []);
  const forceRefreshInventory = useMemo(() => getForceRefreshInventoryFromSearch(), []);

  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState("--:--");
  const [showInventory, setShowInventory] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showRoomBIntro, setShowRoomBIntro] = useState(false);

  const hasStarted = visitorSession?.sessionActive === true;
  const isFinished = puzzlesCompleted?.[7] === true;
  const roomADone = !!(puzzlesCompleted?.[1] && puzzlesCompleted?.[2]);
  const roomBDone = !!(puzzlesCompleted?.[3] && puzzlesCompleted?.[4] && puzzlesCompleted?.[5]);

  // Live timer display once a session is active
  useEffect(() => {
    if (!hasStarted || !visitorSession?.startTime) {
      setElapsed("--:--");
      return;
    }
    const startMs = new Date(visitorSession.startTime).getTime();
    const tick = () => setElapsed(formatElapsedFromTimestamp(startMs));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [hasStarted, visitorSession?.startTime]);

  const refreshGameState = async () => {
    const response = await backendAPI.get("/game-state");
    setGameState(dispatch, response.data);
  };

  const startGame = async () => {
    setIsLoading(true);
    try {
      const res = await backendAPI.post("/start-game");
      setGameState(dispatch, res.data);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    }
    setIsLoading(false);
  };

  const exitGame = async () => {
    setIsLoading(true);
    try {
      const res = await backendAPI.post("/exit");
      setGameState(dispatch, res.data);
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    }
    setIsLoading(false);
  };

  // Initial game-state fetch
  useEffect(() => {
    if (!hasInteractiveParams) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    backendAPI
      .get("/game-state", { params: { forceRefreshInventory } })
      .then((response) => setGameState(dispatch, response.data))
      .catch((error) => setErrorMessage(dispatch, error as ErrorType))
      .finally(() => setIsLoading(false));
  }, [hasInteractiveParams, dispatch, forceRefreshInventory]);

  // After Room A puzzles 1+2 are both done, show the Room B intro card 5s later
  useEffect(() => {
    const onRoomAScreen = screen === "puzzle1" || screen === "puzzle2";
    if (!(onRoomAScreen && roomADone)) {
      setShowRoomBIntro(false);
      return;
    }
    setShowRoomBIntro(false);
    const id = window.setTimeout(() => setShowRoomBIntro(true), 5000);
    return () => window.clearTimeout(id);
  }, [screen, roomADone]);

  // ── Standalone screens (own PageContainer) ──
  if (screen === "leaderboard") {
    return (
      <PageContainer isLoading={isLoading} headerText="Leaderboard">
        <div className="flex-col gap-4">
          <LeaderboardPanel leaderboard={leaderboard} />
        </div>
      </PageContainer>
    );
  }

  if (screen === "puzzle7" && isFinished) {
    return (
      <PageContainer isLoading={isLoading}>
        <div className="flex flex-col w-full items-start gap-4">
          <ExitCongratsCard completionTime={visitorSession?.completionTime} leaderboard={leaderboard} />
        </div>
      </PageContainer>
    );
  }

  // ── Session Expired view ──
  if (hasSessionExpired) {
    return (
      <PageContainer isLoading={isLoading}>
        <div className="flex flex-col w-full items-start gap-4">
          <LockedState title="Time has run out" message="Click on the start terminal to start a new game." />
        </div>
      </PageContainer>
    );
  }

  // ── Pre-start view ──
  if (!hasStarted) {
    return (
      <PageContainer isLoading={isLoading}>
        <div className="flex flex-col w-full items-start gap-4">
          {screen === "start" && <StartGameCard onStart={startGame} isLoading={isLoading || !hasInteractiveParams} />}
          {screen === "exit" && (
            <InfoCard title="No Active Session" message="Start the game first before using the exit terminal." />
          )}
          {screen !== "start" && screen !== "exit" && (
            <LockedState
              title="Game Not Started"
              message="You must begin at the start terminal before accessing any puzzle."
            />
          )}
        </div>
      </PageContainer>
    );
  }

  // ── In-game view ──
  return (
    <PageContainer isLoading={isLoading}>
      <div className="flex flex-col w-full items-start gap-4">
        {!isFinished && (
          <StatusBar
            elapsed={elapsed}
            currentRoom={visitorSession?.currentRoom}
            onOpenInventory={() => setShowInventory(true)}
            hasStarted={hasStarted}
          />
        )}
        {showInventory && (
          <InventoryPanel
            onClose={() => setShowInventory(false)}
            visitorData={visitorSession}
            inventoryItems={visitorInventory?.items}
          />
        )}

        {screen === "exit" && <ExitGameCard onExit={() => setShowExitConfirmation(true)} isLoading={isLoading} />}

        {showExitConfirmation && (
          <ConfirmationModal
            title="Exit Game"
            message="Are you sure you want to exit the game? Your progress will NOT be saved."
            handleOnConfirm={exitGame}
            handleToggleShowConfirmationModal={() => setShowExitConfirmation(false)}
          />
        )}

        {screen === "start" && <SessionRunningCard />}

        {/* Room A — Puzzles 1 & 2 */}
        {screen === "puzzle1" &&
          (puzzlesCompleted?.[1] ? (
            showRoomBIntro ? (
              <RoomBIntroCard />
            ) : (
              <RoomAPuzzle1Complete />
            )
          ) : (
            <RoomAPuzzle1 refreshGameState={refreshGameState} />
          ))}

        {screen === "puzzle2" &&
          (puzzlesCompleted?.[2] ? (
            showRoomBIntro ? (
              <RoomBIntroCard />
            ) : (
              <RoomAPuzzle2Complete />
            )
          ) : (
            <RoomAPuzzle2 refreshGameState={refreshGameState} />
          ))}

        {/* Room B — Puzzles 3, 4, 5 */}
        {screen === "puzzle3" &&
          (!roomADone ? (
            <LockedState title="Room B Locked" message={ROOM_B_LOCKED_MESSAGE} />
          ) : puzzlesCompleted?.[3] ? (
            <RoomBPuzzle1Complete />
          ) : (
            <RoomBPuzzle1 refreshGameState={refreshGameState} />
          ))}

        {screen === "puzzle4" &&
          (!roomADone ? (
            <LockedState title="Room B Locked" message={ROOM_B_LOCKED_MESSAGE} />
          ) : puzzlesCompleted?.[4] ? (
            <RoomBPuzzle2Complete />
          ) : (
            <RoomBPuzzle2 refreshGameState={refreshGameState} />
          ))}

        {screen === "puzzle5" &&
          (!puzzlesCompleted?.[4] ? (
            <LockedState
              title="Puzzle Locked"
              message="You must reconstruct the transmission first before decoding it."
            />
          ) : puzzlesCompleted?.[5] ? (
            <RoomBPuzzle3Complete />
          ) : (
            <RoomBPuzzle3 refreshGameState={refreshGameState} />
          ))}

        {/* Room C — Puzzles 6 & 7 */}
        {screen === "puzzle6" &&
          (!roomBDone ? (
            <LockedState title="Room C Locked" message={ROOM_C_LOCKED_MESSAGE} />
          ) : puzzlesCompleted?.[6] ? (
            <RoomCPuzzle1Complete />
          ) : (
            <RoomCPuzzle1 refreshGameState={refreshGameState} />
          ))}

        {screen === "puzzle7" &&
          (!roomBDone ? (
            <LockedState title="Room C Locked" message={ROOM_C_LOCKED_MESSAGE} />
          ) : !puzzlesCompleted?.[6] ? (
            <LockedState
              title="Final Puzzle Locked"
              message="Complete Puzzle 6 before attempting the final escape sequence."
            />
          ) : puzzlesCompleted?.[7] ? (
            <ExitCongratsCard completionTime={visitorSession?.completionTime} leaderboard={leaderboard} />
          ) : (
            <RoomCPuzzle2 refreshGameState={refreshGameState} />
          ))}

        {screen === "null" && (
          <InfoCard
            title="No Screen Selected"
            message="This asset is missing a screen query parameter. Use ?screen=start, ?screen=exit, or ?screen=puzzle1 through ?screen=puzzle7."
          />
        )}
      </div>

      {!isFinished && (
        <PageFooter>
          <button className="btn btn-danger w-full" onClick={() => setShowExitConfirmation(true)} disabled={isLoading}>
            Exit
          </button>
        </PageFooter>
      )}
    </PageContainer>
  );
};

export default Home;
