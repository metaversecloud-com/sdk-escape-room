import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import {
  ArtifactGrantCard,
  ArtifactGrantState,
  BadgesTab,
  DecoyCard,
  DecoyState,
  ExitCongratsCard,
  InfoCard,
  InventoryPanel,
  Leaderboard,
  LockedState,
  PageContainer,
  RoomIntroCard,
  SessionInProgressCard,
  StartGameCard,
  StatusBar,
  ThemePuzzleScreen,
} from "@/components";
import { content } from "@/constants";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, formatElapsedFromTimestamp, setErrorMessage, setGameState } from "@/utils";
import { getFinalPuzzleNumber } from "@shared/themes";
import {
  getPuzzleNumberFromScreen,
  getRoomForScreen,
  isArtifactScreen,
  isRoomComplete,
  isThemeComplete,
  resolveThemeScreen,
  SPACE_THEME,
  ThemeScreen,
} from "@/utils/themeRouting";

const { states, exitConfirmation, exitButton, teleport } = content;

/**
 * Derives the ecosystem inventory item name from a `?screen=` value by
 * inserting spaces around camelCase boundaries and digit boundaries:
 *   Room1Artifact  → "Room 1 Artifact"
 *   CrewPortrait1   → "Crew Portrait 1"
 *   AlphaStation    → "Alpha Station"
 */
const screenToItemName = (screen: string): string =>
  screen
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([a-zA-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-zA-Z])/g, "$1 $2");

/** Result of a /teleport call. `checking` is the local pre-response state. */
type TeleportState =
  | { state: "checking" }
  | { state: "teleported"; targetRoom: number }
  | { state: "blocked"; reason: string };

/**
 * Screens that should never trigger a walk-to-asset, regardless of room.
 * - `start`: the start terminal opens the briefing; the player's avatar is
 *   already next to it.
 * - `exit`: confirmation page — moving the avatar is confusing here.
 * - `leaderboard`: a viewable terminal; walking the avatar isn't useful.
 * - `teleport`: the teleport endpoint already moves the visitor when it
 *   succeeds, so a separate walk would be redundant or fight the teleport.
 * - `decoy`: easter-egg trash assets — yanking the avatar over reveals the
 *   asset's location to other players nearby, which spoils the find.
 */
const SCREENS_WITHOUT_WALK: ReadonlySet<ThemeScreen> = new Set(["start", "exit", "leaderboard", "teleport", "decoy"]);

const getForceRefreshInventoryFromSearch = () =>
  new URLSearchParams(window.location.search).get("forceRefreshInventory") === "true";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const {
    hasInteractiveParams,
    visitorData,
    visitorInventory,
    leaderboard,
    teamLeaderboard,
    badges,
    theme: configuredTheme,
  } = useContext(GlobalStateContext);
  const theme = configuredTheme ?? SPACE_THEME;
  const visitorSession = visitorData || null;
  const puzzlesCompleted = visitorSession?.puzzlesCompleted;

  const rawScreen = useMemo(() => new URLSearchParams(window.location.search).get("screen"), []);
  const screen = resolveThemeScreen(rawScreen, theme);
  const forceRefreshInventory = useMemo(() => getForceRefreshInventoryFromSearch(), []);

  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedInitialGameState, setHasLoadedInitialGameState] = useState(false);
  const isPageLoading =
    isLoading || (!!hasInteractiveParams && !hasLoadedInitialGameState);
  const [timer, setTimer] = useState("--:--");
  const [showInventory, setShowInventory] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<"leaderboard" | "badges">("leaderboard");
  const [teleportState, setTeleportState] = useState<TeleportState>({ state: "checking" });
  // Local state superset — `ArtifactGrantCard` itself doesn't render a locked
  // variant (we render `LockedState` for that case below), but the server can
  // still return `locked: true` which we track here.
  type ArtifactLocalState = ArtifactGrantState | { state: "locked"; requiredRoom: number };
  const [artifactState, setArtifactState] = useState<ArtifactLocalState>({ state: "loading" });
  const [decoyState, setDecoyState] = useState<DecoyState>({ state: "loading" });

  const hasStarted = visitorSession?.sessionActive === true;
  const puzzleNumber = getPuzzleNumberFromScreen(screen);
  const roomScreenId = screen.startsWith("room") ? getRoomForScreen(screen, theme) : undefined;
  const isFinished = isThemeComplete(theme, puzzlesCompleted);

  // Track puzzles that flipped from false → true *within this iframe session*
  // so PuzzleCompleteCard can show the rich just-acquired copy + fire the
  // acquisition-flight animation. On a fresh iframe load where the puzzle is
  // already complete, this set stays empty — the card shows the trimmed
  // `alreadyComplete` copy with no animation. Mutating a ref during render
  // is safe because the comparison is idempotent.
  const prevPuzzlesCompletedRef = useRef<typeof puzzlesCompleted>(undefined);
  const justCompletedRef = useRef<Set<number>>(new Set());
  if (puzzlesCompleted) {
    const prev = prevPuzzlesCompletedRef.current;
    if (prev !== undefined) {
      theme.rooms.flatMap((room) => room.puzzleNumbers).forEach((n) => {
        if (puzzlesCompleted[n] && !prev[n]) justCompletedRef.current.add(n);
      });
    }
    prevPuzzlesCompletedRef.current = puzzlesCompleted;
  }
  const wasJustCompleted = (n: number) => justCompletedRef.current.has(n);

  // Live count-up stopwatch. The game has no time limit — this just keeps
  // ticking upward for as long as the session is active, so a player can see
  // their elapsed time in the status bar and the leaderboard scores the same
  // count on completion.
  useEffect(() => {
    if (!hasStarted || !visitorSession?.startTime) {
      setTimer("--:--");
      return;
    }
    const startMs = new Date(visitorSession.startTime).getTime();
    const tick = () => setTimer(formatElapsedFromTimestamp(startMs));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [hasStarted, visitorSession?.startTime]);

  const refreshGameState = useCallback(async () => {
    const response = await backendAPI.get("/game-state");
    setGameState(dispatch, response.data);
  }, [dispatch]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const required = ["assetId", "displayName", "interactiveNonce", "profileId", "sceneDropId", "urlSlug", "visitorId"];
    if (!required.every((key) => params.get(key))) return;

    const eventSource = new EventSource(`/api/sse?${params.toString()}`);
    const heartbeat = window.setInterval(() => {
      backendAPI.get("/heartbeat").catch(() => undefined);
    }, 15000);

    eventSource.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload?.kind === "GAME_COMPLETED") {
          try {
            await backendAPI.post("/teleport", { room: "start" });
          } catch (error) {
            console.error("FINAL TEAM TELEPORT REQUEST FAILED", error);
          }

          await refreshGameState();
          return;
        }

        if (payload?.kind === "state:update" || payload?.success === true) {
          await refreshGameState();
        }
      } catch {
        // Ignore malformed SSE payloads and continue listening.
      }
    };

    eventSource.onerror = () => {
      // EventSource will automatically retry.
    };

    return () => {
      eventSource.close();
      window.clearInterval(heartbeat);
    };
  }, [hasInteractiveParams, refreshGameState]);

  // Sticky for the lifetime of this iframe — flips true the first time the
  // player hits the Start button so the post-click render shows the Room 1
  // intro instead of the SessionInProgressCard. A separate click on the
  // start terminal later opens a fresh iframe (justStarted starts false
  // again), which is when we want the in-progress restart/teleport options.
  const [justStarted, setJustStarted] = useState(false);

  const startGame = async (options?: { multiplayer: boolean; teamId?: string }) => {
    setIsLoading(true);
    try {
      const payload = {
        multiplayer: options?.multiplayer ?? false,
        ...(options?.teamId ? { teamId: options.teamId } : {}),
      };
      const res = await backendAPI.post("/start-game", payload);

      if (res.data?.waitingForLeader) {
        setErrorMessage(dispatch, { message: res.data.message || "Waiting for the team leader to start the game." });
        setIsLoading(false);
        return;
      }

      setGameState(dispatch, res.data);
      setJustStarted(true);
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

  // Closes the iframe without ending the session — the "Stay Here" path off
  // the exit confirmation. Server-side calls visitor.closeIframe(assetId).
  const stayHere = async () => {
    setIsLoading(true);
    try {
      await backendAPI.post("/close-iframe");
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    }
    setIsLoading(false);
  };

  // Teleport the player back to the room they should currently be in
  // (`currentRoom` = progression). Reuses the same /teleport endpoint the
  // in-world teleport pads use; the server checks isReady (always true for
  // the player's own currentRoom) and updates physicalRoom on success.
  const teleportToCurrentRoom = async () => {
    const target = visitorSession?.currentRoom;
    if (!target) return;
    setIsLoading(true);
    try {
      const res = await backendAPI.post("/teleport", { room: target });
      setGameState(dispatch, res.data);
      await backendAPI.post("/close-iframe");
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    }
    setIsLoading(false);
  };

  // Teleport screen — fired when the player clicks an in-world teleport pad.
  // The asset's iframe URL carries `?screen=teleport` and optionally `&room=N`
  // (N = 1/2/3, the destination). Server checks prerequisites and either
  // performs the teleport or refuses; we render the appropriate copy below.
  useEffect(() => {
    if (screen !== "teleport" || !hasInteractiveParams) return;
    setTeleportState({ state: "checking" });
    const targetRoom = new URLSearchParams(window.location.search).get("room");
    backendAPI
      .post("/teleport", { room: targetRoom })
      .then((res) => {
        console.log("FRONTEND TELEPORT RESPONSE", res.data);
        // Dispatch so visitorData stays in sync with the server response.
        setGameState(dispatch, res.data);
        if (res.data?.teleported) {
          setTeleportState({ state: "teleported", targetRoom: res.data.targetRoom });
        } else {
          setTeleportState({ state: "blocked", reason: res.data?.reason ?? "incomplete" });
        }
      })
      .catch((error) => setErrorMessage(dispatch, error as ErrorType));
  }, [screen, hasInteractiveParams, dispatch]);

  // Decoy / trash screen — fires /discover-decoy on mount which awards the
  // Trash Digger badge (idempotent — server short-circuits on re-clicks).
  // The Badge Awarded toast comes from awardBadge on the server; we just
  // refresh the local inventory so the badges tab updates.
  useEffect(() => {
    if (!hasInteractiveParams) return;
    if (screen !== "decoy") return;
    setDecoyState({ state: "loading" });
    backendAPI
      .post("/discover-decoy")
      .then((res) => {
        if (res.data?.visitorInventory) {
          setGameState(dispatch, { visitorInventory: res.data.visitorInventory });
        }
        setDecoyState({ state: "discovered", alreadyHad: res.data?.alreadyHad === true });
      })
      .catch((err: unknown) => setErrorMessage(dispatch, err as ErrorType));
  }, [screen, hasInteractiveParams, dispatch]);

  // Artifact / collectible screen — derives the item name from `?screen=`,
  // posts to /grant-item (idempotent — server returns alreadyHad: true on
  // repeat clicks), and dispatches the fresh visitorInventory so the panel
  // shows the new item immediately.
  useEffect(() => {
    if (!hasInteractiveParams) return;
    if (!isArtifactScreen(screen)) return;
    setArtifactState({ state: "loading" });
    const itemName = screenToItemName(screen);
    backendAPI
      .post("/grant-item", { itemName })
      .then((res) => {
        if (res.data?.locked === true) {
          setArtifactState({ state: "locked", requiredRoom: Number(res.data.requiredRoom) || 0 });
          return;
        }
        if (res.data?.visitorInventory) {
          setGameState(dispatch, { visitorInventory: res.data.visitorInventory });
        }
        setArtifactState({
          state: "granted",
          item: res.data?.item ?? null,
          alreadyHad: res.data?.alreadyHad === true,
        });
      })
      .catch((err: unknown) => {
        // 404 (item missing from ecosystem) is the most common case — surface
        // it cleanly. Other errors fall through to the global error handler.
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setArtifactState({ state: "notFound" });
        } else {
          setErrorMessage(dispatch, err as ErrorType);
        }
      });
  }, [screen, hasInteractiveParams, dispatch]);

  // Initial game-state fetch
  useEffect(() => {
    if (!hasInteractiveParams) {
      setIsLoading(false);
      return;
    }
    setHasLoadedInitialGameState(false);
    setIsLoading(true);
    backendAPI
      .get("/game-state", { params: { forceRefreshInventory } })
      .then((response) => setGameState(dispatch, response.data))
      .catch((error) => setErrorMessage(dispatch, error as ErrorType))
      .finally(() => {
        setHasLoadedInitialGameState(true);
        setIsLoading(false);
      });
  }, [hasInteractiveParams, dispatch, forceRefreshInventory]);

  // Walk the visitor to the asset they clicked to open this iframe.
  //
  // Fires once per Home mount, gated on:
  //   1. hasInteractiveParams — credentials available.
  //   2. visitorData loaded — we need to know physicalRoom before deciding.
  //   3. The asset's required room matches the visitor's *physical* room
  //      (SCREEN_REQUIRED_ROOM[screen] === visitor.physicalRoom). Strict
  //      equality — we don't walk forward to an unreached room, AND we
  //      don't walk backward to a cleared room (e.g. clicking a Room 2
  //      asset while standing in Room 3 should NOT yank the avatar back).
  // The walkedRef pin makes this idempotent — once we've made the decision
  // (walk or skip), we don't re-fire on subsequent visitor-data updates.
  // Fire-and-forget — the walk happens in the world independently of any UI.
  const walkedRef = useRef(false);
  useEffect(() => {
    if (walkedRef.current) return;
    if (!hasInteractiveParams) return;
    if (!visitorData) return;

    // Some screens (exit terminal) intentionally don't walk the player —
    // they're standalone confirmation pages where moving the avatar would
    // be confusing.
    if (SCREENS_WITHOUT_WALK.has(screen)) {
      walkedRef.current = true;
      return;
    }

    // Use physicalRoom (set on teleport) as source of truth — falls back to
    // currentRoom for legacy sessions that pre-date physicalRoom.
    const requiredRoom = getRoomForScreen(screen, theme);
    const playerRoom = visitorData.physicalRoom ?? visitorData.currentRoom ?? 0;
    if (requiredRoom && requiredRoom !== playerRoom) {
      walkedRef.current = true;
      return;
    }

    walkedRef.current = true;
    // Pass the current screen so the server can apply its own gate — that's
    // how artifact screens (whose required-room lives in ecosystem metadata,
    // not the client) get walk-refused if the visitor's progression is below
    // the artifact's room.
    backendAPI.post("/walk-to-asset", { screen }).catch(() => {
      // Swallow errors silently — failing to walk shouldn't surface as a
      // user-facing error. The screen content still rendered correctly.
    });
  }, [hasInteractiveParams, visitorData, screen, theme]);

  // ── Standalone screens (own PageContainer) ──
  if (screen === "leaderboard") {
    const tabCopy = content.leaderboard.tabs;
    const tabs: Array<{ id: "leaderboard" | "badges"; label: string }> = [
      { id: "leaderboard", label: tabCopy.leaderboard },
      { id: "badges", label: tabCopy.badges },
    ];
    return (
      <PageContainer isLoading={isPageLoading} headerText={content.leaderboard.pageTitle}>
        <div className="flex-col gap-4">
          <div className="flex gap-2 mb-4" role="tablist">
            {tabs.map((tab) => {
              const active = leaderboardTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={active ? "btn btn-outline" : "btn "}
                  onClick={() => setLeaderboardTab(tab.id)}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          {leaderboardTab === "leaderboard" ? (
            <Leaderboard
              leaderboard={leaderboard}
              teamLeaderboard={teamLeaderboard}
            />
          ) : (
            <BadgesTab badges={badges} earned={visitorInventory?.badges} />
          )}
        </div>
      </PageContainer>
    );
  } else if (puzzleNumber === getFinalPuzzleNumber(theme) && isFinished) {
    return (
      <PageContainer isLoading={isPageLoading}>
        <div className="flex flex-col w-full items-start gap-4">
          <ExitCongratsCard completionTime={visitorSession?.completionTime} leaderboard={leaderboard} />
        </div>
      </PageContainer>
    );
  } else if (!hasStarted) {
    // ── Pre-start view ──
    return (
      <PageContainer isLoading={isPageLoading}>
        <div className="flex flex-col w-full items-start gap-4">
          {screen === "start" ? (
            <StartGameCard theme={theme} onStart={startGame} isLoading={isPageLoading || !hasInteractiveParams} />
          ) : (
            <LockedState title={states.gameNotStarted.title} message={states.gameNotStarted.message} />
          )}
        </div>
      </PageContainer>
    );
  }

  // ── In-game view ──
  return (
    <PageContainer isLoading={isPageLoading}>
      <div className="flex flex-col w-full items-start gap-4">
        {!isFinished && (
          <StatusBar
            timer={timer}
            currentRoom={visitorSession?.currentRoom}
            onOpenInventory={() => setShowInventory(true)}
            hasStarted={hasStarted}
          />
        )}
        {showInventory && (
          <InventoryPanel onClose={() => setShowInventory(false)} inventoryItems={visitorInventory?.items} />
        )}

        {screen === "exit" && (
          // Exit terminal — its own in-world asset. Clicking it brings the
          // player here; the page is the confirmation. "Stay Here" closes
          // the iframe without ending the session; "Exit" ends the run.
          <div className="card w-full">
            <div className="card-details">
              <h3 className="card-title">{exitConfirmation.title}</h3>
              <p className="card-description p2 pt-2">{exitConfirmation.message}</p>
              <div className="card-actions mt-2 flex flex-col sm:flex-row gap-3">
                <button className="btn btn-outline" onClick={stayHere} disabled={isLoading}>
                  {exitConfirmation.stayButton}
                </button>
                <button className="btn btn-danger" onClick={exitGame} disabled={isLoading}>
                  {exitButton}
                </button>
              </div>
            </div>
          </div>
        )}

        {screen === "teleport" &&
          (teleportState.state === "checking" ? (
            <InfoCard title={teleport.loading.title} message={teleport.loading.message} />
          ) : teleportState.state === "teleported" ? (
            <RoomIntroCard roomId={teleportState.targetRoom} theme={theme} />
          ) : teleportState.reason === "invalidTarget" ? (
            <LockedState title={teleport.invalidTarget.title} message={teleport.invalidTarget.message} />
          ) : (
            <LockedState title={teleport.blocked.title} message={teleport.blocked.message} />
          ))}

        {isArtifactScreen(screen) &&
          (artifactState.state === "locked" ? (
            <LockedState
              title={content.artifactGrant.locked.title}
              message={content.artifactGrant.locked.messageTemplate.replace(
                "{room}",
                String(artifactState.requiredRoom),
              )}
            />
          ) : (
            <ArtifactGrantCard itemName={screenToItemName(screen)} state={artifactState} />
          ))}

        {screen === "decoy" && <DecoyCard state={decoyState} />}

        {/* Start terminal mid-game. Right after the player hits Start in this
            iframe we keep showing the Room 1 intro (justStarted). A fresh
            click on the start terminal later opens a new iframe with
            justStarted=false → SessionInProgressCard with restart + teleport
            options. */}
        {screen === "start" &&
          (justStarted ? (
            <RoomIntroCard roomId={1} theme={theme} />
          ) : (
            <SessionInProgressCard
              currentRoom={visitorSession?.currentRoom}
              isLoading={isLoading}
              onTeleportBack={teleportToCurrentRoom}
              onRestart={startGame}
            />
          ))}

        {/* Room intro cards: each room has its own in-world intro terminal at
            `?screen=roomN` that opens the matching card. Room 2 and 3 intros
            also fire when a teleport call to that room succeeds (handled in
            the teleport branch above). */}
        {roomScreenId !== undefined && <RoomIntroCard roomId={roomScreenId} theme={theme} />}

        {puzzleNumber !== undefined && (
          <ThemePuzzleScreen
            theme={theme}
            puzzleNumber={puzzleNumber}
            puzzlesCompleted={puzzlesCompleted}
            isRoomComplete={(roomId) => isRoomComplete(theme, puzzlesCompleted, roomId)}
            wasJustCompleted={wasJustCompleted}
            isLoading={isLoading}
            onTeleportToNextRoom={teleportToCurrentRoom}
            refreshGameState={refreshGameState}
            completionTime={visitorSession?.completionTime}
            leaderboard={leaderboard}
          />
        )}

        {screen === "null" && (
          <InfoCard title={states.noScreenSelected.title} message={states.noScreenSelected.message} />
        )}
      </div>
    </PageContainer>
  );
};

export default Home;
