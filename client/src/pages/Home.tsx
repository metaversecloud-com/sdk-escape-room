import { useContext, useEffect, useState } from "react";
import { PageContainer, ExitButton, InventoryDrawer, TimerBadge, LockedState, PuzzlePowerConsole } from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { droppedAsset, hasInteractiveParams, visitorData } = useContext(GlobalStateContext);
  const imgSrc = droppedAsset?.topLayerURL || droppedAsset?.bottomLayerURL;

  const visitorSession = visitorData ? Object.values(visitorData)[0] : null;
  const hasStarted = visitorSession?.sessionActive === true;
  const isExpired = visitorSession?.sessionExpired === true;
  const startedAt = visitorSession?.startTime ? new Date(visitorSession.startTime).getTime() : null;

  const [showInventory, setShowInventory] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const startGame = async () => {
    setIsLoading(true);
    try {
      const res = await backendAPI.post("/start-game");
      setGameState(dispatch, { visitorData: res.data.visitorData });
    } catch(e) { setErrorMessage(dispatch, e); }
    setIsLoading(false);
  };

  useEffect(() => {
    if (hasInteractiveParams) {
      backendAPI
        .get("/game-state")
        .then((response) => {
          setGameState(dispatch, response.data);
        })
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    }
  }, [hasInteractiveParams]);

  return (
    <PageContainer isLoading={isLoading} headerText="Escape Room Hub">
      <div className="flex items-center gap-2 mb-4">
        <TimerBadge startedAt={startedAt || undefined} />
        <button className="btn btn-ghost btn-sm" onClick={() => setShowInventory((v) => !v)}>
          Inventory
        </button>
        <ExitButton onExited={() => setGameState(dispatch, { visitorData: undefined })} />
      </div>

      <InventoryDrawer items={visitorSession?.inventory} isOpen={showInventory} onClose={() => setShowInventory(false)} />

      {isExpired && <LockedState title="Session Expired" message="30 minutes elapsed. Restart from the platform." />}

      {!hasStarted && !isExpired && (
        <div className="card p-4 flex flex-col gap-3">
          <p className="p2">Welcome! Click Start Game to begin your escape room session.</p>
          <button className="btn btn-primary" onClick={startGame} disabled={isLoading || !hasInteractiveParams}>
            {isLoading ? "Starting..." : "Start Game"}
          </button>
        </div>
      )}

      {hasStarted && !isExpired && (
        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <h3 className="h3 mb-2">Current Room</h3>
            <p className="p2">Room {visitorSession?.currentRoom || "A"}</p>
          </div>

          {visitorSession?.currentRoom === "A" && <PuzzlePowerConsole />}
          {/* Room sections are stubbed; Room owners can swap in their components or full pages */}
        </div>
      )}

      {imgSrc && (
        <div className="card p-4 mt-4">
          <h4 className="h4 mb-2">Dropped Asset Preview</h4>
          <img style={{ width: "100%", maxWidth: 380 }} alt="preview" src={imgSrc} />
        </div>
      )}
    </PageContainer>
  );
};

export default Home;
