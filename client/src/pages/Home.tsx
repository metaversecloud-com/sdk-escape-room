// client/src/pages/Home.tsx
import { useContext, useEffect, useMemo, useState } from "react";
import { PageContainer, LockedState, RoomAPuzzle1, RoomAPuzzle2, RoomCPuzzle1, RoomCPuzzle2, RoomBPuzzle1, RoomBPuzzle2, RoomBPuzzle3 } from "@/components";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState} from "@/utils";
import { ConfirmationModal } from "@/components/ConfirmationModal";

type ScreenType = "start" | "exit" | "leaderboard" | "puzzle1" | "puzzle2" | "puzzle3" | "puzzle4" | "puzzle5" | "puzzle6" | "puzzle7" | "null";

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
    case "puzzle7":
      return "puzzle7";
    case "leaderboard":
      return "leaderboard";
    default:
      return "null";
  }
};

const getForceRefreshInventoryFromSearch = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("forceRefreshInventory") === "true";
};

const StatusPill = ({ label, detail, color }: { label: string; detail: string; color: string }) => (
  <div
    className="rounded-lg p-3"
    style={{
      background: "rgba(11,18,34,0.9)",
      border: `1px solid ${color}30`,
      boxShadow: `0 0 14px ${color}20`,
    }}
  >
    <p className="p2" style={{ color: color, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>{label}</p>
    <p className="p2" style={{ color: "#c7d0e5", marginTop: 4 }}>{detail}</p>
  </div>
);

const StartGameCard = ({
  onStart,
  isLoading,
}: {
  onStart: () => Promise<void>;
  isLoading: boolean;
}) => (
  <div
    className="card w-full relative overflow-hidden"
    style={{
      background: "radial-gradient(120% 120% at 30% 20%, rgba(34,112,255,0.18), transparent 45%), radial-gradient(120% 120% at 70% 10%, rgba(111,33,255,0.16), transparent 50%), linear-gradient(140deg, #050b18 0%, #0b1222 45%, #0f1b31 100%)",
      borderColor: "rgba(27,224,242,0.35)",
      boxShadow: "0 0 28px rgba(27,224,242,0.18), 0 20px 50px rgba(0,0,0,0.45)",
    }}
  >
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: -40,
        background: "radial-gradient(circle at 80% 20%, rgba(255,215,64,0.12) 0, transparent 40%), radial-gradient(circle at 10% 90%, rgba(27,224,242,0.15) 0, transparent 45%)",
        filter: "blur(18px)",
        pointerEvents: "none",
      }}
    />
    <div className="card-details flex flex-col gap-4 relative">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="card-title" style={{ color: "#f6b300", letterSpacing: "0.05em", textTransform: "uppercase", lineHeight: 1.2 }}>
          Escape Room<br />Briefing
        </h3>
      </div>

      <p className="p2" style={{ color: "#dbe8ff", fontSize: "1.02rem", lineHeight: 1.6, whiteSpace: "normal" }}>
        “Welcome crew. This is Commander Vega. The station’s failing—your team has 30 minutes to bring Power, Comms, and the Airlock back online. Tap station assets for clues, crack the puzzles, and get us out.”
      </p>

      <div
        className="rounded-xl p-4 border"
        style={{
          background: "rgba(17,27,47,0.8)",
          borderColor: "rgba(63,94,166,0.65)",
          boxShadow: "inset 0 0 0 1px rgba(27,224,242,0.12)",
        }}
      >
        <p className="p2" style={{ color: "#b6c7e8", lineHeight: 1.6 }}>
          • Repair route: Power Bay → Comms Deck → Airlock Control.<br />
          • Countdown: 30:00; if it hits zero, the station locks you out.<br />
          • Playstyle: Click assets in-world to pull up clues and puzzles. Solve to advance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusPill label="Power" detail="Restore systems" color="#1be0f2" />
        <StatusPill label="Comms" detail="Align + decode" color="#f6b300" />
        <StatusPill label="Airlock" detail="Override to escape" color="#9b7bff" />
      </div>

      <div className="card-actions mt-2">
        <button
          className="btn w-full sm:w-auto"
          style={{
            background: "linear-gradient(135deg, #1f5ad7 0%, #1a4ebc 40%, #00c2ff 100%)",
            borderColor: "rgba(0,194,255,0.9)",
            fontWeight: 800,
            letterSpacing: "0.04em",
            paddingTop: "14px",
            paddingBottom: "14px",
          boxShadow: "0 0 16px rgba(0,194,255,0.55)",
          textTransform: "uppercase",
        }}
        onClick={onStart}
        disabled={isLoading}
      >
          Start the Game
        </button>
      </div>
    </div>
  </div>
);

const ExitGameCard = ({ onExit, isLoading }: { onExit: () => void; isLoading: boolean }) => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">Exit Escape Room</h3>
      <p className="card-description p2">End your current session and return to the start area.</p>
      <div className="card-actions">
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

const StatusBar = ({
  elapsed,
  currentRoom,
  onOpenInventory,
  onExit,
  isLoading,
  hasStarted,
}: {
  elapsed: string;
  currentRoom?: string | null;
  onOpenInventory: () => void;
  onExit: () => void;
  isLoading: boolean;
  hasStarted: boolean;
}) => (
  <div className="card w-full">
    <div className="card-details">
      <div className="flex items-center justify-between">
        <div className="flex-col">
          <p className="p2">Timer: {elapsed}</p>
          <p className="p2">Room: {currentRoom || "--"}</p>
        </div>
        <div className="card-actions">
          <button className="btn btn-outline" onClick={onOpenInventory} disabled={!hasStarted}>
            Inventory
          </button>
          <button className="btn btn-outline" onClick={onExit} disabled={isLoading}>
            Exit
          </button>
        </div>
      </div>
    </div>
  </div>
);

const InventoryPanel = ({
  onClose,
  visitorData,
  inventoryItems,
}: {
  onClose: () => void;
  visitorData: any;
  inventoryItems?: { id: string; name?: string; imageUrl?: string | null; description?: string; metadata?: any }[];
}) => (
  <div className="card w-full">
    <div className="card-details">
      <div className="card-actions">
        <button className="btn btn-text" onClick={onClose}>
          Close
        </button>
      </div>

      <h3 className="card-title">Inventory</h3>

      <div className="grid gap-4">
        <div className="card">
          <div className="card-details">
            <h4 className="h4">Mission Items</h4>
            {(() => {
              const hasFuse = !!visitorData?.inventory?.fuse;
              const hasWrench = !!visitorData?.inventory?.wrench;
              const hasCard = !!visitorData?.inventory?.accessCard;

              const filtered =
                inventoryItems?.filter((item) => {
                  const name = (item.name || item.id || "").toLowerCase();
                  if (name.includes("fuse")) return hasFuse;
                  if (name.includes("wrench")) return hasWrench;
                  if (name.includes("access")) return hasCard;
                  return false;
                }) || [];

            const showInventoryItems = filtered.length > 0;

            return showInventoryItems ? (
            <div className="grid gap-3">
                {filtered.map((item) => {
                  const localSerial =
                    item.id === "fuse"
                      ? visitorData?.inventory?.fuse?.serial
                      : item.id === "wrench"
                        ? visitorData?.inventory?.wrench?.serial
                        : item.id === "accessCard"
                          ? visitorData?.inventory?.accessCard?.partialCode
                          : undefined;
                  const detail =
                    item.metadata?.serial ||
                    localSerial ||
                    item.description ||
                    "Item collected";

                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "rgba(17,27,47,0.08)" }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name || item.id}
                          style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 12, background: "#0b1323", padding: 6 }}
                        />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 12, background: "#0b1323" }} />
                      )}
                      <div className="flex flex-col">
                        <p className="p2" style={{ fontWeight: 700 }}>{item.name || item.id}</p>
                        <p className="p3" style={{ color: "#9babc7" }}>
                          {detail}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              ) : (
                <p className="p2" style={{ color: "#c7d0e5" }}>Nothing in your inventory yet. Solve puzzles to collect mission items.</p>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  </div>
);

const LeaderboardPanel = ({
  leaderboard,
}: {
  leaderboard: | {profileId: string; name: string; completionTime: number; escaped: boolean; attempts: number}[] | undefined;
}) => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">Leaderboard</h3>
      <p className="p2">Top Escape Room Times</p>
      {!leaderboard || leaderboard.length === 0 ? (
        <p className="p2">No entries yet. Be the first to escape!</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th className="h5">Name</th>
              <th className="h5">Time</th>
              <th className="h5">Attempts</th>
              <th className="h5">Escaped</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, index) => (
              <tr key={entry.profileId}>
                <td className="p2">{index + 1}</td>
                <td className="p2">{entry.name}</td>
                <td className="p2">{entry.completionTime}s</td>
                <td className="p2">{entry.attempts}</td>
                <td className="p2">{entry.escaped ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  </div>
);

const SessionRunningCard = () => (
  <div
    className="card w-full relative overflow-hidden"
    style={{
      background: "radial-gradient(120% 120% at 20% 15%, rgba(34,112,255,0.15), transparent 45%), radial-gradient(120% 120% at 80% 0%, rgba(255,215,64,0.12), transparent 45%), linear-gradient(135deg, #080f1d 0%, #0f1c33 50%, #0b1022 100%)",
      borderColor: "rgba(27,224,242,0.35)",
      boxShadow: "0 0 26px rgba(0, 194, 255, 0.16), 0 20px 48px rgba(0,0,0,0.45)",
    }}
  >
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: -50,
        background: "radial-gradient(circle at 85% 20%, rgba(111,33,255,0.14) 0, transparent 40%), radial-gradient(circle at 10% 90%, rgba(27,224,242,0.12) 0, transparent 50%)",
        filter: "blur(18px)",
        pointerEvents: "none",
      }}
    />
    <div className="card-details flex flex-col gap-4 relative">
      <h3 className="card-title" style={{ color: "#f6b300", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Power Bay Orders
      </h3>
      <p className="p2" style={{ color: "#dbe8ff", fontSize: "1.02rem", lineHeight: 1.6 }}>
        “Crew, this is Commander Vega. You’re live inside the Power Bay. Start interacting with station assets to reroute power and get this room online.”
      </p>
    </div>
  </div>
);

const FuseDisplay = () => (
  <div
    className="rounded-xl p-4 border"
    style={{
      background: "radial-gradient(circle at 40% 30%, rgba(108, 210, 255, 0.12), transparent 50%), rgba(14,24,44,0.9)",
      borderColor: "rgba(108, 240, 190, 0.45)",
      boxShadow: "0 10px 22px rgba(108, 240, 190, 0.18)",
    }}
  >
    <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="20" y="50" width="120" height="20" rx="6" fill="#c7d0e5" stroke="#8fa0bc" strokeWidth="3" />
      <rect x="40" y="42" width="80" height="36" rx="10" fill="#e7edf7" stroke="#9bb2d1" strokeWidth="3" />
      <rect x="55" y="46" width="50" height="28" rx="6" fill="#f8fbff" stroke="#c2d2e8" strokeWidth="2" />
      <path d="M60 60h8l8-8 8 16 8-8h8" stroke="#7c8aa8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="15" y="42" width="20" height="36" rx="8" fill="#d5deed" stroke="#9fb3ce" strokeWidth="3" />
      <rect x="125" y="42" width="20" height="36" rx="8" fill="#d5deed" stroke="#9fb3ce" strokeWidth="3" />
      <text x="80" y="105" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="800" fill="#f6b300">74A1</text>
    </svg>
  </div>
);

const WrenchDisplay = () => (
  <div
    className="rounded-xl p-4 border"
    style={{
      background: "radial-gradient(circle at 40% 30%, rgba(255,200,120,0.12), transparent 50%), rgba(14,24,44,0.9)",
      borderColor: "rgba(255,200,120,0.45)",
      boxShadow: "0 10px 22px rgba(255,200,120,0.18)",
    }}
  >
    <svg width="180" height="120" viewBox="0 0 180 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="30" y="54" width="90" height="12" rx="3" fill="#c7d0e5" stroke="#8fa0bc" strokeWidth="3" />
      <rect x="96" y="42" width="46" height="36" rx="8" fill="#dfe7f4" stroke="#9bb2d1" strokeWidth="3" />
      <rect x="110" y="36" width="26" height="14" rx="4" fill="#b7c6dc" stroke="#8fa0bc" strokeWidth="3" />
      <rect x="18" y="48" width="18" height="24" rx="6" fill="#c48a62" stroke="#9b6c4f" strokeWidth="3" />
      <rect x="120" y="62" width="10" height="12" rx="2" fill="#7f8faa" />
      <path d="M102 70l12-6-6-10" stroke="#7f8faa" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <text x="90" y="105" textAnchor="middle" fontFamily="Inter, system-ui, sans-serif" fontSize="16" fontWeight="800" fill="#f6b300">26B5</text>
    </svg>
  </div>
);

const Puzzle1CompleteCard = () => (
  <div
    className="card w-full relative overflow-hidden"
    style={{
      background: "radial-gradient(120% 120% at 20% 20%, rgba(34,112,255,0.12), transparent 45%), radial-gradient(120% 120% at 80% 0%, rgba(111,33,255,0.12), transparent 45%), linear-gradient(135deg, #0c1629 0%, #0b1323 50%, #0a1021 100%)",
      borderColor: "rgba(99,211,146,0.55)",
      boxShadow: "0 0 28px rgba(99,211,146,0.25), 0 20px 48px rgba(0,0,0,0.45)",
    }}
  >
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: -50,
        background: "radial-gradient(circle at 85% 20%, rgba(255,215,64,0.14) 0, transparent 40%), radial-gradient(circle at 10% 90%, rgba(27,224,242,0.12) 0, transparent 50%)",
        filter: "blur(18px)",
        pointerEvents: "none",
      }}
    />
    <div className="card-details flex flex-col md:flex-row items-center gap-5 relative">
      <div className="flex-1">
        <p className="p2 uppercase" style={{ color: "#8cf0af", letterSpacing: "0.08em", marginBottom: 6 }}>
          Power Bay Secure
        </p>
        <h3 className="card-title" style={{ color: "#f6b300", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Puzzle Complete
        </h3>
        <p className="p2 mt-2" style={{ color: "#dbe8ff", lineHeight: 1.6 }}>
          Electrical cabinet unlocked. Fuse (74A1) added to your inventory. Commander Vega: “Nice work, crew. Keep momentum!”
        </p>
      </div>
      <div style={{ minWidth: 180 }}>
        <FuseDisplay />
      </div>
    </div>
  </div>
);

const Puzzle2CompleteCard = () => (
  <div
    className="card w-full relative overflow-hidden"
    style={{
      background: "radial-gradient(120% 120% at 20% 20%, rgba(34,112,255,0.12), transparent 45%), radial-gradient(120% 120% at 80% 0%, rgba(255,179,64,0.14), transparent 45%), linear-gradient(135deg, #0c1629 0%, #0b1323 50%, #0a1021 100%)",
      borderColor: "rgba(255,200,120,0.55)",
      boxShadow: "0 0 28px rgba(255,200,120,0.25), 0 20px 48px rgba(0,0,0,0.45)",
    }}
  >
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: -50,
        background: "radial-gradient(circle at 85% 20%, rgba(255,215,64,0.14) 0, transparent 40%), radial-gradient(circle at 10% 90%, rgba(27,224,242,0.12) 0, transparent 50%)",
        filter: "blur(18px)",
        pointerEvents: "none",
      }}
    />
    <div className="card-details flex flex-col md:flex-row items-center gap-5 relative">
      <div className="flex-1">
        <p className="p2 uppercase" style={{ color: "#ffc878", letterSpacing: "0.08em", marginBottom: 6 }}>
          Reactor Online
        </p>
        <h3 className="card-title" style={{ color: "#f6b300", letterSpacing: "0.04em", textTransform: "uppercase" }}>
          Puzzle Complete
        </h3>
        <p className="p2 mt-2" style={{ color: "#dbe8ff", lineHeight: 1.6 }}>
          Reactor sequence locked. Wrench (26B5) added to your inventory. Commander Vega: “Power Bay stabilized—proceed to the Comms Deck.”
        </p>
      </div>
      <div style={{ minWidth: 180 }}>
        <WrenchDisplay />
      </div>
    </div>
  </div>
);

const RoomBIntroCard = () => (
  <div
    className="card w-full relative overflow-hidden"
    style={{
      background: "radial-gradient(120% 120% at 25% 15%, rgba(111,33,255,0.14), transparent 45%), radial-gradient(120% 120% at 80% 0%, rgba(27,224,242,0.12), transparent 45%), linear-gradient(140deg, #050b18 0%, #0c162c 50%, #0d1b35 100%)",
      borderColor: "rgba(111,33,255,0.35)",
      boxShadow: "0 0 28px rgba(111,33,255,0.22), 0 20px 48px rgba(0,0,0,0.45)",
    }}
  >
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: -50,
        background: "radial-gradient(circle at 85% 20%, rgba(255,215,64,0.12) 0, transparent 40%), radial-gradient(circle at 10% 90%, rgba(27,224,242,0.12) 0, transparent 50%)",
        filter: "blur(18px)",
        pointerEvents: "none",
      }}
    />
    <div className="card-details flex flex-col gap-4 relative">
      <h3 className="card-title" style={{ color: "#f6b300", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Room 2: Comms Deck
      </h3>
      <p className="p2" style={{ color: "#dbe8ff", lineHeight: 1.6 }}>
        “Crew, welcome to the Comms Deck. Align the satellites, rebuild the transmission, and decode the valve order to stabilize the signal.”
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusPill label="Satellite Alignment" detail="Count the stars" color="#1be0f2" />
        <StatusPill label="Retrieve the Transmission" detail="Assemble the message" color="#f6b300" />
        <StatusPill label="Decode the Transmission" detail="Figure out what the message is and determine the correct valve order" color="#9b7bff" />
      </div>
    </div>
  </div>
);

const Puzzle6CompleteCard = () => (
  <div
    className="card w-full relative overflow-hidden"
    style={{
      background: "radial-gradient(120% 120% at 25% 15%, rgba(27,224,242,0.14), transparent 45%), radial-gradient(120% 120% at 80% 0%, rgba(111,33,255,0.12), transparent 45%), linear-gradient(135deg, #0c1629 0%, #0b1323 50%, #0a1021 100%)",
      borderColor: "rgba(27,224,242,0.35)",
      boxShadow: "0 0 28px rgba(27,224,242,0.22), 0 20px 48px rgba(0,0,0,0.45)",
    }}
  >
    <div
      aria-hidden
      style={{
        position: "absolute",
        inset: -50,
        background: "radial-gradient(circle at 85% 20%, rgba(255,215,64,0.14) 0, transparent 40%), radial-gradient(circle at 10% 90%, rgba(27,224,242,0.12) 0, transparent 50%)",
        filter: "blur(18px)",
        pointerEvents: "none",
      }}
    />
    <div className="card-details flex flex-col gap-4 relative">
      <p className="p2 uppercase" style={{ color: "#1be0f2", letterSpacing: "0.08em" }}>
        Airlock Systems Restored
      </p>
      <h3 className="card-title" style={{ color: "#f6b300", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        Puzzle Complete
      </h3>
      <p className="p2" style={{ color: "#dbe8ff", lineHeight: 1.6 }}>
        Commander Vega: “Circuit stabilized. The keypad is live—enter the override code to finish the escape.”
      </p>
    </div>
  </div>
);

const formatTime = (seconds?: number | null) => {
  if (seconds === undefined || seconds === null || Number.isNaN(seconds)) return "--:--";
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
};

const ExitCongratsCard = ({
  completionTime,
  leaderboard,
}: {
  completionTime?: number | null;
  leaderboard?: { profileId: string; name: string; completionTime: number; escaped: boolean; attempts: number }[];
}) => {
  const timeText = formatTime(completionTime ?? undefined);
  const placement = completionTime != null && leaderboard && leaderboard.length
    ? leaderboard
        .map((entry) => entry.completionTime)
        .filter((t) => typeof t === "number")
        .sort((a, b) => a - b)
        .findIndex((t) => t >= completionTime) + 1 || leaderboard.length + 1
    : null;

  const topRows = leaderboard ? leaderboard.slice(0, 5) : [];

  return (
    <div
      className="card w-full relative overflow-hidden"
      style={{
        background: "radial-gradient(120% 120% at 30% 20%, rgba(27,224,242,0.14), transparent 45%), radial-gradient(120% 120% at 80% 0%, rgba(111,33,255,0.12), transparent 45%), linear-gradient(135deg, #050b18 0%, #0b1427 50%, #0c1b33 100%)",
        borderColor: "rgba(27,224,242,0.35)",
        boxShadow: "0 0 28px rgba(27,224,242,0.22), 0 20px 48px rgba(0,0,0,0.45)",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -50,
          background: "radial-gradient(circle at 85% 20%, rgba(255,215,64,0.14) 0, transparent 40%), radial-gradient(circle at 10% 90%, rgba(27,224,242,0.12) 0, transparent 50%)",
          filter: "blur(18px)",
          pointerEvents: "none",
        }}
      />
      <div className="card-details flex flex-col gap-4 relative">
        <p className="p2 uppercase" style={{ color: "#1be0f2", letterSpacing: "0.08em" }}>
          Mission Complete
        </p>
        <h3 className="card-title" style={{ color: "#f6b300", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          Congratulations — Airlock Opened
        </h3>
        <p className="p2" style={{ color: "#dbe8ff", lineHeight: 1.6 }}>
          Commander Vega: “Great work, crew. You restored Power, Comms, and Airlock. Grab your stats and see how you rank.”
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl p-4 border" style={{ background: "rgba(17,27,47,0.85)", borderColor: "rgba(63,94,166,0.65)" }}>
            <p className="p2 uppercase" style={{ color: "#9b7bff", letterSpacing: "0.08em" }}>Your Time</p>
            <h4 className="h4" style={{ color: "#f6b300" }}>{timeText}</h4>
            {placement && placement > 0 && (
              <p className="p3" style={{ color: "#c7d0e5" }}>Projected rank: #{placement}</p>
            )}
          </div>
          <div className="rounded-xl p-4 border md:col-span-2" style={{ background: "rgba(17,27,47,0.85)", borderColor: "rgba(63,94,166,0.65)" }}>
            <p className="p2 uppercase" style={{ color: "#1be0f2", letterSpacing: "0.08em" }}>Top Escape Times</p>
            {topRows.length === 0 ? (
              <p className="p2" style={{ color: "#c7d0e5" }}>No leaderboard entries yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th className="p2">Rank</th>
                    <th className="p2">Crew</th>
                    <th className="p2">Time</th>
                    <th className="p2">Attempts</th>
                  </tr>
                </thead>
                <tbody>
                  {topRows.map((row, idx) => (
                    <tr key={row.profileId}>
                      <td className="p2">#{idx + 1}</td>
                      <td className="p2">{row.name}</td>
                      <td className="p2">{formatTime(row.completionTime)}</td>
                      <td className="p2">{row.attempts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const RefRow = ({ left, center, right }: { left: string; center: string; right: string }) => (
  <div
    className="flex justify-between items-center rounded-md px-3 py-2"
    style={{
      background: "rgba(11,18,34,0.9)",
      border: "1px solid rgba(63,94,166,0.35)",
    }}
  >
    <span className="p2" style={{ color: "#dbe8ff", minWidth: 80 }}>{left}</span>
    <span className="p2" style={{ color: "#9babc7", minWidth: 60, textAlign: "center" }}>{center}</span>
    <span className="p2" style={{ color: "#f6b300", minWidth: 80, textAlign: "right" }}>{right}</span>
  </div>
);

export const Home = () => {
  const dispatch = useContext(GlobalDispatchContext);
  const {  hasInteractiveParams, visitorData, badges, visitorInventory, leaderboard } = useContext(GlobalStateContext);
  const visitorSession = visitorData || null;

  const screen = useMemo(() => getScreenFromSearch(), []);
  const forceRefreshInventory = useMemo(() => getForceRefreshInventoryFromSearch(), []);
  const [isLoading, setIsLoading] = useState(false);
  const [elapsed, setElapsed] = useState("--:--");
  const [showInventory, setShowInventory] = useState(false);
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [showRoomBIntro, setShowRoomBIntro] = useState(false);

  const hasStarted = visitorSession?.sessionActive === true;
  const isFinished = visitorSession?.puzzlesCompleted?.[7] === true;

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

  const openExitConfirmation = () => setShowExitConfirmation(true);
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
        .get("/game-state", { params: { forceRefreshInventory } })
        .then((response) => {
          setGameState(dispatch, response.data);
        })
        .catch((error) => setErrorMessage(dispatch, error as ErrorType))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [hasInteractiveParams, dispatch]);

  useEffect(() => {
    const bothRoomAPuzzlesDone =
      visitorData?.puzzlesCompleted?.[1] && visitorData?.puzzlesCompleted?.[2];
    const onRoomAScreen =
      screen === "puzzle1" || screen === "puzzle2";

    let id: number | undefined;
    if (onRoomAScreen && bothRoomAPuzzlesDone) {
      setShowRoomBIntro(false);
      id = window.setTimeout(() => setShowRoomBIntro(true), 2000);
    } else {
      setShowRoomBIntro(false);
    }

    return () => {
      if (id) window.clearTimeout(id);
    };
  }, [screen, visitorData?.puzzlesCompleted?.[1], visitorData?.puzzlesCompleted?.[2]]);

  useEffect(() => {
    if (screen === "leaderboard" && hasInteractiveParams) {
      refreshGameState();
    }
  }, [screen, hasInteractiveParams]);

  if(screen === "leaderboard") {
    return (
      <PageContainer isLoading={isLoading} headerText="Leaderboard">
        <div className="flex-col gap-4">
          <LeaderboardPanel leaderboard={leaderboard} />
        </div>
      </PageContainer>
    );
  }
  // If final puzzle completed, allow showing the completion content even though session ended
  if (screen === "puzzle7" && isFinished) {
    return (
      <PageContainer isLoading={isLoading} headerText="">
        <div className="flex flex-col w-full items-start gap-4">
          <ExitCongratsCard completionTime={visitorSession?.completionTime} leaderboard={leaderboard} />
        </div>
      </PageContainer>
    );
  }

  // Pre-start view
  if (!hasStarted) {
    return (
      <PageContainer isLoading={isLoading} headerText="">
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

  const showStatusBar = !isFinished;

  return (
    <PageContainer isLoading={isLoading} headerText="">
      <div className="flex flex-col w-full items-start gap-4">
        {showStatusBar && (
          <StatusBar  
            elapsed={elapsed}
            currentRoom={visitorSession?.currentRoom}
            onOpenInventory={() => setShowInventory(true)}
            onExit={openExitConfirmation}
            isLoading={isLoading}
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

        {screen === "exit" && (
          <ExitGameCard onExit={openExitConfirmation} isLoading={isLoading} />
        )}
        
        {showExitConfirmation && (
          <ConfirmationModal
            title="Exit Game"
            message="Are you sure you want to exit the game? Your progress will NOT be saved."
            handleOnConfirm={exitGame}
            handleToggleShowConfirmationModal={() => setShowExitConfirmation(false)}
          />
        )}

        {screen === "start" && (
          hasStarted ? <SessionRunningCard /> : <StartGameCard onStart={startGame} isLoading={isLoading || !hasInteractiveParams} />
        )}

        {/* Room A Puzzles */}
        {screen === "puzzle1" && (
          visitorData?.puzzlesCompleted?.[1] ? (
            showRoomBIntro ? <RoomBIntroCard /> : <Puzzle1CompleteCard />
          ) : (
            <RoomAPuzzle1 refreshGameState={refreshGameState} isCompleted={visitorData?.puzzlesCompleted?.[1]} />
          )
        )}
        
        {screen === "puzzle2" && (
          visitorData?.puzzlesCompleted?.[2] ? (
            showRoomBIntro ? <RoomBIntroCard /> : <Puzzle2CompleteCard />
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
            <div className="satellite-success">
            <div className="success-animation">
              <div className="satellite-icon">🛰️</div>
              <h2>Communication Signal Aligned!</h2>
              <p>The satellites are now in perfect alignment. Communication restored!</p>
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
          (!visitorData?.puzzlesCompleted?.[3] || !visitorData?.puzzlesCompleted?.[4] || !visitorData?.puzzlesCompleted?.[5]) ? (
            <LockedState 
              title="Room C Locked" 
              message="You must complete Room B before accessing the reactor control room." 
            />
          ) : visitorData?.puzzlesCompleted?.[6] ? (
            <Puzzle6CompleteCard />
          ) : (
            <RoomCPuzzle1 refreshGameState={refreshGameState} />
          )
        )}

        {screen === "puzzle7" && (
          (!visitorData?.puzzlesCompleted?.[3] || !visitorData?.puzzlesCompleted?.[4] || !visitorData?.puzzlesCompleted?.[5]) ? (
            <LockedState 
              title="Room C Locked" 
              message="You must complete Room B before accessing the final airlock sequence." 
            />
          ) : !visitorData?.puzzlesCompleted?.[6] ? (
            <LockedState 
              title="Final Puzzle Locked" 
              message="Complete Puzzle 6 before attempting the final escape sequence." 
            />
          ) : visitorData?.puzzlesCompleted?.[7] ? (
            <ExitCongratsCard completionTime={visitorSession?.completionTime} leaderboard={leaderboard} />
          ) :  (
            <RoomCPuzzle2 refreshGameState={refreshGameState} />
          )
        )}

        {screen === "null" && (
          <InfoCard
            title="No Screen Selected"
            message="This asset is missing a screen query parameter. Use ?screen=start, ?screen=exit, or ?screen=puzzle1 through ?screen=puzzle7."
          />
        )}
      </div>
    </PageContainer>
  );
};

export default Home;
