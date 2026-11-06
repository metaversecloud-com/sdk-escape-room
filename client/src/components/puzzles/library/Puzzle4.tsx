import { useContext, useEffect, useState } from "react";
import { content } from "@/constants";
import { GlobalDispatchContext } from "@/context/GlobalContext";
import { ErrorType } from "@/context/types";
import {
  backendAPI,
  reportWrongAttempt,
  setErrorMessage,
  setGameState,
  useInitialPuzzleDraft,
  usePuzzleDraft,
} from "@/utils";
import { LibraryPuzzleHeader } from "./PuzzleHeader";
import { LIBRARY_PUZZLE_REWARD_SELECTORS } from "@shared/themes";

import paper1 from "@/assets/paper1_Library.png";
import paper2 from "@/assets/paper2_Library.png";
import paper3 from "@/assets/paper3_Library.png";

const c = content.libraryPuzzles[4];

type PaperId = 1 | 2 | 3;

interface PaperItem {
  metadata?: {
    escapeRoomReward?: string;
  };
}

interface PuzzlePiece {
  id: PaperId;
  image: string;
  label: string;
}

interface Connection {
  from: string;
  to: string;
}

interface Draft {
  slots: (PaperId | null)[];
  connections: Connection[];
}

interface LibraryPuzzle4Props {
  isCompleted: boolean;
  isLoading: boolean;
  refreshGameState: () => Promise<void>;
}

const PAPERS: Record<PaperId, PuzzlePiece> = {
  1: {
    id: 1,
    image: paper1,
    label: "Paper 1",
  },
  2: {
    id: 2,
    image: paper2,
    label: "Paper 2",
  },
  3: {
    id: 3,
    image: paper3,
    label: "Paper 3",
  },
};

// These are inventory metadata selectors, not image names.
const INITIAL_SLOTS: (PaperId | null)[] = [2, 3, 1];

const addCollectedPapersToEmptySlots = (
  slots: (PaperId | null)[],
  collected: PaperId[],
): (PaperId | null)[] => {
  const seen = new Set<PaperId>();
  const nextSlots = slots.map((paperId) => {
    if (paperId === null || !collected.includes(paperId) || seen.has(paperId)) {
      return null;
    }

    seen.add(paperId);
    return paperId;
  });
  const unplaced = collected.filter((paperId) => !seen.has(paperId));

  return nextSlots.map((paperId) => paperId ?? unplaced.shift() ?? null);
};

// The nodes are deliberately unlabeled.
// Coordinates use percentages within the connection board.
interface NodeDef {
  id: string;
  x: number;
  y: number;
}

const NODES: NodeDef[] = [
  { id: "L1", x: 25, y: 8 },
  { id: "R1", x: 75, y: 8 },
  { id: "L2", x: 25, y: 24.8 },
  { id: "R2", x: 75, y: 24.8 },
  { id: "L3", x: 25, y: 41.6 },
  { id: "R3", x: 75, y: 41.6 },
  { id: "L4", x: 25, y: 58.4 },
  { id: "R4", x: 75, y: 58.4 },
  { id: "L5", x: 25, y: 75.2 },
  { id: "R5", x: 75, y: 75.2 },
  { id: "L6", x: 25, y: 92 },
  { id: "R6", x: 75, y: 92 },
];

const CORRECT_CONNECTIONS: Connection[] = [
  { from: "L1", to: "L2" },
  { from: "R1", to: "L2" },
  { from: "L3", to: "R3" },
  { from: "R3", to: "R4" },
  { from: "L4", to: "R5" },
  { from: "L5", to: "R5" },
  { from: "L5", to: "R6" },
];

const normalizeConnection = (connection: Connection): Connection =>
  connection.from < connection.to
    ? connection
    : { from: connection.to, to: connection.from };

const normalizeAndSort = (connections: Connection[]) =>
  connections
    .map(normalizeConnection)
    .sort(
      (a, b) =>
        a.from.localeCompare(b.from) ||
        a.to.localeCompare(b.to)
    );

const isSameConnectionSet = (
  first: Connection[],
  second: Connection[]
) =>
  JSON.stringify(normalizeAndSort(first)) ===
  JSON.stringify(normalizeAndSort(second));

export const Puzzle4 = ({
  isCompleted,
  isLoading,
  refreshGameState,
}: LibraryPuzzle4Props) => {
  const dispatch = useContext(GlobalDispatchContext);

  const savedDraft = useInitialPuzzleDraft<Draft>(4);

  const [slots, setSlots] = useState<(PaperId | null)[]>(
    savedDraft?.slots ?? INITIAL_SLOTS
  );
  const [connections, setConnections] = useState<Connection[]>(
    savedDraft?.connections ?? []
  );

  const [availablePapers, setAvailablePapers] = useState<PaperId[]>([]);
  const [inventoryLoaded, setInventoryLoaded] = useState(false);

  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState("");

  usePuzzleDraft(4, { slots, connections });

  // Retrieve the team's shared key items.
  useEffect(() => {
    const loadInventory = async () => {
      try {
        const response = await backendAPI.get("/game-state");

        const items: PaperItem[] =
          response.data?.visitorInventory?.items ?? [];
        const rewardItemIds: Record<number, string> =
          response.data?.visitorData?.libraryRewardItemIds ?? {};

        const collected: PaperId[] = ([1, 2, 3] as PaperId[]).filter(
          (paperId) =>
            items.some((item) =>
              item.metadata?.escapeRoomReward === LIBRARY_PUZZLE_REWARD_SELECTORS[paperId]
            ) ||
            rewardItemIds[paperId] !== undefined
        );

        setAvailablePapers(collected);

        setSlots((previous) =>
          addCollectedPapersToEmptySlots(
            previous.length ? previous : savedDraft?.slots ?? INITIAL_SLOTS,
            collected,
          )
        );
      } catch (error) {
        setErrorMessage(dispatch, error as ErrorType);
        setFeedback("Unable to load the team's collected papers.");
      } finally {
        setInventoryLoaded(true);
      }
    };

    void loadInventory();
    // Inventory is loaded once when this puzzle mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isCompleted) {
      setFeedback("");
    }
  }, [isCompleted]);

  const allPapersCollected = availablePapers.length === 3;

  const papersAreCorrect =
    allPapersCollected &&
    slots[0] === 1 &&
    slots[1] === 2 &&
    slots[2] === 3;

  const isConnectionPuzzleSolved = isSameConnectionSet(
    connections,
    CORRECT_CONNECTIONS
  );

  const getPaperAtSlot = (slotIndex: number) => {
    const paperId = slots[slotIndex];
    return paperId === null ? null : PAPERS[paperId];
  };

  // Select two slots to swap their contents.
  const handleSlotClick = (clickedSlot: number) => {
    if (
      papersAreCorrect ||
      isSubmitting ||
      isLoading ||
      !inventoryLoaded
    ) {
      return;
    }

    setFeedback("");

    if (selectedSlot === null) {
      if (slots[clickedSlot] === null) return;

      setSelectedSlot(clickedSlot);
      return;
    }

    if (selectedSlot === clickedSlot) {
      setSelectedSlot(null);
      return;
    }

    const updatedSlots = [...slots];

    [updatedSlots[selectedSlot], updatedSlots[clickedSlot]] = [
      updatedSlots[clickedSlot],
      updatedSlots[selectedSlot],
    ];

    setSlots(updatedSlots);
    setSelectedSlot(null);
  };

  // Select two nodes to add or remove a connection.
  const handleNodeClick = (nodeId: string) => {
    if (isSubmitting || isLoading || isCompleted) return;

    setFeedback("");

    if (selectedNode === null) {
      setSelectedNode(nodeId);
      return;
    }

    if (selectedNode === nodeId) {
      setSelectedNode(null);
      return;
    }

    const existingIndex = connections.findIndex(
      (connection) =>
        (connection.from === selectedNode &&
          connection.to === nodeId) ||
        (connection.from === nodeId &&
          connection.to === selectedNode)
    );

    if (existingIndex !== -1) {
      setConnections((previous) =>
        previous.filter((_, index) => index !== existingIndex)
      );
    } else {
      setConnections((previous) => [
        ...previous,
        { from: selectedNode, to: nodeId },
      ]);
    }

    setSelectedNode(null);
  };

  const handleResetConnections = () => {
    if (isSubmitting || isCompleted) return;

    setConnections([]);
    setSelectedNode(null);
    setFeedback("");
  };

  const handleSubmit = async () => {
    if (
      isSubmitting ||
      isCompleted ||
      isLoading ||
      !inventoryLoaded
    ) {
      return;
    }

    if (!allPapersCollected) {
      setFeedback("Find all three papers before submitting the solution.");
      return;
    }

    if (!papersAreCorrect) {
      setFeedback("The papers aren't in the correct order. Rearrange them and try again.");
      reportWrongAttempt(4);
      return;
    }

    if (!isConnectionPuzzleSolved) {
      setFeedback(
        "The connections aren't quite right. Check the pattern and try again."
      );
      reportWrongAttempt(4);
      return;
    }

    setIsSubmitting(true);
    setFeedback("");

    try {
      const response = await backendAPI.post("/submit-puzzle", {
        puzzleNumber: 4,
      });

      setGameState(dispatch, response.data);
      await refreshGameState();
    } catch (error) {
      setErrorMessage(dispatch, error as ErrorType);
      setFeedback("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="card w-full">
        <div className="card-details">
          <h3 className="card-title">{c.title}</h3>
          <p className="p2 text-success" role="status">
            {c.complete.body}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="library-paper-puzzle grid gap-4 w-full">
      <LibraryPuzzleHeader
        title={c.title}
        description={c.description}
      />

      {!inventoryLoaded && (
        <p className="library-paper-status" role="status">
          Checking the team's collected papers...
        </p>
      )}

      {inventoryLoaded && (
        <>
          {/* STAGE 1: Arrange the papers */}
          <section className="library-paper-stage">
            <div className="library-paper-stage-heading">
              <h3>Part 1: Reassemble the Papers</h3>
              <p>
                Arrange the three papers in the correct order, from
                top to bottom.
              </p>
            </div>

            <div className="library-paper-slots">
              {slots.map((_, index) => {
                const paper = getPaperAtSlot(index);
                const isSelected = selectedSlot === index;

                return (
                  <button
                    key={index}
                    type="button"
                    className={`library-paper-slot ${
                      isSelected ? "is-selected" : ""
                    } ${paper ? "has-paper" : "is-empty"}`}
                    onClick={() => handleSlotClick(index)}
                    disabled={
                      isSubmitting ||
                      isLoading ||
                      (paper === null && selectedSlot === null)
                    }
                    aria-label={
                      paper
                        ? `${paper.label}, position ${index + 1}`
                        : `Empty paper position ${index + 1}`
                    }
                  >
                    {paper ? (
                      <img
                        src={paper.image}
                        alt={paper.label}
                        className="library-paper-image"
                        draggable={false}
                      />
                    ) : (
                      <span className="library-paper-empty">
                        Empty
                      </span>
                    )}

                    <span className="library-paper-position">
                      {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="library-paper-instructions">
              Select one paper, then select another position to swap
              them.
            </p>

            {!allPapersCollected && (
              <p className="library-paper-status">
                You haven't collected all three papers yet. Find the
                remaining papers to unlock the complete puzzle.
                <span className="library-paper-count">
                  {availablePapers.length} / 3 collected
                </span>
              </p>
            )}

            {papersAreCorrect && (
              <p className="library-paper-success" role="status">
                All three papers are in the correct order. The next
                part of the puzzle is unlocked!
              </p>
            )}
          </section>

          {/* STAGE 2: Connect the nodes */}
          {papersAreCorrect && (
            <section className="library-connection-stage">
              <div className="library-paper-stage-heading">
                <h3>Part 2: Finding Patterns</h3>
                <p>
                  Use your knowledge to piece it all together. Select two dots to draw a line between them. Select an
                  existing pair again to remove its line.
                </p>
              </div>

              <div className="library-connection-board">
                <svg
                  className="library-connection-lines"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  {connections.map((connection, index) => {
                    const from = NODES.find(
                      (node) => node.id === connection.from
                    );
                    const to = NODES.find(
                      (node) => node.id === connection.to
                    );

                    if (!from || !to) return null;

                    return (
                      <line
                        key={`${connection.from}-${connection.to}-${index}`}
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        className="library-connection-line"
                      />
                    );
                  })}
                </svg>

                {NODES.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className={`library-connection-node ${
                      selectedNode === node.id ? "is-selected" : ""
                    }`}
                    style={{
                      left: `${node.x}%`,
                      top: `${node.y}%`,
                    }}
                    onClick={() => handleNodeClick(node.id)}
                    disabled={isSubmitting || isLoading}
                    aria-label="Connection node"
                    aria-pressed={selectedNode === node.id}
                  />
                ))}
              </div>

              <div className="library-connection-progress">
                {connections.length} connections drawn
              </div>

              <div className="library-connection-actions">
                <button
                  type="button"
                  className="btn er-puzzle-reset"
                  onClick={handleResetConnections}
                  disabled={
                    isSubmitting ||
                    connections.length === 0
                  }
                >
                  Reset Connections
                </button>
              </div>
            </section>
          )}
        </>
      )}

      <div className="library-connection-actions">
        <button
          type="button"
          className="btn er-puzzle-submit"
          onClick={handleSubmit}
          disabled={isSubmitting || isLoading || !inventoryLoaded}
        >
          {isSubmitting ? "Checking..." : "Submit Solution"}
        </button>
      </div>

      {feedback && (
        <div className="er-puzzle-error" role="alert">
          ⚠️ {feedback}
        </div>
      )}
    </div>
  );
};

export default Puzzle4;