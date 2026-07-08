import { useContext, useEffect, useMemo, useRef, useState } from "react";

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
  PuzzleCompleteCard,
  Room1Puzzle1,
  Room1Puzzle2,
  Room2Puzzle1,
  Room2Puzzle2,
  Room2Puzzle3,
  Room3Puzzle1,
  Room3Puzzle2,
  RoomIntroCard,
  SessionInProgressCard,
  StartGameCard,
  StatusBar,
} from "@/components";
import { content } from "@/constants";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import {
  backendAPI,
  formatCountdownFromTimestamp,
  remainingSecondsFromTimestamp,
  setErrorMessage,
  setGameState,
} from "@/utils";

const { states, exitConfirmation, exitButton, teleport } = content;

/**
 * Artifact / collectible screens. Each maps to an inventory item with the
 * same name minus spaces — e.g. `Room1Artifact` → item "Room 1 Artifact".
 * Clicking the asset grants the matching item (idempotently) and shows it
 * to the player.
 */
const ARTIFACT_SCREENS = [
  "Room1Artifact",
  "CrewPortrait1",
  "CrewPortrait2",
  "CrewPortrait3",
  "AlphaStation",
  "BetaStation",
  "OmegaStation",
  "Room3Artifact",
] as const;

type ArtifactScreen = (typeof ARTIFACT_SCREENS)[number];

type ScreenType =
  | "start"
  | "exit"
  | "teleport"
  | "leaderboard"
  | "room1"
  | "room2"
  | "room3"
  | "puzzle1"
  | "puzzle2"
  | "puzzle3"
  | "puzzle4"
  | "puzzle5"
  | "puzzle6"
  | "puzzle7"
  | "decoy"
  | ArtifactScreen
  | "null";

const SCREENS: ScreenType[] = [
  "start",
  "exit",
  "teleport",
  "leaderboard",
  "room1",
  "room2",
  "room3",
  "puzzle1",
  "puzzle2",
  "puzzle3",
  "puzzle4",
  "puzzle5",
  "puzzle6",
  "puzzle7",
  "decoy",
  ...ARTIFACT_SCREENS,
];

const isArtifactScreen = (screen: ScreenType): screen is ArtifactScreen =>
  (ARTIFACT_SCREENS as readonly string[]).includes(screen);

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
 * Maps a screen value to the room number whose progression must be unlocked
 * before walking the visitor to that asset is allowed. Screens not in the
 * map (and not in SCREENS_WITHOUT_WALK below) aren't tied to a room and
 * always permit walking. Keeps the walk effect from yanking a player across
 * room boundaries to an asset they haven't progressed to yet.
 */
const SCREEN_REQUIRED_ROOM: Partial<Record<ScreenType, 1 | 2 | 3>> = {
  room1: 1,
  puzzle1: 1,
  puzzle2: 1,
  room2: 2,
  puzzle3: 2,
  puzzle4: 2,
  puzzle5: 2,
  room3: 3,
  puzzle6: 3,
  puzzle7: 3,
};

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
const SCREENS_WITHOUT_WALK: ReadonlySet<ScreenType> = new Set(["start", "exit", "leaderboard", "teleport", "decoy"]);

const isScreen = (value: string | null): value is ScreenType => value !== null && (SCREENS as string[]).includes(value);

const getScreenFromSearch = (): ScreenType => {
  const screen = new URLSearchParams(window.location.search).get("screen");
  return isScreen(screen) ? screen : "null";
};

const getForceRefreshInventoryFromSearch = () =>
  new URLSearchParams(window.location.search).get("forceRefreshInventory") === "true";

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const { hasInteractiveParams, visitorData, visitorInventory, leaderboard, badges, hasSessionExpired } =
    useContext(GlobalStateContext);
  const visitorSession = visitorData || null;
  const puzzlesCompleted = visitorSession?.puzzlesCompleted;

  const screen = useMemo(() => getScreenFromSearch(), []);
  const forceRefreshInventory = useMemo(() => getForceRefreshInventoryFromSearch(), []);

  const [isLoading, setIsLoading] = useState(false);
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
  const isFinished = puzzlesCompleted?.[7] === true;
  const room1Done = !!(puzzlesCompleted?.[1] && puzzlesCompleted?.[2]);
  const room2Done = !!(puzzlesCompleted?.[3] && puzzlesCompleted?.[4] && puzzlesCompleted?.[5]);

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
      ([1, 2, 3, 4, 5, 6, 7] as const).forEach((n) => {
        if (puzzlesCompleted[n] && !prev[n]) justCompletedRef.current.add(n);
      });
    }
    prevPuzzlesCompletedRef.current = puzzlesCompleted;
  }
  const wasJustCompleted = (n: number) => justCompletedRef.current.has(n);

  // Hardcoded: no admin surface to configure it yet. Server uses the same
  // value (see `MAX_SESSION_MINUTES` in checkSessionExpiration.ts) — keep
  // the two in sync if either changes.
  const maxSessionMinutes = 30;

  // Verifies session state with the server (hits the same expiration check
  // /game-state runs), then dispatches the result. We translate `timedOut`
  // into `hasSessionExpired` so the UI flips to the "Time has run out" view
  // — mirrors what handleSubmitPuzzle already sets when it catches a
  // timeout mid-puzzle.
  const handleCheckSession = async () => {
    try {
      const res = await backendAPI.get("/session");
      setGameState(dispatch, { ...res.data, hasSessionExpired: res.data?.timedOut === true });
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    }
  };

  // Live countdown to the session deadline. When it hits zero we stop ticking
  // and call handleCheckSession so the server marks the session expired and
  // the UI flips to the locked state.
  useEffect(() => {
    if (!hasStarted || !visitorSession?.startTime) {
      setTimer("--:--");
      return;
    }
    const startMs = new Date(visitorSession.startTime).getTime();
    const tick = () => {
      setTimer(formatCountdownFromTimestamp(startMs, maxSessionMinutes));
      if (remainingSecondsFromTimestamp(startMs, maxSessionMinutes) <= 0) {
        window.clearInterval(id);
        handleCheckSession();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasStarted, visitorSession?.startTime, maxSessionMinutes]);

  const refreshGameState = async () => {
    const response = await backendAPI.get("/game-state");
    setGameState(dispatch, response.data);
  };

  // Sticky for the lifetime of this iframe — flips true the first time the
  // player hits the Start button so the post-click render shows the Room 1
  // intro instead of the SessionInProgressCard. A separate click on the
  // start terminal later opens a fresh iframe (justStarted starts false
  // again), which is when we want the in-progress restart/teleport options.
  const [justStarted, setJustStarted] = useState(false);

  const startGame = async () => {
    setIsLoading(true);
    try {
      const res = await backendAPI.post("/start-game");
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
      setGameState(dispatch, { ...res.data, hasSessionExpired: res.data?.hasSessionExpired === true });
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
        // Dispatch so visitorData / hasSessionExpired stay in sync if the
        // server detected an expired session during the check.
        setGameState(dispatch, { ...res.data, hasSessionExpired: res.data?.hasSessionExpired === true });
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
    setIsLoading(true);
    backendAPI
      .get("/game-state", { params: { forceRefreshInventory } })
      .then((response) => setGameState(dispatch, response.data))
      .catch((error) => setErrorMessage(dispatch, error as ErrorType))
      .finally(() => setIsLoading(false));
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

    // Session timed out — checkSessionExpiration already teleported the
    // player back to the start terminal. Walking them BACK to the asset
    // they clicked would fight that teleport.
    if (visitorData.timedOut === true || hasSessionExpired === true) {
      walkedRef.current = true;
      return;
    }

    // Some screens (exit terminal) intentionally don't walk the player —
    // they're standalone confirmation pages where moving the avatar would
    // be confusing.
    if (SCREENS_WITHOUT_WALK.has(screen)) {
      walkedRef.current = true;
      return;
    }

    // Use physicalRoom (set on teleport) as source of truth — falls back to
    // currentRoom for legacy sessions that pre-date physicalRoom.
    const requiredRoom = SCREEN_REQUIRED_ROOM[screen];
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
  }, [hasInteractiveParams, visitorData, hasSessionExpired, screen]);

  // ── Standalone screens (own PageContainer) ──
  if (screen === "leaderboard") {
    const tabCopy = content.leaderboard.tabs;
    const tabs: Array<{ id: "leaderboard" | "badges"; label: string }> = [
      { id: "leaderboard", label: tabCopy.leaderboard },
      { id: "badges", label: tabCopy.badges },
    ];
    return (
      <PageContainer isLoading={isLoading} headerText={content.leaderboard.pageTitle}>
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
            <Leaderboard leaderboard={leaderboard} />
          ) : (
            <BadgesTab badges={badges} earned={visitorInventory?.badges} />
          )}
        </div>
      </PageContainer>
    );
  } else if (screen === "puzzle7" && isFinished) {
    return (
      <PageContainer isLoading={isLoading}>
        <div className="flex flex-col w-full items-start gap-4">
          <ExitCongratsCard completionTime={visitorSession?.completionTime} leaderboard={leaderboard} />
        </div>
      </PageContainer>
    );
  } else if (screen !== "start" && hasSessionExpired) {
    // ── Session Expired view ──
    return (
      <PageContainer isLoading={isLoading}>
        <div className="flex flex-col w-full items-start gap-4">
          <LockedState title={states.sessionExpired.title} message={states.sessionExpired.message} />
        </div>
      </PageContainer>
    );
  } else if (!hasStarted) {
    // ── Pre-start view ──
    return (
      <PageContainer isLoading={isLoading}>
        <div className="flex flex-col w-full items-start gap-4">
          {screen === "start" ? (
            <StartGameCard onStart={startGame} isLoading={isLoading || !hasInteractiveParams} />
          ) : (
            <LockedState title={states.gameNotStarted.title} message={states.gameNotStarted.message} />
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
            <RoomIntroCard roomId={teleportState.targetRoom} />
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
            <RoomIntroCard roomId={1} />
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
        {screen === "room1" && <RoomIntroCard roomId={1} />}
        {screen === "room2" && <RoomIntroCard roomId={2} />}
        {screen === "room3" && <RoomIntroCard roomId={3} />}

        {/* Room 1 — Puzzles 1 & 2. Teleport button appears on both once the
            room is complete, since either can be the "last puzzle solved". */}
        {screen === "puzzle1" &&
          (puzzlesCompleted?.[1] ? (
            <PuzzleCompleteCard
              {...(wasJustCompleted(1) ? content.puzzles[1].complete : content.puzzles[1].alreadyComplete)}
              playAcquisitionAnimation={wasJustCompleted(1)}
              showTeleportButton={room1Done}
              onTeleportToNextRoom={teleportToCurrentRoom}
              isTeleporting={isLoading}
            />
          ) : (
            <Room1Puzzle1 refreshGameState={refreshGameState} />
          ))}

        {screen === "puzzle2" &&
          (puzzlesCompleted?.[2] ? (
            <PuzzleCompleteCard
              {...(wasJustCompleted(2) ? content.puzzles[2].complete : content.puzzles[2].alreadyComplete)}
              playAcquisitionAnimation={wasJustCompleted(2)}
              showTeleportButton={room1Done}
              onTeleportToNextRoom={teleportToCurrentRoom}
              isTeleporting={isLoading}
            />
          ) : (
            <Room1Puzzle2 refreshGameState={refreshGameState} />
          ))}

        {/* Room 2 — Puzzles 3, 4, 5. Teleport button appears on all three
            once the room is complete. */}
        {screen === "puzzle3" &&
          (!room1Done ? (
            <LockedState title={states.room2Locked.title} message={states.room2Locked.message} />
          ) : puzzlesCompleted?.[3] ? (
            <PuzzleCompleteCard
              {...(wasJustCompleted(3) ? content.puzzles[3].complete : content.puzzles[3].alreadyComplete)}
              playAcquisitionAnimation={wasJustCompleted(3)}
              showTeleportButton={room2Done}
              onTeleportToNextRoom={teleportToCurrentRoom}
              isTeleporting={isLoading}
            />
          ) : (
            <Room2Puzzle1 refreshGameState={refreshGameState} />
          ))}

        {screen === "puzzle4" &&
          (!room1Done ? (
            <LockedState title={states.room2Locked.title} message={states.room2Locked.message} />
          ) : puzzlesCompleted?.[4] ? (
            <PuzzleCompleteCard
              {...(wasJustCompleted(4) ? content.puzzles[4].complete : content.puzzles[5].alreadyComplete)}
              playAcquisitionAnimation={wasJustCompleted(4)}
            />
          ) : (
            <Room2Puzzle2 refreshGameState={refreshGameState} />
          ))}

        {screen === "puzzle5" &&
          (!puzzlesCompleted?.[4] ? (
            <LockedState title={states.puzzle5Locked.title} message={states.puzzle5Locked.message} />
          ) : puzzlesCompleted?.[5] ? (
            <PuzzleCompleteCard
              {...(wasJustCompleted(5) ? content.puzzles[5].complete : content.puzzles[5].alreadyComplete)}
              playAcquisitionAnimation={wasJustCompleted(5)}
              showTeleportButton={room2Done}
              onTeleportToNextRoom={teleportToCurrentRoom}
              isTeleporting={isLoading}
            />
          ) : (
            <Room2Puzzle3 refreshGameState={refreshGameState} />
          ))}

        {/* Room 3 — Puzzles 6 & 7. No teleport button on the puzzle 6 card;
            Room 3 is the last room, so there's no next-room teleport to
            offer. Puzzle 7 renders ExitCongratsCard on success. */}
        {screen === "puzzle6" &&
          (!room2Done ? (
            <LockedState title={states.room3Locked.title} message={states.room3Locked.message} />
          ) : puzzlesCompleted?.[6] ? (
            <PuzzleCompleteCard
              {...(wasJustCompleted(6) ? content.puzzles[6].complete : content.puzzles[6].alreadyComplete)}
              playAcquisitionAnimation={wasJustCompleted(6)}
            />
          ) : (
            <Room3Puzzle1 refreshGameState={refreshGameState} />
          ))}

        {screen === "puzzle7" &&
          (!room2Done ? (
            <LockedState title={states.room3Locked.title} message={states.room3Locked.message} />
          ) : !puzzlesCompleted?.[6] ? (
            <LockedState title={states.finalPuzzleLocked.title} message={states.finalPuzzleLocked.message} />
          ) : puzzlesCompleted?.[7] ? (
            <ExitCongratsCard completionTime={visitorSession?.completionTime} leaderboard={leaderboard} />
          ) : (
            <Room3Puzzle2 refreshGameState={refreshGameState} />
          ))}

        {screen === "null" && (
          <InfoCard title={states.noScreenSelected.title} message={states.noScreenSelected.message} />
        )}
      </div>
    </PageContainer>
  );
};

export default Home;
