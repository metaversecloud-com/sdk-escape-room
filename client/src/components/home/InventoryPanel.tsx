import { useEffect, useMemo, useState } from "react";
import { content } from "@/constants";
import { InventoryItemSummary } from "@/context/types";

interface InventoryPanelProps {
  onClose: () => void;
  inventoryItems?: InventoryItemSummary[];
}

const { inventory } = content;
const { tabs: tabCopy } = inventory;

type TabId = "keyItems" | "artifacts";

const itemType = (item: InventoryItemSummary): string | undefined => item.metadata?.type;
const itemRoom = (item: InventoryItemSummary): number | undefined => item.metadata?.room;
const itemSortOrder = (item: InventoryItemSummary): number => item.metadata?.sortOrder ?? 0;

/**
 * Sort items by `metadata.sortOrder` ascending, falling back to item name
 * so order is deterministic even when sortOrders collide.
 */
const sortByMetadata = (items: InventoryItemSummary[]) =>
  [...items].sort((a, b) => {
    const delta = itemSortOrder(a) - itemSortOrder(b);
    if (delta !== 0) return delta;
    return (a.name || "").localeCompare(b.name || "");
  });

export const InventoryPanel = ({ onClose, inventoryItems }: InventoryPanelProps) => {
  const [selectedItem, setSelectedItem] = useState<InventoryItemSummary | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("keyItems");
  /** Selected room filter on the Artifacts tab. `null` = "All". */
  const [artifactRoomFilter, setArtifactRoomFilter] = useState<number | null>(null);

  // Memoize so a parent re-render that re-creates `inventoryItems` doesn't
  // cascade into the partition/sort memos below.
  const items = useMemo(() => inventoryItems || [], [inventoryItems]);

  // Partition by metadata.type. Items without a type (legacy / mis-configured)
  // surface under Key Items so they don't silently disappear.
  const { keyItems, artifacts } = useMemo(() => {
    const keyItems: InventoryItemSummary[] = [];
    const artifacts: InventoryItemSummary[] = [];
    for (const item of items) {
      if (itemType(item) === "artifact") artifacts.push(item);
      else keyItems.push(item);
    }
    return { keyItems: sortByMetadata(keyItems), artifacts: sortByMetadata(artifacts) };
  }, [items]);

  // Rooms present in the artifact set, sorted, for the filter dropdown.
  const artifactRooms = useMemo(() => {
    const set = new Set<number>();
    for (const a of artifacts) {
      const r = itemRoom(a);
      if (typeof r === "number") set.add(r);
    }
    return [...set].sort((a, b) => a - b);
  }, [artifacts]);

  const visibleArtifacts =
    artifactRoomFilter === null ? artifacts : artifacts.filter((a) => itemRoom(a) === artifactRoomFilter);

  const tabItems = activeTab === "keyItems" ? keyItems : visibleArtifacts;
  const emptyMessage =
    activeTab === "keyItems"
      ? inventory.keyItemsEmpty
      : artifactRoomFilter !== null
        ? inventory.artifactsEmptyForRoom
        : inventory.artifactsEmpty;

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
    <div
      className="modal-container"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={inventory.panelTitle}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header flex gap-2 grid-cols-2 justify-between">
          <h3 className="flex-grow">{inventory.panelTitle}</h3>
          <button className="er-button-text" onClick={onClose}>
            <img src="https://sdk-style.s3.amazonaws.com/icons/x.svg" style={{ width: "10px" }} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-2" role="tablist">
          {(["keyItems", "artifacts"] as TabId[]).map((id) => {
            const active = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                className={active ? "btn" : "btn btn-outline"}
                onClick={() => setActiveTab(id)}
              >
                {tabCopy[id]}
              </button>
            );
          })}
        </div>

        {/* Room filter, artifacts tab only. Hidden when there are no artifacts
            or only one room — the dropdown would be a single option. */}
        {activeTab === "artifacts" && artifactRooms.length > 1 && (
          <div className="flex items-center gap-2 mb-2">
            <label className="p2 min-w-[100px]" htmlFor="artifact-room-filter">
              {inventory.roomFilterLabel}:
            </label>
            <select
              id="artifact-room-filter"
              className="input"
              value={artifactRoomFilter === null ? "" : String(artifactRoomFilter)}
              onChange={(e) => setArtifactRoomFilter(e.target.value === "" ? null : Number(e.target.value))}
            >
              <option value="">{inventory.roomFilterAll}</option>
              {artifactRooms.map((room) => (
                <option key={room} value={room}>
                  {inventory.roomFilterTemplate.replace("{room}", String(room))}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid gap-4">
          {tabItems.length > 0 ? (
            <div className="grid gap-3">
              <p className="p2 er-inventory-tile__hint">{inventory.clickHint}</p>
              {tabItems.map((item) => (
                <button key={item.id} type="button" className="er-inventory-tile" onClick={() => setSelectedItem(item)}>
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
            <p className="p2 mt-2">{emptyMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryPanel;
