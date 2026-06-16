import { content } from "@/constants";
import { StatusPill } from "./StatusPill";

interface StartGameCardProps {
  onStart: () => Promise<void>;
  isLoading: boolean;
}

const { briefing } = content;

export const StartGameCard = ({ onStart, isLoading }: StartGameCardProps) => (
  <div className="grid gap-3">
    <div aria-hidden className="er-card__glow" />
    <div className="flex flex-col gap-4 er-card">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="card-title er-title-gold" style={{ whiteSpace: "pre-line" }}>
          {briefing.title}
        </h3>
      </div>

      <p className="p2 er-text">{briefing.intro}</p>

      <div className="er-inset-panel">
        <p className="p2 er-text-muted" style={{ lineHeight: 1.6 }}>
          {briefing.bullets.map((b, i) => (
            <span key={i}>
              • {b}
              {i < briefing.bullets.length - 1 && <br />}
            </span>
          ))}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {briefing.pills.map((pill) => (
          <StatusPill key={pill.label} label={pill.label} detail={pill.detail} color={pill.color} />
        ))}
      </div>

      <div className="card-actions mt-2">
        <button className="btn er-btn-primary w-full sm:w-auto" onClick={onStart} disabled={isLoading}>
          {briefing.startButton}
        </button>
      </div>
    </div>
  </div>
);

export default StartGameCard;
