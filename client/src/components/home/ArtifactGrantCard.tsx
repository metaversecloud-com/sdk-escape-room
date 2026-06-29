import { useEffect, useRef } from "react";
import { content } from "@/constants";
import { InventoryItemSummary } from "@/context/types";
import { flyItemToInventory } from "@/utils";

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
  // Acquisition-flight animation: when the server confirms a fresh grant
  // (state.state === "granted" && !alreadyHad), clone the item image and
  // fly it to the Inventory button in the status bar. Fires exactly once
  // per mount via `firedRef`. Waits for image `load` if not cached so the
  // source rect has real dimensions.
  const imgRef = useRef<HTMLImageElement | null>(null);
  const firedRef = useRef(false);
  useEffect(() => {
    if (state.state !== "granted") return;
    if (state.alreadyHad) return;
    const url = state.item?.imageUrl;
    if (!url) return;
    if (firedRef.current) return;
    const img = imgRef.current;
    if (!img) return;

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      flyItemToInventory(url, img);
    };

    if (img.complete && img.naturalWidth > 0) {
      fire();
      return;
    }
    img.addEventListener("load", fire, { once: true });
    return () => img.removeEventListener("load", fire);
  }, [state]);

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
        <h3 className="er-text--violet uppercase">{copy.title}</h3>
        <h4
          className="card-title er-title-gold w-full break-words"
          style={{ whiteSpace: "normal", overflow: "visible", textOverflow: "clip" }}
        >
          {displayName}
        </h4>
        {item?.imageUrl ? (
          <img
            ref={imgRef}
            src={item.imageUrl}
            alt={displayName}
            style={{ maxWidth: "100%", maxHeight: 240, display: "block" }}
          />
        ) : null}
        {item?.description && <p className="p2 er-text">{item.description}</p>}
        <p className="p3">{copy.message}</p>
      </div>
    </div>
  );
};

export default ArtifactGrantCard;
