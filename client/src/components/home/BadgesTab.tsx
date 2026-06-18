import { content } from "@/constants";
import { BadgeType, VisitorInventoryType } from "@/context/types";

interface BadgesTabProps {
  /** Every badge configured in the ecosystem inventory. Keyed by name. */
  badges?: { [name: string]: BadgeType };
  /** Subset the visitor has actually earned. */
  earned?: VisitorInventoryType["badges"];
}

const { badgesTab } = content.leaderboard;

/**
 * Grid of ecosystem badges shown on the Leaderboard page's "Badges" tab.
 * Earned badges render in full color; un-earned badges are grayed out
 * (the SDK gives us the same image for both, so we apply a CSS filter
 * to communicate the locked state).
 */
export const BadgesTab = ({ badges, earned }: BadgesTabProps) => {
  const all = Object.values(badges || {});

  if (all.length === 0) {
    return <p className="pt-3 text-center">{badgesTab.emptyState}</p>;
  }

  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
      {all.map((badge) => {
        const { name, description, icon } = badge;
        const hasBadge = Boolean(earned?.[badge.name]);
        const style = { maxWidth: "100%", filter: "none", opacity: "1" };
        if (!hasBadge) {
          style.filter = "grayscale(1)";
          style.opacity = "0.7";
        }
        return (
          <div className="tooltip" key={name}>
            <span className="p3 tooltip-content" style={{ width: "115px" }}>
              {description ? description : name}
            </span>
            <img src={icon} alt={name} style={style} />
            <p className="p3 pb-2 er-text--gold">{name}</p>
          </div>
        );
      })}
    </div>
  );
};

export default BadgesTab;
