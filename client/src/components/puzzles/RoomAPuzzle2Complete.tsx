import { useContext } from "react";
import { content } from "@/constants";
import { GlobalStateContext } from "@/context/GlobalContext";
import { findInventoryImage } from "@/utils";
import { Loading } from "../Loading";
import { PuzzleCompleteCard } from "./PuzzleCompleteCard";

const c = content.puzzles[2].complete;

export const RoomAPuzzle2Complete = () => {
  const { visitorInventory } = useContext(GlobalStateContext);
  const itemImage = findInventoryImage(visitorInventory?.items, c.itemName);

  if (!itemImage) return <Loading />;

  return (
    <PuzzleCompleteCard title={c.title}>
      <p className="p2 er-text">{c.body}</p>
      <div className={`er-art-frame ${c.artFrameClass}`} style={{ minWidth: 180 }}>
        <img src={itemImage} alt={c.itemName} style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
    </PuzzleCompleteCard>
  );
};

export default RoomAPuzzle2Complete;
