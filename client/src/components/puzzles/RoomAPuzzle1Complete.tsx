import { useContext } from "react";
import { content } from "@/constants";
import { GlobalStateContext } from "@/context/GlobalContext";
import { findInventoryImage } from "@/utils";
import { Loading } from "../Loading";
import { PuzzleCompleteCard } from "./PuzzleCompleteCard";

const c = content.puzzles[1].complete;

export const RoomAPuzzle1Complete = () => {
  const { visitorInventory } = useContext(GlobalStateContext);
  const itemImage = findInventoryImage(visitorInventory?.items, c.itemName);

  if (!itemImage) return <Loading />;

  return (
    <PuzzleCompleteCard title={c.title}>
      <p className="p2 er-text">{c.flavor}</p>
      <p className="p2 er-text">
        <strong>{c.dialogueSpeaker}</strong>: {c.dialogue}
      </p>

      <p
        className="p2 er-eyebrow er-text--green"
        style={{ marginBottom: 6 }}
        // `itemHtml` carries the <strong> markup so PMs can edit the emphasis
        // without the engineering team touching JSX. Safe because the string
        // is authored in constants.ts — not user-supplied.
        dangerouslySetInnerHTML={{ __html: c.itemHtml }}
      />
      <p className="p2 er-text">{c.inventoryHint}</p>

      <div className={`er-art-frame ${c.artFrameClass}`} style={{ minWidth: 180 }}>
        <img src={itemImage} alt={c.itemName} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
    </PuzzleCompleteCard>
  );
};

export default RoomAPuzzle1Complete;
