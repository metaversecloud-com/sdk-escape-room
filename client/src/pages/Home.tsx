// client/src/pages/Home.tsx
import { useContext, useEffect, useMemo, useState } from "react";
import { PageContainer, LockedState, RoomAPuzzle1, RoomAPuzzle2, RoomCPuzzle1, RoomCPuzzle2, RoomBPuzzle1, RoomBPuzzle2, RoomBPuzzle3 } from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState} from "@/utils";

type ScreenType = "start" | "exit" | "puzzle1" | "puzzle2" | "puzzle3" | "puzzle4" | "puzzle5" | "puzzle6" | "null";

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
      return "null";
  }
};

const StartGameCard = ({ onStart, isLoading }: { onStart: () => Promise<void>; isLoading: boolean }) => (
  <div className="card w-full" style={{ background: "linear-gradient(135deg, #0d1629 0%, #0a1120 100%)", borderColor: "#24304a" }}>
    <div className="card-details flex flex-col gap-3">
      <h3 className="card-title" style={{ color: "#f6b300", letterSpacing: "0.04em" }}>Escape Room Briefing</h3>
      <p className="card-description p2" style={{ color: "#c7d0e5" }}>
        Power is down across the facility. Restore systems, stabilize the reactor, and reach the exit airlock.
      </p>
      <div className="rounded-xl p-4" style={{ background: "rgba(23,33,52,0.75)", border: "1px solid #2f3c58" }}>
        <p className="p2" style={{ color: "#9babc7" }}>
          • Puzzle 1: Re-energize the power console.<br />
          • Puzzle 2: Prime the reactor switches.<br />
          • Continue through remaining rooms to escape.
        </p>
      </div>
      <div className="card-actions mt-2">
        <button
          className="btn"
          style={{
            background: "linear-gradient(135deg, #1f5ad7 0%, #1a4ebc 100%)",
            borderColor: "#1f5ad7",
            fontWeight: 700,
            letterSpacing: "0.02em",
            paddingTop: "12px",
            paddingBottom: "12px",
          }}
          onClick={onStart}
          disabled={isLoading}
        >
          Start Mission
        </button>
      </div>
    </div>
  </div>
);

const ExitGameCard = ({ onExit, isLoading }: { onExit: () => Promise<void>; isLoading: boolean }) => (
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
  const { hasInteractiveParams, visitorData } = useContext(GlobalStateContext);
  const visitorSession = visitorData || null;

  const screen = useMemo(() => getScreenFromSearch(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState("--:--");
  const [showInventory, setShowInventory] = useState(false);

  const hasStarted = visitorSession?.sessionActive === true;

  // simple timer display (mm:ss) once a session is active
  useEffect(() => {
    if (!hasStarted || !visitorSession?.startTime) {
      setElapsed("--:--");
      return;
    }
    const start = new Date(visitorSession.startTime).getTime();
    const tick = () => {
      const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
      const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
      const ss = String(seconds % 60).padStart(2, "0");
      setElapsed(`${mm}:${ss}`);
    };
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

  const StatusBar = () => (
    <div
      className="w-full"
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #0a1120 100%)",
        border: "1px solid #24304a",
        borderRadius: "16px",
        padding: "12px 16px",
        boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
      }}
    >
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 items-center">
          <span className="p2" style={{ color: "#c7d0e5", fontWeight: 700 }}>Timer: {elapsed}</span>
          <span className="p2" style={{ color: "#c7d0e5" }}>Room: {visitorSession?.currentRoom || "--"}</span>
        </div>
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            style={{ borderColor: "#2f3c58" }}
            onClick={() => setShowInventory(true)}
            disabled={!hasStarted}
          >
            Inventory
          </button>
          <button
            className="btn btn-outline"
            style={{ borderColor: "#2f3c58" }}
            onClick={exitGame}
            disabled={isLoading}
          >
            Exit
          </button>
        </div>
      </div>
    </div>
  );

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
        <StatusBar />

        {screen === "exit" && (
          <ExitGameCard onExit={exitGame} isLoading={isLoading} />
        )}

        {screen === "start" && (
          <InfoCard title="Game In Session" message="Your session is already running. Continue to the puzzle terminals." />
        )}

        {/* Room A Puzzles */}
        {screen === "puzzle1" && (
          visitorData?.puzzlesCompleted?.[1] ? (
            <InfoCard title="Puzzle Already Complete" message="You've already restored the power console." />
          ) : (
            <RoomAPuzzle1 refreshGameState={refreshGameState} isCompleted={visitorData?.puzzlesCompleted?.[1]} />
          )
        )}
        
        {screen === "puzzle2" && (
          visitorData?.puzzlesCompleted?.[2] ? (
            <InfoCard title="Puzzle Already Complete" message="You have already restored the reactor switch sequence." />
          ) : (
            <RoomAPuzzle2 refreshGameState={refreshGameState} />
          )
        )}

        {/* Room B Puzzle 1 - Your Satellite Alignment Puzzle */}
        {screen === "puzzle3" && (
          // Check if Room A is complete (puzzles 1 and 2)
          (!visitorData?.puzzlesCompleted?.[1] || !visitorData?.puzzlesCompleted?.[2]) ? (
            <LockedState 
              title="Room B Locked" 
              message="You must restore power in Room A before accessing the Comms Deck." 
            />
          ) : visitorData?.puzzlesCompleted?.[3] ? (
            <InfoCard title="Puzzle Already Complete" message="Satellites are aligned. Communications restored!" />
          ) : (
            <RoomBPuzzle1 refreshGameState={refreshGameState} />
          )
        )}

        {screen === "puzzle4" && (
          (!visitorData?.puzzlesCompleted?.[1] || !visitorData?.puzzlesCompleted?.[2]) ? (
            <LockedState 
              title="Room B Locked" 
              message="You must restore power in Room A before accessing the Comms Deck." 
            />
            ) : visitorData?.puzzlesCompleted?.[4] ? (
              <div className="transmission-reconstruct-success">
                <div className="success-animation">
                  <h2>Transmission Reconstructed!</h2>
                  <div className="reconstructed-message">
                    <h3>The torn fragments reveal a scrambled transmission:</h3>
                    <div className="scrambled-output">
                      <div className="scrambled-line">EVLAV</div>
                      <div className="scrambled-line">KLCO</div>
                      <div className="scrambled-line">EURSSRPE</div>
                    </div>
                    <p className="next-clue">These scrambled words hold the key to the next puzzle...</p>
                  </div>
                </div>
              </div>
            ) : (
              <RoomBPuzzle2 refreshGameState={refreshGameState} />
            )
        )}

        {screen === "puzzle5" && (
          // Check if Room B Puzzle 2 is complete (puzzle 4)
          (!visitorData?.puzzlesCompleted?.[4]) ? (
            <LockedState 
              title="Puzzle Locked" 
              message="You must reconstruct the transmission first before decoding it." 
            />
          ) : visitorData?.puzzlesCompleted?.[5] ? (
            <div className="valve-decode-success">
              <div className="success-animation">
                <div className="success-icon">🔓</div>
                <h2>Communications Stabilized!</h2>
                <div className="access-card-message">
                  <h3>🎫 ACCESS CARD ACQUIRED! 🎫</h3>
                  <p>Access card added to your inventory!</p>
                  <div className="partial-code">
                    <p>Partial Airlock Code Revealed:</p>
                    <div className="code-display">7 _ 3 _</div>
                  </div>
                </div>
                <p className="clue-text">Check your inventory to see the Access Card. Proceed to Room C!</p>
                <div className="signal-bars">
                  <div className="signal-bar active"></div>
                  <div className="signal-bar active"></div>
                  <div className="signal-bar active"></div>
                  <div className="signal-bar active"></div>
                  <div className="signal-bar active"></div>
                </div>
              </div>
            </div>
          ) : (
            <RoomBPuzzle3 refreshGameState={refreshGameState} />
          )
        )}

        {screen === "puzzle6" && (
          visitorData?.puzzlesCompleted?.[6] ? (
            <InfoCard title="Puzzle Already Complete" message="You have already completed this puzzle." />
          ) : (
            <RoomCPuzzle2 refreshGameState={refreshGameState} />
          )
        )}

        {screen === "null" && (
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