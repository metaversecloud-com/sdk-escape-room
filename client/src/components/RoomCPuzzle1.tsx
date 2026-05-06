import { useContext, useEffect, useState } from "react";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState } from "@/utils";

interface RoomCPuzzle1Props {
  refreshGameState: () => Promise<void>;
  isCompleted?: boolean;
}

interface NodeDef {
  id: string;
  label: string;
  x: number;
  y: number;
}

interface Connection {
  from: string;
  to: string;
}

const NODES: NodeDef[] = [
  { id: "powerCore", label: "Power Core", x: 10, y: 50 },
  { id: "commsControl", label: "Comms", x: 40, y: 10 },
  { id: "signalRelay", label: "Signal Relay", x: 40, y: 80 },
  { id: "airlockControl", label: "Airlock", x: 80, y: 50 },
];

const OFFSET_X = 5;

const CORRECT_CONNECTIONS: Connection[] = [
  { from: "powerCore", to: "airlockControl" },
  { from: "powerCore", to: "commsControl" },
  { from: "commsControl", to: "signalRelay" },
  { from: "signalRelay", to: "airlockControl" },
];

const normalizeConnection = (conn: Connection): Connection =>
  conn.from < conn.to ? conn : { from: conn.to, to: conn.from };

const normalizeAndSort = (conns: Connection[]) =>
  conns
    .map(normalizeConnection)
    .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));

export const RoomCPuzzle1 = ({ refreshGameState, isCompleted }: RoomCPuzzle1Props) => {
  const dispatch = useContext(GlobalDispatchContext);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFailure, setShowFailure] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (isCompleted) setCompleted(true);
  }, [isCompleted]);

  const handleNodeClick = (nodeId: string) => {
    if (completed) return;
    if (!selectedNode) {
      setSelectedNode(nodeId);
      return;
    }
    if (selectedNode === nodeId) {
      setSelectedNode(null);
      return;
    }
    const existingIndex = connections.findIndex(
      (c) => (c.from === selectedNode && c.to === nodeId) || (c.from === nodeId && c.to === selectedNode),
    );
    if (existingIndex !== -1) {
      setConnections(connections.filter((_, i) => i !== existingIndex));
    } else {
      setConnections([...connections, { from: selectedNode, to: nodeId }]);
    }
    setSelectedNode(null);
  };

  const handleSubmit = async () => {
    if (completed) return;

    const isCorrectConfig =
      JSON.stringify(normalizeAndSort(connections)) === JSON.stringify(normalizeAndSort(CORRECT_CONNECTIONS));
    setIsCorrect(isCorrectConfig);

    if (!isCorrectConfig) {
      setShowFailure(true);
      window.setTimeout(() => {
        setShowFailure(false);
        setConnections([]);
        setIsCorrect(null);
      }, 2000);
      return;
    }

    try {
      const response = await backendAPI.post("/submit-puzzle", { puzzleNumber: 6 });
      setGameState(dispatch, response.data);
      setCompleted(true);
      await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="w-[600px] max-w-full p-4 bg-zinc-900 border-4 border-zinc-700 rounded-xl shadow-2xl">
        {completed ? (
          <div className="text-center text-white space-y-2">
            <h2 className="text-2xl font-bold" style={{ textShadow: "0 0 8px rgba(34,197,94,0.7)" }}>
              Circuit Restored
            </h2>
            <p className="text-sm">Proceed to the final override.</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white text-center" style={{ textShadow: "0 0 8px rgba(34,197,94,0.7)" }}>
              Restore Circuit
            </h2>
            <p className="text-white text-sm text-center mb-4">Connect all nodes correctly</p>

            <div className="relative w-full h-[400px] bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
              {NODES.map((node) => {
                const isSelected = selectedNode === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => handleNodeClick(node.id)}
                    className={`absolute w-16 h-16 rounded-full flex items-center justify-center text-xs font-semibold text-center cursor-pointer transition-all ${
                      isSelected ? "bg-yellow-400 text-black scale-110 shadow-lg" : "bg-zinc-600 hover:bg-zinc-500 text-white"
                    }`}
                    style={{
                      left: `${node.x + OFFSET_X}%`,
                      top: `${node.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {node.label}
                  </div>
                );
              })}

              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                {connections.map((conn, index) => {
                  const fromNode = NODES.find((n) => n.id === conn.from)!;
                  const toNode = NODES.find((n) => n.id === conn.to)!;
                  return (
                    <line
                      key={index}
                      x1={`${fromNode.x}%`}
                      y1={`${fromNode.y}%`}
                      x2={`${toNode.x}%`}
                      y2={`${toNode.y}%`}
                      stroke="#22c55e"
                      strokeWidth="4"
                      strokeLinecap="round"
                      style={{ filter: "drop-shadow(0 0 6px #22c55e)" }}
                    />
                  );
                })}
              </svg>
            </div>

            <div className="flex justify-center mt-4">
              <button
                onClick={handleSubmit}
                disabled={connections.length === 0}
                className={`px-6 py-2 rounded-lg font-semibold transition-all ${
                  connections.length === 0 ? "bg-gray-600 cursor-not-allowed" : "bg-green-500 hover:bg-green-400 text-black"
                } ${showFailure ? "animate-pulse bg-red-500" : ""}`}
              >
                Power On
              </button>
            </div>

            <div className="text-center mt-3 text-sm">
              {isCorrect === false && <p className="text-white animate-pulse">Incorrect... resetting</p>}
              {isCorrect === true && <p className="text-white">System Online ✔</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RoomCPuzzle1;
