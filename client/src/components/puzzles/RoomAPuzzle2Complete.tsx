import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { findInventoryImage } from "@/utils";
import { Loading } from "../Loading";

export const RoomAPuzzle2Complete = () => {
  const { visitorInventory } = useContext(GlobalStateContext);
  const wrenchImage = findInventoryImage(visitorInventory?.items, "Wrench");

  if (!wrenchImage) return <Loading />;

  return (
    <div className="card er-card--green">
      <p className="p2 er-eyebrow er-eyebrow--green">Puzzle Complete</p>
      <h3 className="er-title-gold">Reactor Online</h3>

      <p className="p2  er-text">
        Reactor sequence locked. Wrench (26B5) added to your inventory. Commander Vega: “Power Bay stabilized—proceed to
        the Comms Deck.”
      </p>

      <div className="er-art-frame er-art-frame--wrench" style={{ minWidth: 180 }}>
        <img src={wrenchImage} alt="Wrench" style={{ width: "100%", height: "auto", display: "block" }} />
      </div>
    </div>
  );
};

export default RoomAPuzzle2Complete;
