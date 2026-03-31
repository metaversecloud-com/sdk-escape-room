import { useContext, useEffect, useState } from "react";
import { PageContainer, ExitButton, InventoryDrawer, TimerBadge, LockedState, PuzzlePowerConsole, RoomAPuzzle1, RoomAPuzzle2 } from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState, setActivePuzzle} from "@/utils";


const getPuzzleFromUniqueName = (uniqueName?: string): 1 | 2 | 3 | 4 | 5 | 6 | null => {
  switch (uniqueName) {
    case "room_a_puzzle_1":
      return 1;
    case "room_a_puzzle_2":
      return 2;
    case "room_b_puzzle_1":
      return 3;
    case "room_b_puzzle_2":
      return 4;
    case "room_c_puzzle_1":
      return 5;
    case "room_c_puzzle_2":
      return 6;
    default:
      return null;
  }
};

const NotStartedCard = ({ message }: { message: string }) => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">Puzzle Locked</h3>
      <p className="card-description p2">{message}</p>
    </div>
  </div>
);

const StartGameCard = ({ 
  onStart, 
  isLoading,
}: { 
  onStart: () => Promise<void>;
  isLoading: boolean;
}) => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">Escape Room Start</h3>
      <p className="card-description p2">Click the button below to start your adventure!</p>
      <div className="card-actions mt-4">
        <button className="btn" onClick={onStart} disabled={isLoading}>
          Start Game
        </button>
      </div>
    </div>
  </div>
);

const ExitGameCard = ({ 
  onExit, 
  isLoading,
}: { 
  onExit: () => Promise<void>;
  isLoading: boolean;
}) => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">Exit Escape Room</h3>
      <p className="card-description p2">End your current session and return to the start terminal.</p>
      <div className="card-actions mt-4">
        <button className="btn btn-outline" onClick={onExit} disabled={isLoading}>
          Exit Game
        </button>
      </div>
    </div>
  </div>
);

const InfoCard = ({ title, message }: { title: string; message: string }) => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">{title}</h3>
      <p className="card-description p2">{message}</p>
    </div>
  </div>
);

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { droppedAsset, hasInteractiveParams, activePuzzle, visitorData, uniqueName } = useContext(GlobalStateContext);
  const imgSrc = droppedAsset?.topLayerURL || droppedAsset?.bottomLayerURL;

  const visitorSession = visitorData || null;
  const hasStarted = visitorSession?.sessionActive === true;
  const startedAt = visitorSession?.startTime ? new Date(visitorSession.startTime).getTime() : null;
  const currentRoom = visitorData?.currentRoom || null;

  const [showInventory, setShowInventory] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const refreshGameState = async () => {
    const response = await backendAPI.get("/game-state");
    setGameState(dispatch, response.data);
    setActivePuzzle(dispatch, getPuzzleFromUniqueName(response.data?.uniqueName));
  };

  const startGame = async () => {
    setIsLoading(true);
    try {
      const res = await backendAPI.post("/start-game");
      setGameState(dispatch, res.data);
      setActivePuzzle(dispatch, null); // stay on start screen; user must walk to puzzle
    } catch(e) { setErrorMessage(dispatch, e); }
    setIsLoading(false);
  };

  const exitGame = async () => {
    setIsLoading(true);
    try {
      const res = await backendAPI.post("/exit");
      setGameState(dispatch, res.data);
      setActivePuzzle(dispatch, null);
    } catch(e) { setErrorMessage(dispatch, e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (hasInteractiveParams) {
      setIsLoading(true);
      backendAPI
        .get("/game-state")
        .then((response) => {
          setGameState(dispatch, response.data);
          setActivePuzzle(dispatch, getPuzzleFromUniqueName(response.data?.uniqueName));
        })
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [hasInteractiveParams]);

  // Pre-start view
  if (!hasStarted) {
    return (
      <PageContainer isLoading={isLoading} headerText="Escape Room">
        <div className="flex flex-col w-full items-start gap-4">
          {uniqueName === "escape_start_game" && (
            <StartGameCard onStart={startGame} isLoading={isLoading || !hasInteractiveParams} />
          )}

          {uniqueName === "escape_exit_game" && (
            <InfoCard title="No Game In Session" message="Start a game first before using the exit terminal." />
          )}

          {uniqueName !== "escape_start_game" && uniqueName !== "escape_exit_game" && (
            <LockedState title="Game Not Started" message="You must start the game at the start terminal before playing puzzles." />
          )}
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer isLoading={isLoading} headerText="Escape Room">
      <div className="flex flex-col w-full items-start gap-4">
        {uniqueName === "escape_exit_game" && (
          <ExitGameCard onExit={exitGame} isLoading={isLoading} />
        )}

        {uniqueName === "escape_start_game" && (
          <InfoCard title="Game In Session" message="Game already running. Proceed to the puzzle terminals." />
        )}

        {activePuzzle === 1 && hasStarted && (
          visitorData?.puzzlesCompleted?.[1] ? (
            <InfoCard title="Puzzle Already Complete" message="You’ve already restored the power console." />
          ) : (
            <RoomAPuzzle1 refreshGameState={refreshGameState} isCompleted={visitorData?.puzzlesCompleted?.[1]} />
          )
        )}
        {activePuzzle === 2 && hasStarted && (<RoomAPuzzle2 refreshGameState={refreshGameState}/>)}
        {activePuzzle === 3 && hasStarted && (<p className="p2">Room B Puzzle 1</p>)}
        {activePuzzle === 4 && hasStarted && (<p className="p2">Room B Puzzle 2</p>)}
        {activePuzzle === 5 && hasStarted && (<p className="p2">Room C Puzzle 1</p>)}
        {activePuzzle === 6 && hasStarted && (<p className="p2">Room C Puzzle 2</p>)}
        {!activePuzzle && <p className="p2">No puzzle selected</p>}
      </div>
    </PageContainer>
  );
};

export default Home;
