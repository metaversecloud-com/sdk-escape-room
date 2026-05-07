import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { findInventoryImage } from "@/utils";
import { Loading } from "../Loading";

export const RoomAPuzzle1Complete = () => {
  const { visitorInventory } = useContext(GlobalStateContext);
  const fuseImage = findInventoryImage(visitorInventory?.items, "Fuse");

  if (!fuseImage) return <Loading />;

  return (
    <div className="card er-card--green">
      <p className="p2 er-eyebrow er-eyebrow--green">Puzzle Complete</p>
      <h3 className="er-title-gold">Power Bay Secure</h3>
      <p className="p2  er-text">Electrical cabinet unlocked.</p>
      <p className="p2  er-text">
        <strong>Commander Vega</strong>: “Nice work, crew. Keep momentum!”
      </p>

      <p className="p2 er-eyebrow er-eyebrow--green" style={{ marginBottom: 6 }}>
        You obtained a <strong>Fuse</strong>! (Serial: 74A1)
      </p>
      <p className="p2 er-text">
        Check your inventory to view details about this item and how it might be used in upcoming puzzles.
      </p>

      <div className="er-art-frame er-art-frame--fuse" style={{ minWidth: 180 }}>
        <img src={fuseImage} alt="Fuse" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
    </div>
  );
};

export default RoomAPuzzle1Complete;
