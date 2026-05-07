import { InventoryItemInterface } from "@rtsdk/topia";
import { Credentials } from "../types/index.js";
import { Ecosystem } from "./topiaInit.js";
import { standardizeError } from "./standardizeError.js";

interface CachedInventory {
  items: InventoryItemInterface[];
  timestamp: number;
}

const CACHE_DURATION_MS = 6 * 60 * 60 * 1000;
let inventoryCache: CachedInventory | null = null;

export const getCachedInventoryItems = async ({
  credentials,
  forceRefresh = false,
}: {
  credentials: Credentials;
  forceRefresh?: boolean;
}): Promise<InventoryItemInterface[]> => {
  try {
    const now = Date.now();
    const isCacheValid =
      inventoryCache !== null &&
      !forceRefresh &&
      now - inventoryCache.timestamp < CACHE_DURATION_MS;

    if (isCacheValid && inventoryCache) {
      return inventoryCache.items;
    }

    const ecosystem = Ecosystem.create({ credentials });
    await ecosystem.fetchInventoryItems();

    inventoryCache = {
     items: (ecosystem.inventoryItems as InventoryItemInterface[])
       .map((item) => ({
         ...item,
         metadata: {
           ...(item.metadata || {}),
           sortOrder: typeof (item.metadata as any)?.sortOrder === "number" ? (item.metadata as any).sortOrder : 0,
         },
       }))
       .sort((a, b) => {
         const aOrder = a.metadata?.sortOrder ?? 0;
         const bOrder = b.metadata?.sortOrder ?? 0;
         return aOrder - bOrder;
       }),
     timestamp: now,
   };


    return inventoryCache.items;
  } catch (error) {
    if (inventoryCache) return inventoryCache.items;
    throw standardizeError(error);
  }
};