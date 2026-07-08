import { backendAPI } from "./backendAPI";

/**
 * Tells the server the player just made a wrong interaction on `puzzleNumber`.
 * The server bumps a counter and awards the **Button Masher** badge if the
 * count crosses the threshold for any single puzzle.
 *
 * Fire-and-forget — a failed network call shouldn't surface as a player-facing
 * error since this is a side-effect of an already-shown "wrong answer" state.
 * The badge (and any updated inventory) will land on the next /game-state
 * fetch, which the badges tab triggers on open.
 */
export const reportWrongAttempt = (puzzleNumber: number): void => {
  backendAPI.post("/wrong-attempt", { puzzleNumber }).catch(() => {});
};
