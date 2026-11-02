import {
  applyLibraryRewardSelectors,
  getVisitorInventory,
} from "../utils/getVisitorInventory.js";

describe("getVisitorInventory", () => {
  test("uses the ecosystem item ID from Topia user inventory records", () => {
    const inventory = getVisitorInventory([
      {
        id: "visitor-inventory-record",
        item_id: "paper-c",
        status: "ACTIVE",
        quantity: 1,
        item: {
          name: "Paper",
          type: "ITEM",
          metadata: { escapeRoomReward: "library-d7a6" },
        },
      },
    ]);

    expect(inventory.items).toEqual([
      expect.objectContaining({
        id: "paper-c",
        name: "Paper",
        metadata: { escapeRoomReward: "library-d7a6" },
      }),
    ]);
  });

  test("restores selector metadata for inferred Papers using persisted item IDs", () => {
    const inventory = applyLibraryRewardSelectors(
      {
        badges: {},
        items: [
          { id: "paper-c", name: "Paper", metadata: {} },
          { id: "paper-a", name: "Paper", metadata: {} },
        ],
      },
      { 3: "paper-c" },
    );

    expect(inventory.items).toEqual([
      expect.objectContaining({
        id: "paper-c",
        metadata: { type: "keyItem", escapeRoomReward: "library-d7a6" },
      }),
      expect.objectContaining({ id: "paper-a", metadata: {} }),
    ]);
  });
});
