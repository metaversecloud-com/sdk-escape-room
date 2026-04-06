import { ActionType, SET_ACTIVE_PUZZLE } from "@/context/types";
import { Dispatch } from "react";

export const setActivePuzzle = (
  dispatch: Dispatch<ActionType> | null,
  activePuzzle: 1 | 2 | 3 | 4 | 5 | 6 | null,
) => {
  if (!dispatch) return;

  dispatch({
    type: SET_ACTIVE_PUZZLE,
    payload: { activePuzzle },
  });
};