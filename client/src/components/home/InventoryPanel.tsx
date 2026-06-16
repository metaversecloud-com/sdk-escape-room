import { useEffect, useState } from "react";
import { content } from "@/constants";
import { InventoryItemSummary } from "@/context/types";

interface InventoryPanelProps {
  onClose: () => void;
  inventoryItems?: InventoryItemSummary[];
}

const { inventory } = content;

export const InventoryPanel = ({ onClose, inventoryItems }: InventoryPanelProps) => {
  const [selectedItem, setSelectedItem] = useState<InventoryItemSummary | null>(null);
  const items = inventoryItems || [];

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
        aria-label={inventory.panelTitle}
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
              <p className="p2">{inventory.noLargerImage}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="modal-container" onClick={onClose} role="dialog" aria-modal="true" aria-label={inventory.panelTitle}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex gap-2 grid-cols-2 justify-between">
          <h3 className="flex-grow">{inventory.panelTitle}</h3>
          <button className="er-button-text" onClick={onClose}>
            <img src="https://sdk-style.s3.amazonaws.com/icons/x.svg" style={{ width: "10px" }} />
          </button>
        </div>

        <div className="grid gap-4">
          {items.length > 0 ? (
            <div className="grid gap-3">
              <p className="p2 er-inventory-tile__hint">{inventory.clickHint}</p>
              {items.map((item) => (
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
                      <span className="p3">{inventory.noPreview}</span>
                    </div>
                  )}
                  <div className="flex flex-col">
                    <p className="er-inventory-tile__title">{item.name || item.id}</p>
                    {item.description && <p className="p3">{item.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="p2 mt-2">{inventory.emptyState}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryPanel;
