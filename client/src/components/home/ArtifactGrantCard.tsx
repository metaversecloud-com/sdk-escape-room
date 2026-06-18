import { content } from "@/constants";
import { InventoryItemSummary } from "@/context/types";

/** State of the /grant-item call for the artifact screen. */
export type ArtifactGrantState =
  | { state: "loading" }
  | { state: "granted"; item: InventoryItemSummary | null; alreadyHad: boolean }
  | { state: "notFound" };

interface Props {
  /** The derived item name (used as a fallback title before the server responds). */
  itemName: string;
  state: ArtifactGrantState;
}

const { artifactGrant } = content;

/**
 * Card shown on artifact / collectible screens. Renders one of:
 *   - loading: while /grant-item is in-flight
 *   - granted (new): the item image + "added to your inventory" copy
 *   - granted (already had): same image + "you already have this" copy
 *   - notFound: item isn't configured in the ecosystem yet
 */
export const ArtifactGrantCard = ({ itemName, state }: Props) => {
  if (state.state === "loading") {
    return (
      <div className="card w-full">
        <div className="card-details">
          <h3 className="card-title">{artifactGrant.loading.title}</h3>
          <p className="card-description p2 pt-2">{artifactGrant.loading.message}</p>
        </div>
      </div>
    );
  }

  if (state.state === "notFound") {
    return (
      <div className="card w-full">
        <div className="card-details">
          <h3 className="card-title">{artifactGrant.notFound.title}</h3>
          <p className="card-description p2 pt-2">{artifactGrant.notFound.message}</p>
        </div>
      </div>
    );
  }

  const { item, alreadyHad } = state;
  const copy = alreadyHad ? artifactGrant.alreadyHad : artifactGrant.newGrant;
  const displayName = item?.name || itemName;

  return (
    <div className="card w-full er-card">
      <div aria-hidden className="er-card__glow er-card__glow--violet" />
      <div className="flex flex-col gap-4 er-card items-center text-center">
        <p className="p2 er-eyebrow er-text--violet">{copy.title}</p>
        <h3 className="card-title er-title-gold">{displayName}</h3>
        {item?.imageUrl ? (
          <img src={item.imageUrl} alt={displayName} style={{ maxWidth: "100%", maxHeight: 240, display: "block" }} />
        ) : null}
        {item?.description && <p className="p2 er-text">{item.description}</p>}
        <p className="p3">{copy.message}</p>
      </div>
    </div>
  );
};

export default ArtifactGrantCard;
