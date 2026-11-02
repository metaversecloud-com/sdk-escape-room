import { DEFAULT_THEME_ID, THEME_CONFIGS, ThemeConfig, ThemeID } from "@shared/themes.js";

const isThemeID = (themeID: string): themeID is ThemeID => Object.hasOwn(THEME_CONFIGS, themeID);

export const getTheme = (themeID?: string | null): ThemeConfig => {
  if (themeID === undefined || themeID === null || themeID === "") {
    return THEME_CONFIGS[DEFAULT_THEME_ID];
  }

  if (!isThemeID(themeID)) {
    throw new Error(`Unsupported themeID "${themeID}".`);
  }

  return THEME_CONFIGS[themeID];
};
