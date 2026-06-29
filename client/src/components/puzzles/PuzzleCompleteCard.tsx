import { ReactNode, useContext, useEffect, useRef } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { findInventoryImage, flyItemToInventory } from "@/utils";

/**
 * Shared puzzle-complete card. All per-puzzle `RoomXPuzzleYComplete` wrappers
 * spread their `content.puzzles[N].complete` object onto this — fields are
 * optional, and the card renders only the ones the config provides:
 *
 *   - `title`   (required) — main headline (e.g. "Power Bay Secure").
 *   - `heading` — small acquired-style sub-headline (e.g. "BATTERY ACQUIRED").
 *   - `flavor`  — one-line italic blurb under the heading.
 *   - `body`    — main paragraph copy.
 *   - `dialogueSpeaker` + `dialogue` — quoted line attributed to a character;
 *      only rendered when both are present.
 *   - `itemName` — looks up the matching inventory image and renders it in
 *      a framed art block. Silently skipped if the player doesn't yet have
 *      the item (image lookup returns undefined).
 *
 * `children` is the escape hatch for puzzles whose complete card has a
 * fully bespoke layout (e.g. puzzle 4's scrambled-fragments display).
 */
interface PuzzleCompleteCardProps {
  title: string;
  eyebrow?: string;
  heading?: string;
  flavor?: string;
  body?: string;
  dialogueSpeaker?: string;
  dialogue?: string;
  itemName?: string;
  children?: ReactNode;
}

export const PuzzleCompleteCard = ({
  title,
  eyebrow = "Puzzle Complete",
  heading,
  flavor,
  body,
  dialogueSpeaker,
  dialogue,
  itemName,
  children,
}: PuzzleCompleteCardProps) => {
  const { visitorInventory } = useContext(GlobalStateContext);
  const itemImage = itemName ? findInventoryImage(visitorInventory?.items, itemName) : undefined;

  // Acquisition-flight animation: when the card mounts with a granted item
  // image, clone it and fly it toward the Inventory button. Fires exactly
  // once per mount via `firedRef`; waits for image `load` if not yet cached.
  // Re-opening the same puzzle's complete card refires (each iframe click is
  // a fresh mount) — intentional so the player gets the visual feedback
  // every time, not just on the initial submit.
  const imgRef = useRef<HTMLImageElement | null>(null);
  const firedRef = useRef(false);
  useEffect(() => {
    if (!itemImage || !itemName) return;
    if (firedRef.current) return;
    const img = imgRef.current;
    if (!img) return;

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      flyItemToInventory(itemImage, img);
    };

    if (img.complete && img.naturalWidth > 0) {
      fire();
      return;
    }
    img.addEventListener("load", fire, { once: true });
    return () => img.removeEventListener("load", fire);
  }, [itemImage, itemName]);

  return (
    <div className="grid gap-3">
      <div aria-hidden className="er-card__glow" />
      <p className="p2 er-eyebrow er-text--green">{eyebrow}</p>
      <h3 className="er-title-gold">{title}</h3>
      {heading && <p className="p2 er-eyebrow er-text--green">{heading}</p>}
      {flavor && <p className="p2 er-text">{flavor}</p>}
      {body && <p className="p2 er-text">{body}</p>}
      {dialogueSpeaker && dialogue && (
        <p className="p2 er-text">
          <strong>{dialogueSpeaker}</strong>: {dialogue}
        </p>
      )}
      {itemImage && itemName && (
        <div className="er-art-frame" style={{ minWidth: 180 }}>
          <img
            ref={imgRef}
            src={itemImage}
            alt={itemName}
            style={{ width: "100%", height: "auto", display: "block" }}
          />
        </div>
      )}
      {children}
    </div>
  );
};

export default PuzzleCompleteCard;
