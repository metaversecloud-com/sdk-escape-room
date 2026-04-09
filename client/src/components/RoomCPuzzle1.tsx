import { useContext, useState, useEffect } from "react";
import { GlobalDispatchContext, GlobalStateContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import { backendAPI, setErrorMessage, setGameState} from "@/utils";

interface RoomCPuzzle1Props {
  refreshGameState: () => Promise<void>;
  isCompleted?: boolean;
}

interface Node {
  id: string;
  label: string;
  x: number; // 0–100
  y: number; // 0–100
}

interface Connection {
  from: string;
  to: string;
}

const nodes: Node[] = [
  { id: "powerCore", label: "Power Core", x: 10, y: 50 },
  { id: "commsControl", label: "Comms", x: 40, y: 10 },
  { id: "signalRelay", label: "Signal Relay", x: 40, y: 80 },
  { id: "airlockControl", label: "Airlock", x: 80, y: 50 },
];

const OFFSET_X = 5;


const correctConnections: Connection[] = [
  { from: "powerCore", to: "airlockControl" },
  { from: "powerCore", to: "commsControl" },
  { from: "commsControl", to: "signalRelay" },
  { from: "signalRelay", to: "airlockControl" },
];

export const RoomCPuzzle1 = ({ refreshGameState, isCompleted }: RoomCPuzzle1Props) => {
  const dispatch = useContext(GlobalDispatchContext);
  const { /* access global state if needed, e.g., for enabling keypad */ } = useContext(GlobalStateContext);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFailure, setShowFailure] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
      if (isCompleted) {
        setCompleted(true);
        setSuccessMessage("Power console already restored.");
      }
    }, [isCompleted]);

  const handleNodeClick = (nodeId: string) => {
    if (!selectedNode) {
      setSelectedNode(nodeId);
    } else if (selectedNode === nodeId) {
      setSelectedNode(null);
    } else {
      const existingIndex = connections.findIndex(c => 
        (c.from === selectedNode && c.to === nodeId) ||
        (c.from === nodeId && c.to === selectedNode)
      );

      if (existingIndex !== -1) {
        setConnections(connections.filter((_, i) => i !== existingIndex));
      } else {
        setConnections([...connections, { from: selectedNode, to: nodeId }]);
      }

      setSelectedNode(null);
    }
  };

  const removeConnection = (index: number) => {
    setConnections(connections.filter((_, i) => i !== index));
  };

  const normalizeConnection = (conn: Connection): Connection => {
    return conn.from < conn.to
      ? conn
      : { from: conn.to, to: conn.from };
  };

  const handleSubmit = async () => {
      const normalizeAndSort = (conns: Connection[]) =>
      conns
        .map(normalizeConnection)
        .sort((a, b) =>
          a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
        );

    const sortedUser = normalizeAndSort(connections);
    const sortedCorrect = normalizeAndSort(correctConnections);

    const isCorrectConfig =
      JSON.stringify(sortedUser) === JSON.stringify(sortedCorrect);

    setIsCorrect(isCorrectConfig);

    if (!isCorrectConfig) {
      setShowFailure(true);
      setTimeout(() => {
        setShowFailure(false);
        setConnections([]);
        setIsCorrect(null);
      }, 2000);
    } else {

      try {
        const response = await backendAPI.post("/submit-puzzle", {
          puzzleNumber: 6,
        });

        setGameState(dispatch, response.data);
        setSuccessMessage("Airlock restored.");
        setCompleted(true);
        await refreshGameState();
      } catch (error) {
        setErrorMessage(dispatch, error as ErrorType);
      } 
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <div className="w-[600px] max-w-full p-4 bg-zinc-900 border-4 border-zinc-700 rounded-xl shadow-2xl">
        
        <h2 className="text-xl font-bold text-white text-center"
        style={{ textShadow: "0 0 8px rgba(34,197,94,0.7)" }}>
          Restore Circuit
        </h2>
        <p className="text-white text-sm text-center mb-4">
          Connect all nodes correctly
        </p>

        {/* PANEL */}
        <div className="relative w-full h-[400px] bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden">
          
          {/* NODES */}
          {nodes.map(node => (
            <div
              key={node.id}
              onClick={() => handleNodeClick(node.id)}
              className={`absolute w-16 h-16 rounded-full flex items-center justify-center text-xs font-semibold text-center cursor-pointer transition-all
                ${selectedNode === node.id 
                  ? "bg-yellow-400 text-black scale-110 shadow-lg" 
                  : "bg-zinc-600 hover:bg-zinc-500 text-white"}
              `}
              style={{
                  left: `${node.x + OFFSET_X}%`,
                  top: `${node.y}%`,
                  transform: "translate(-50%, -50%)"
                }}
            >
              {node.label}
            </div>
          ))}

          {/* WIRES */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {connections.map((conn, index) => {
              const fromNode = nodes.find(n => n.id === conn.from)!;
              const toNode = nodes.find(n => n.id === conn.to)!;

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
                  style={{
                    filter: "drop-shadow(0 0 6px #22c55e)"
                  }}
                />
              );
            })}
          </svg>
        </div>

        {/* BUTTON */}
        <div className="flex justify-center mt-4">
          <button
            onClick={handleSubmit}
            disabled={(connections.length === 0)}
            className={`px-6 py-2 rounded-lg font-semibold transition-all
              ${connections.length === 0
                ? "bg-gray-600 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-400 text-black"}
              ${showFailure ? "animate-pulse bg-red-500" : ""}
            `}
          >
            Power On
          </button>
        </div>

        {/* STATUS */}
        <div className="text-center mt-3 text-sm">
          {isCorrect === false && (
            <p className="text-white animate-pulse">
              Incorrect... resetting
            </p>
          )}
          {isCorrect === true && (
            <p className="text-white">
              System Online ✔
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default RoomCPuzzle1;