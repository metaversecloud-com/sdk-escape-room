import { VisitorInterface } from "@rtsdk/topia";
import { clearVisitorInventory } from "../utils/clearVisitorInventory.js";

describe("clearVisitorInventory", () => {
  test("starts quantity updates concurrently for eligible items only", async () => {
    const activeItem = { id: "item-1", type: "ITEM", status: "ACTIVE", quantity: 2 };
    const activeNestedItem = {
      id: "item-2",
      item: { type: "ITEM" },
      status: "ACTIVE",
      quantity: 1,
    };
    const pendingResolves: Array<() => void> = [];
    const visitor = {
      inventoryItems: [
        activeItem,
        activeNestedItem,
        { id: "badge", type: "BADGE", status: "ACTIVE", quantity: 1 },
        { id: "inactive", type: "ITEM", status: "INACTIVE", quantity: 1 },
        { id: "empty", type: "ITEM", status: "ACTIVE", quantity: 0 },
      ],
      fetchInventoryItems: jest.fn().mockResolvedValue(undefined),
      modifyInventoryItemQuantity: jest.fn(
        () =>
          new Promise<void>((resolve) => {
            pendingResolves.push(resolve);
          }),
      ),
    };

    const clearing = clearVisitorInventory({
      visitor: visitor as unknown as VisitorInterface,
    });

    await Promise.resolve();

    expect(visitor.modifyInventoryItemQuantity).toHaveBeenCalledTimes(2);
    expect(visitor.modifyInventoryItemQuantity).toHaveBeenNthCalledWith(
      1,
      activeItem,
      -activeItem.quantity,
    );
    expect(visitor.modifyInventoryItemQuantity).toHaveBeenNthCalledWith(
      2,
      activeNestedItem,
      -activeNestedItem.quantity,
    );

    pendingResolves.forEach((resolve) => resolve());
    await clearing;
  });
});
