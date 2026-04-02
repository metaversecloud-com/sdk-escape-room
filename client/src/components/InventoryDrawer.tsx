import { InventoryItemId, InventoryItem } from "@shared/types/VisitorData";

type Props = {
  items?: Record<string, InventoryItem>;
  isOpen: boolean;
  onClose: () => void;
};

const itemLabel = (itemId: InventoryItemId | string) => {
  if (itemId === "fuse") return "Fuse";
  if (itemId === "wrench") return "Wrench";
  if (itemId === "accessCard") return "Access Card";
  return itemId;
};

export const InventoryDrawer = ({ items, isOpen, onClose }: Props) => {
  if (!isOpen) return null;
  const list = items ? Object.values(items) : [];

  return (
    <div className="card p-4" style={{ position: "absolute", right: "1rem", top: "1rem", zIndex: 10, minWidth: "260px" }}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="h4">Inventory</h4>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Close
        </button>
      </div>
      {list.length === 0 && <p className="p3 text-muted">No items yet.</p>}
      <ul className="list">
        {list.map((item) => (
          <li key={item.id} className="p2">
            <strong>{itemLabel(item.id)}</strong>
            {item.serial && <span className="text-muted ml-1">({item.serial})</span>}
            {item.partialCode && <div className="p3">Hint: {item.partialCode}</div>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default InventoryDrawer;
