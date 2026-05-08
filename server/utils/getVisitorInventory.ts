export type VisitorBadgeRecord = {
  [name: string]: {
    id: string;
    name: string;
    icon: string;
  };
};

export type InventoryItemSummary = {
  id: string;
  name?: string;
  type?: string;
  imageUrl?: string | null;
  description?: string;
  metadata?: Record<string, any>;
  status?: string;
};

export type VisitorInventory = {
  badges: VisitorBadgeRecord;
  items: InventoryItemSummary[];
};

// SDK shape: visitorInventoryItems[i] = { id, status, item: { name, type, image_url, image_path, ... } }
export const getVisitorInventory = (visitorInventoryItems: any[]): VisitorInventory => {
  const visitorInventory: VisitorInventory = { badges: {}, items: [] };

  for (const visitorItem of visitorInventoryItems || []) {
    const { id, status, item } = visitorItem || {};
    const { name, type, image_url, image_path, description, metadata } = item || {};

    if (status === "ACTIVE" && name) {
      if (type === "BADGE") {
        visitorInventory.badges[name] = {
          id,
          name,
          icon: image_url || "",
        };
      } else {
        visitorInventory.items.push({
          id,
          name,
          type,
          imageUrl: image_url || image_path || null,
          description,
          metadata: metadata || {},
          status,
        });
      }
    }
  }

  return visitorInventory;
};
