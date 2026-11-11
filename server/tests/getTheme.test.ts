import { DEFAULT_THEME_ID, THEME_CONFIGS } from "@shared/themes.js";
import { getTheme } from "../utils/getTheme.js";

describe("getTheme", () => {
  test("defaults to SPACE when the key asset has no theme ID", () => {
    expect(getTheme()).toEqual(THEME_CONFIGS[DEFAULT_THEME_ID]);
    expect(getTheme(null)).toEqual(THEME_CONFIGS.SPACE);
  });

  test("returns the selected theme configuration", () => {
    expect(getTheme("LIBRARY")).toEqual(THEME_CONFIGS.LIBRARY);
  });

  test("rejects unsupported theme IDs", () => {
    expect(() => getTheme("UNKNOWN")).toThrow('Unsupported themeID "UNKNOWN".');
  });
});
