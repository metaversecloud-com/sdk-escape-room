import { content } from "@/constants";

/** State of the /discover-decoy call for the `?screen=decoy` flow. */
export type DecoyState = { state: "loading" } | { state: "discovered"; alreadyHad: boolean };

interface Props {
  state: DecoyState;
}

const { decoy } = content;

/**
 * Card shown on the decoy / trash screen. The badge itself is awarded
 * server-side via /discover-decoy; this card is just the player-facing
 * "you found junk" moment. The Badge Awarded toast (fired by awardBadge)
 * surfaces the actual reward.
 */
export const DecoyCard = ({ state }: Props) => {
  if (state.state === "loading") {
    return (
      <div className="card w-full">
        <div className="card-details">
          <h3 className="card-title">{decoy.loading.title}</h3>
          <p className="card-description p2 pt-2">{decoy.loading.message}</p>
        </div>
      </div>
    );
  }

  const copy = state.alreadyHad ? decoy.alreadyHad : decoy.newDiscovery;
  return (
    <div className="card w-full er-card">
      <div aria-hidden className="er-card__glow er-card__glow--violet" />
      <div className="flex flex-col gap-4 er-card items-center text-center">
        <p className="p2 er-eyebrow er-text--violet">{copy.eyebrow}</p>
        <h3
          className="card-title er-title-gold w-full break-words"
          style={{ whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }}
        >
          {copy.title}
        </h3>
        <p className="p3">{copy.message}</p>
      </div>
    </div>
  );
};

export default DecoyCard;
