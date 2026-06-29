/**
 * Acquisition animation — clones an item image and flies it to the Inventory
 * button in the status bar. Pure DOM, no React state plumbing, so any card
 * (artifact pickup, puzzle reward, etc.) can opt in by handing this its
 * source `<img>` element on first-time acquisition.
 *
 * The clone starts at the *exact* size and opacity of the source, then over
 * the flight duration translates toward the inventory button while shrinking
 * and fading out. The transition itself is attached after the initial frame
 * is committed (double-RAF) so the first paint is at the starting state — no
 * quick-flash to the end state.
 *
 * Lookup of the target relies on `[data-inventory-target]` on the Inventory
 * button — if that attribute is missing (button not mounted, e.g. pre-start
 * screens) the animation is silently skipped.
 */
const FLIGHT_DURATION_MS = 1500;

export const flyItemToInventory = (imageUrl: string, sourceEl: HTMLElement | null): void => {
  if (!sourceEl) return;
  const target = document.querySelector<HTMLElement>("[data-inventory-target]");
  if (!target) return;

  const sourceRect = sourceEl.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  if (sourceRect.width === 0 || sourceRect.height === 0) return;

  const ghost = document.createElement("img");
  ghost.src = imageUrl;
  ghost.alt = "";
  ghost.setAttribute("aria-hidden", "true");

  // Initial state: identical position/size/opacity to the source image. NO
  // transition yet — we attach that on the second RAF below so the browser
  // commits this start frame before animating.
  Object.assign(ghost.style, {
    position: "fixed",
    left: `${sourceRect.left}px`,
    top: `${sourceRect.top}px`,
    width: `${sourceRect.width}px`,
    height: `${sourceRect.height}px`,
    margin: "0",
    objectFit: "contain",
    pointerEvents: "none",
    zIndex: "9999",
    opacity: "1",
    transformOrigin: "top left",
    transform: "translate(0px, 0px) scale(1)",
    willChange: "transform, opacity",
  });
  document.body.appendChild(ghost);

  // End state: center of the scaled ghost lands on the inventory button's
  // center. transformOrigin is top-left, and CSS transforms apply
  // right-to-left (scale first, then translate), so the post-transform
  // center sits at sourceRect.left + width*scale/2 + dx.
  const targetSize = Math.min(targetRect.width, targetRect.height);
  const longerSourceSide = Math.max(sourceRect.width, sourceRect.height);
  const scale = Math.max(0.08, (targetSize / longerSourceSide) * 0.5);
  const targetCenterX = targetRect.left + targetRect.width / 2;
  const targetCenterY = targetRect.top + targetRect.height / 2;
  const dx = targetCenterX - sourceRect.left - (sourceRect.width * scale) / 2;
  const dy = targetCenterY - sourceRect.top - (sourceRect.height * scale) / 2;

  // Double-RAF: first frame paints the ghost at full size + opacity 1, then
  // the second frame attaches the transition and sets the end state. Without
  // this, browsers often coalesce both styles into one paint and skip the
  // intermediate frames (the "quick flash" symptom).
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ghost.style.transition = `transform ${FLIGHT_DURATION_MS}ms cubic-bezier(0.32, 0, 0.45, 1), opacity ${FLIGHT_DURATION_MS}ms ease-in`;
      ghost.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
      ghost.style.opacity = "0";
    });
  });

  window.setTimeout(() => ghost.remove(), FLIGHT_DURATION_MS + 100);
};
