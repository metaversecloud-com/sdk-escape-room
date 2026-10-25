import { getArtifactItemName, getFinalPuzzleNumber, isPuzzleInTheme, THEME_CONFIGS } from "@shared/themes.js";
import {
  getPuzzleNumberFromScreen,
  getRoomForScreen,
  isArtifactScreen,
  isRoomComplete,
  resolveThemeScreen,
} from "../../client/src/utils/themeRouting.js";

describe("theme-aware screen routing", () => {
  test("allows only the configured LIBRARY room, puzzle, and artifact screens", () => {
    const libraryTheme = THEME_CONFIGS.LIBRARY;
    const libraryArtifactScreens = ["paper1", "paper2", "paper3", "paper4", "bookcase"];

    expect(resolveThemeScreen("room1", libraryTheme)).toBe("room1");
    expect(resolveThemeScreen("room2", libraryTheme)).toBe("null");
    expect(resolveThemeScreen("puzzle4", libraryTheme)).toBe("puzzle4");
    expect(resolveThemeScreen("puzzle5", libraryTheme)).toBe("null");
    const resolvedLibraryArtifactScreens = libraryArtifactScreens.map((screen) =>
      resolveThemeScreen(screen, libraryTheme),
    );
    expect(resolvedLibraryArtifactScreens).toEqual(libraryArtifactScreens);
    expect(resolvedLibraryArtifactScreens.every((screen) => isArtifactScreen(screen, libraryTheme))).toBe(true);
    expect(resolveThemeScreen("CrewPortrait1", libraryTheme)).toBe("null");
    expect(resolveThemeScreen("decoy", libraryTheme)).toBe("null");
    expect(getArtifactItemName("paper1")).toBe("Paper 1");
    expect(getArtifactItemName("bookcase")).toBe("Bookcase");
    expect(getPuzzleNumberFromScreen(resolveThemeScreen("puzzle4", libraryTheme))).toBe(4);
    expect(getRoomForScreen(resolveThemeScreen("puzzle4", libraryTheme), libraryTheme)).toBe(1);
  });

  test("preserves all current SPACE puzzle routes and artifact routes", () => {
    const spaceTheme = THEME_CONFIGS.SPACE;

    expect(resolveThemeScreen("puzzle7", spaceTheme)).toBe("puzzle7");
    expect(resolveThemeScreen("room3", spaceTheme)).toBe("room3");
    expect(
      spaceTheme.artifactScreens.every((screen) =>
        isArtifactScreen(resolveThemeScreen(screen, spaceTheme), spaceTheme),
      ),
    ).toBe(true);
    expect(isArtifactScreen(resolveThemeScreen("decoy", spaceTheme), spaceTheme)).toBe(false);
    expect(resolveThemeScreen("paper1", spaceTheme)).toBe("null");
    expect(resolveThemeScreen("bookcase", spaceTheme)).toBe("null");
  });

  test("checks completion against each theme's room puzzle assignments", () => {
    expect(isRoomComplete(THEME_CONFIGS.LIBRARY, { 1: true, 2: true, 3: true, 4: true }, 1)).toBe(true);
    expect(isRoomComplete(THEME_CONFIGS.LIBRARY, { 1: true, 2: true, 3: true }, 1)).toBe(false);
    expect(isRoomComplete(THEME_CONFIGS.SPACE, { 1: true, 2: true }, 1)).toBe(true);
  });

  test("validates theme puzzle membership and resolves each final puzzle", () => {
    expect(isPuzzleInTheme(THEME_CONFIGS.LIBRARY, 4)).toBe(true);
    expect(isPuzzleInTheme(THEME_CONFIGS.LIBRARY, 5)).toBe(false);
    expect(getFinalPuzzleNumber(THEME_CONFIGS.LIBRARY)).toBe(4);
    expect(getFinalPuzzleNumber(THEME_CONFIGS.SPACE)).toBe(7);
  });
});
