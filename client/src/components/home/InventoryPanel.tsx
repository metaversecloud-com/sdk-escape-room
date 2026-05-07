import { useEffect, useState } from "react";
import { InventoryItemSummary } from "@/context/types";
import { VisitorData } from "@shared/types/VisitorData";

interface InventoryPanelProps {
  onClose: () => void;
  visitorData: VisitorData | null;
  inventoryItems?: InventoryItemSummary[];
}

const filterOwnedItems = (visitorData: VisitorData | null, items?: InventoryItemSummary[]): InventoryItemSummary[] => {
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

  // Esc closes whichever modal is on top: detail first, then the panel.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedItem) setSelectedItem(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedItem, onClose]);

  if (selectedItem) {
    return (
      <div
        className="modal-container"
        onClick={() => setSelectedItem(null)}
        role="dialog"
        aria-modal="true"
        aria-label="Inventory"
      >
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header flex gap-2 grid-cols-2 justify-between">
            <h3 className="flex-grow">{selectedItem.name}</h3>
            <button className="er-button-text" onClick={() => setSelectedItem(null)}>
              <img src="https://sdk-style.s3.amazonaws.com/icons/x.svg" style={{ width: "10px" }} />
            </button>
          </div>

          {selectedItem.imageUrl ? (
            <img src={selectedItem.imageUrl} alt={selectedItem.name || selectedItem.id} />
          ) : (
            <div className="er-inventory-fullsize-placeholder">
              <p className="p2">No larger image available for this item.</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="modal-container" onClick={onClose} role="dialog" aria-modal="true" aria-label="Mission Items">
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header flex gap-2 grid-cols-2 justify-between">
            <h3 className="flex-grow">Mission Items</h3>
            <button className="er-button-text" onClick={onClose}>
              <img src="https://sdk-style.s3.amazonaws.com/icons/x.svg" style={{ width: "10px" }} />
            </button>
          </div>

          <div className="grid gap-4">
            {filtered.length > 0 ? (
              <div className="grid gap-3">
                <p className="p2 er-inventory-tile__hint">Click on an item below to enlarge it</p>
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
                      <p className="er-inventory-tile__title">{item.name || item.id}</p>
                      <p className="p3">{itemDetail(item, visitorData)}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="p2 mt-2">Nothing in your inventory yet. Solve puzzles to collect mission items.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default InventoryPanel;
