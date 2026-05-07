import { StatusPill } from "./StatusPill";

interface StartGameCardProps {
  onStart: () => Promise<void>;
  isLoading: boolean;
}

export const StartGameCard = ({ onStart, isLoading }: StartGameCardProps) => (
  <div className="card w-full er-card er-card--cyan">
    <div aria-hidden className="er-card__glow" />
    <div className="card-details flex flex-col gap-4 er-card__details-relative">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="card-title er-title-gold">
          Escape Room
          <br />
          Briefing
        </h3>
      </div>

      <p className="p2 er-text">
        “Welcome crew. This is Commander Vega. The station’s failing—your team has 30 minutes to bring Power, Comms, and
        the Airlock back online. Tap station assets for clues, crack the puzzles, and get us out.”
      </p>

      <div className="er-inset-panel">
        <p className="p2 er-text-muted" style={{ lineHeight: 1.6 }}>
          • Repair route: Power Bay → Comms Deck → Airlock Control.
          <br />
          • Countdown: 30:00; if it hits zero, the station locks you out.
          <br />• Playstyle: Click assets in-world to pull up clues and puzzles. Solve to advance.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusPill label="Power" detail="Restore systems" color="#1be0f2" />
        <StatusPill label="Comms" detail="Align + decode" color="#f6b300" />
        <StatusPill label="Airlock" detail="Override to escape" color="#9b7bff" />
      </div>

      <div className="card-actions mt-2">
        <button className="btn er-btn-primary w-full sm:w-auto" onClick={onStart} disabled={isLoading}>
          Start the Game
        </button>
      </div>
    </div>
  </div>
);

export default StartGameCard;
