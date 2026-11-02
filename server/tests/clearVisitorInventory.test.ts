import { VisitorInterface } from "@rtsdk/topia";
import { clearVisitorInventory } from "../utils/clearVisitorInventory.js";

describe("clearVisitorInventory", () => {
  test("clears every active non-badge owned item by its own inventory ID", async () => {
    const paperA = {
      id: "owned-paper-a",
      item_id: "paper-a",
      status: "ACTIVE",
      type: "ITEM",
      quantity: 1,
      item: { name: "Paper", type: "ITEM" },
    };
    const paperB = {
      id: "owned-paper-b",
      item_id: "paper-b",
      status: "ACTIVE",
      type: "ITEM",
      quantity: 2,
      item: { name: "Paper", type: "ITEM" },
    };
    const badge = {
      id: "owned-badge",
      item_id: "badge",
      status: "ACTIVE",
      type: "BADGE",
      quantity: 1,
      item: { name: "Achievement", type: "BADGE" },
    };
    const visitor = {
      inventoryItems: [paperA, paperB, badge],
      fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
      modifyInventoryItemQuantity: jest.fn().mockResolvedValue({}),
    } as unknown as VisitorInterface;

    await clearVisitorInventory({
      visitor,
    });

    expect(visitor.fetchInventoryItems).toHaveBeenCalledTimes(1);
    expect(visitor.modifyInventoryItemQuantity).toHaveBeenNthCalledWith(1, paperA, -1);
    expect(visitor.modifyInventoryItemQuantity).toHaveBeenNthCalledWith(2, paperB, -2);
    expect(visitor.modifyInventoryItemQuantity).toHaveBeenCalledTimes(2);
  });
});
