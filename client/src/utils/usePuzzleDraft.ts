import { useContext, useEffect, useRef } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { backendAPI } from "./backendAPI";

/**
 * Persist a puzzle's in-progress state to the visitor's data object on the
 * server, debounced so rapid clicks/keystrokes don't fire one request per
 * change.
 *
 * Usage in a puzzle component:
 *
 *   const initialDraft = useInitialPuzzleDraft<MyDraftShape>(PUZZLE_N);
 *   const [foo, setFoo] = useState(initialDraft?.foo ?? defaults.foo);
 *   const [bar, setBar] = useState(initialDraft?.bar ?? defaults.bar);
 *   usePuzzleDraft(PUZZLE_N, { foo, bar });
 *
 * Reads happen via `useInitialPuzzleDraft` (one-time, snapshot at mount).
 * Writes happen via `usePuzzleDraft` (re-fires whenever the draft object
 * changes, after a short debounce window).
 *
 * Both are no-ops when there's no active session — the server short-circuits
 * the write too, but skipping client-side avoids the round-trip.
 */

const DEBOUNCE_MS = 400;

/**
 * Read the saved draft for a puzzle at component-mount time. Doesn't subscribe
 * to subsequent context updates — we treat the visitor session that was loaded
 * when the puzzle UI first appeared as the source of truth for "resume from
 * here". Otherwise the saved draft would clobber the player's live inputs.
 */
export const useInitialPuzzleDraft = <T = unknown>(puzzleNumber: number): T | undefined => {
  const { visitorData } = useContext(GlobalStateContext);
  // useRef pinning ensures the value is captured on first render.
  const ref = useRef<T | undefined>(visitorData?.puzzleDrafts?.[puzzleNumber] as T | undefined);
  return ref.current;
};

/**
 * Save the current draft snapshot to the server on a debounce. Pass the
 * complete shape on every render — the hook only fires a write when the
 * serialized shape changes.
 */
export const usePuzzleDraft = (puzzleNumber: number, draft: unknown): void => {
  const { visitorData } = useContext(GlobalStateContext);
  const sessionActive = visitorData?.sessionActive === true;

  // Serialize for a stable dependency. Object identity changes every render
  // even when the meaningful contents haven't changed; comparing the JSON
  // string keeps the effect from firing on every keystroke render.
  const serialized = JSON.stringify(draft);

  // Skip the initial-render save to avoid round-tripping the default state
  // back to the server immediately on mount.
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!sessionActive) return;
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    const id = window.setTimeout(() => {
      backendAPI.post("/puzzle-draft", { puzzleNumber, draft }).catch(() => {
        // Silent — failing to save a draft shouldn't surface a user-facing
        // error. Worst case the next change saves successfully.
      });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
    // `draft` is referenced by `serialized` for the dep check; suppressing
    // the exhaustive-deps warning so we don't re-fire on every render when
    // the parent passes a fresh object that's structurally identical.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puzzleNumber, serialized, sessionActive]);
};
