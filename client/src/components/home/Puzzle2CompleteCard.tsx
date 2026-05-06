import { WrenchDisplay } from "@/components/inventoryArt";

export const Puzzle2CompleteCard = () => (
  <div className="card w-full er-card er-card--gold">
    <div aria-hidden className="er-card__glow" />
    <div className="card-details flex flex-col md:flex-row items-center gap-5 er-card__details-relative">
      <div className="flex-1">
        <p className="p2 er-eyebrow" style={{ color: "#ffc878", marginBottom: 6 }}>
          Reactor Online
        </p>
        <h3 className="card-title er-title-gold">Puzzle Complete</h3>
        <p className="p2 mt-2 er-text">
          Reactor sequence locked. Wrench (26B5) added to your inventory. Commander Vega: “Power Bay stabilized—proceed
          to the Comms Deck.”
        </p>
      </div>
      <div style={{ minWidth: 180 }}>
        <WrenchDisplay />
      </div>
    </div>
  </div>
);

export default Puzzle2CompleteCard;
