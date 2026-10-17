import { isPuzzleInTheme, ThemeConfig } from "@shared/themes.js";
import { Credentials, VisitorData } from "../types/index.js";
import { getDroppedAsset } from "./droppedAssets/getDroppedAsset.js";
import { getTheme } from "./getTheme.js";

export const getSessionTheme = async (
  credentials: Credentials,
  session: VisitorData,
): Promise<ThemeConfig> => {
  if (session.themeID) {
    return getTheme(session.themeID);
  }

  const droppedAsset = await getDroppedAsset(credentials);
  const theme = getTheme(droppedAsset.dataObject?.themeID);

  session.themeID = theme.themeID;
  return theme;
};

export { isPuzzleInTheme };
