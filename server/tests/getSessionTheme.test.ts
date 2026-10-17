import { THEME_CONFIGS } from "@shared/themes.js";
import { getDroppedAsset } from "../utils/droppedAssets/getDroppedAsset.js";
import { getSessionTheme } from "../utils/getSessionTheme.js";

jest.mock("../utils/droppedAssets/getDroppedAsset.js", () => ({
  getDroppedAsset: jest.fn(),
}));
const mockGetDroppedAsset = jest.mocked(getDroppedAsset);

describe("getSessionTheme", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("keeps the theme already bound to the session", async () => {
    const session = { themeID: "LIBRARY" } as any;

    await expect(getSessionTheme({} as any, session)).resolves.toEqual(THEME_CONFIGS.LIBRARY);
    expect(mockGetDroppedAsset).not.toHaveBeenCalled();
  });

  test("binds legacy active sessions to the clicked asset theme", async () => {
    mockGetDroppedAsset.mockResolvedValue({ dataObject: { themeID: "LIBRARY" } } as any);
    const session = {} as any;

    await expect(getSessionTheme({} as any, session)).resolves.toEqual(THEME_CONFIGS.LIBRARY);
    expect(session.themeID).toBe("LIBRARY");
  });

  test("defaults legacy sessions to SPACE when the clicked asset has no theme", async () => {
    mockGetDroppedAsset.mockResolvedValue({ dataObject: {} } as any);
    const session = {} as any;

    await expect(getSessionTheme({} as any, session)).resolves.toEqual(THEME_CONFIGS.SPACE);
    expect(session.themeID).toBe("SPACE");
  });
});
