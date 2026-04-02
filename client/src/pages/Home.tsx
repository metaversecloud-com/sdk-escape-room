import { useContext, useEffect, useMemo, useState } from "react";
import { PageContainer, LockedState, RoomAPuzzle1, RoomAPuzzle2 } from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState} from "@/utils";
import { useLocation } from "react-router-dom";

type ScreenType = "start" | "exit" | "puzzle1" | "puzzle2" | "puzzle3" | "puzzle4" | "puzzle5" | "puzzle6" | null;

const getScreenFromSearch = (): ScreenType => {
  const params = new URLSearchParams(window.location.search);
  const screen = params.get("screen");

  switch (screen) {
    case "start":
      return "start";
    case "exit":
      return "exit";
    case "puzzle1":
      return "puzzle1";
    case "puzzle2":
      return "puzzle2";
    case "puzzle3":
      return "puzzle3";
    case "puzzle4":
      return "puzzle4";
    case "puzzle5":
      return "puzzle5";
    case "puzzle6":
      return "puzzle6";
    default:
      return null;
  }
};

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
      <p className="card-description p2">Click the button below to begin the escape room.</p>
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
      <p className="card-description p2">End your current session and return to the start area.</p>
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
  const {  hasInteractiveParams, visitorData } = useContext(GlobalStateContext);
  const visitorSession = visitorData || null;

  const screen = useMemo(() => getScreenFromSearch(), []);
  const [isLoading, setIsLoading] = useState(false);

  const hasStarted = visitorSession?.sessionActive === true;

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
    } catch(error) { setErrorMessage(dispatch, error as ErrorType); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (hasInteractiveParams) {
      setIsLoading(true);
      backendAPI
        .get("/game-state")
        .then((response) => {
          setGameState(dispatch, response.data);
        })
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [hasInteractiveParams, dispatch]);

  // Pre-start view
  if (!hasStarted) {
    return (
      <PageContainer isLoading={isLoading} headerText="Escape Room">
        <div className="flex flex-col w-full items-start gap-4">
          {screen === "start" && (
            <StartGameCard onStart={startGame} isLoading={isLoading || !hasInteractiveParams} />
          )}
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

  return (
    <PageContainer isLoading={isLoading} headerText="Escape Room">
      <div className="flex flex-col w-full items-start gap-4">
        {screen === "exit" && (
          <ExitGameCard onExit={exitGame} isLoading={isLoading} />
        )}

        {screen === "start" && (
          <InfoCard title="Game In Session" message="Your session is already running. Continue to the puzzle terminals." />
        )}

        {screen === "puzzle1" && (
          visitorData?.puzzlesCompleted?.[1] ? (
            <InfoCard title="Puzzle Already Complete" message="You’ve already restored the power console." />
          ) : (
            <RoomAPuzzle1 refreshGameState={refreshGameState} isCompleted={visitorData?.puzzlesCompleted?.[1]} />
          )
        )}
        {screen === "puzzle2" &&
          (visitorData?.puzzlesCompleted?.[2] ? (
            <InfoCard title="Puzzle Already Complete" message="You have already restored the reactor switch sequence." />
          ) : (
            <RoomAPuzzle2 refreshGameState={refreshGameState} />
          ))}

        {screen === "puzzle3" && (
          <InfoCard title="Room B Puzzle 1" message="This puzzle screen will be built next." />
        )}

        {screen === "puzzle4" && (
          <InfoCard title="Room B Puzzle 2" message="This puzzle screen will be built next." />
        )}

        {screen === "puzzle5" && (
          <InfoCard title="Room C Puzzle 1" message="This puzzle screen will be built next." />
        )}

        {screen === "puzzle6" && (
          <InfoCard title="Room C Puzzle 2" message="This puzzle screen will be built next." />
        )}

        {screen === null && (
          <InfoCard
            title="No Screen Selected"
            message="This asset is missing a screen query parameter. Use ?screen=start, ?screen=exit, or ?screen=puzzle1 through ?screen=puzzle6."
          />
        )}
      </div>
    </PageContainer>
  );
};

export default Home;
