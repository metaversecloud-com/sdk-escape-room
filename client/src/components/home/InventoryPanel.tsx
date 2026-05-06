import { useState } from "react";
import { InventoryItemSummary } from "@/context/types";
import { VisitorData } from "@shared/types/VisitorData";

interface InventoryPanelProps {
  onClose: () => void;
  visitorData: VisitorData | null;
  inventoryItems?: InventoryItemSummary[];
}

const filterOwnedItems = (
  visitorData: VisitorData | null,
  items?: InventoryItemSummary[],
): InventoryItemSummary[] => {
  if (!items) return [];
  const hasFuse = !!visitorData?.inventory?.fuse;
  const hasWrench = !!visitorData?.inventory?.wrench;
  const hasCard = !!visitorData?.inventory?.accessCard;
  return items.filter((item) => {
    const name = (item.name || item.id || "").toLowerCase();
    if (name.includes("fuse")) return hasFuse;
    if (name.includes("wrench")) return hasWrench;
    if (name.includes("access")) return hasCard;
    return false;
  });
};

const itemDetail = (item: InventoryItemSummary, visitorData: VisitorData | null): string => {
  const localSerial =
    item.id === "fuse"
      ? visitorData?.inventory?.fuse?.serial
      : item.id === "wrench"
        ? visitorData?.inventory?.wrench?.serial
        : item.id === "accessCard"
          ? visitorData?.inventory?.accessCard?.partialCode
          : undefined;
  return item.metadata?.serial || localSerial || item.description || "Item collected";
};

export const InventoryPanel = ({ onClose, visitorData, inventoryItems }: InventoryPanelProps) => {
  const [selectedItem, setSelectedItem] = useState<InventoryItemSummary | null>(null);
  const filtered = filterOwnedItems(visitorData, inventoryItems);

  return (
    <>
      <div className="card w-full">
        <div className="card-details">
          <div className="card-actions">
            <button className="btn btn-text" onClick={onClose}>
              Close
            </button>
          </div>

          <h3 className="card-title">Inventory</h3>

          <div className="grid gap-4">
            <div className="card">
              <div className="card-details">
                <h4 className="h4">Mission Items</h4>
                {filtered.length > 0 ? (
                  <div className="grid gap-3">
                    {filtered.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="er-inventory-tile"
                        onClick={() => setSelectedItem(item)}
                      >
                        {item.imageUrl ? (
                          <img className="er-inventory-tile__thumb" src={item.imageUrl} alt={item.name || item.id} />
                        ) : (
                          <div className="er-inventory-tile__placeholder">
                            <span className="p3">No preview</span>
                          </div>
                        )}
                        <div className="flex flex-col">
                          <p className="p2 er-inventory-tile__title">{item.name || item.id}</p>
                          <p className="p3 er-inventory-tile__detail">{itemDetail(item, visitorData)}</p>
                          <p className="p3 er-inventory-tile__hint">Click to enlarge</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="p2 er-text-muted">
                    Nothing in your inventory yet. Solve puzzles to collect mission items.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedItem && (
        <div className="er-modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="card er-modal" onClick={(e) => e.stopPropagation()}>
            <div className="card-details">
              <div className="card-actions">
                <button className="btn btn-text" onClick={() => setSelectedItem(null)}>
                  Close
                </button>
              </div>
              <h3 className="card-title">{selectedItem.name || selectedItem.id}</h3>
              {selectedItem.imageUrl ? (
                <img
                  className="er-inventory-fullsize"
                  src={selectedItem.imageUrl}
                  alt={selectedItem.name || selectedItem.id}
                />
              ) : (
                <div className="er-inventory-fullsize-placeholder">
                  <p className="p2">No larger image available for this item.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryPanel;
