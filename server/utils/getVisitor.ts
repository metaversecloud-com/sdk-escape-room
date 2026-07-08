import { VisitorInterface } from "@rtsdk/topia";
import { Visitor } from "./topiaInit.js";
import { Credentials } from "../types/index.js";
import { standardizeError } from "./standardizeError.js";
import { getDefaultVisitorData } from "./getDefaultVisitorData.js";
import { getVisitorInventory, VisitorInventory } from "./getVisitorInventory.js";
import { VisitorData, VisitorDataObject } from "@shared/types/VisitorData.js";

export interface GetVisitorResult {
  visitor: VisitorInterface;
  visitorDataObject: VisitorDataObject;
  session: VisitorData;
  visitorInventory: VisitorInventory;
}

/**
 * Loads (or creates) the Visitor and guarantees that the per-session VisitorData
 * record exists at `${urlSlug}-${sceneDropId}` with default values. This is the
 * single source of truth for visitor data initialization — every controller
 * should call this first so downstream `updateDataObject` calls are safe.
 */
export const getVisitor = async (
  credentials: Credentials,
  shouldGetVisitorDetails = false,
): Promise<GetVisitorResult> => {
  try {
    const { sceneDropId, urlSlug, visitorId } = credentials;
    const sessionKey = `${urlSlug}-${sceneDropId}`;

    const visitor: VisitorInterface = shouldGetVisitorDetails
      ? await Visitor.get(visitorId, urlSlug, { credentials })
      : Visitor.create(visitorId, urlSlug, { credentials });

    if (!visitor) throw new Error("Not in world");

    let visitorDataObject = (await visitor.fetchDataObject()) as VisitorDataObject;

    // Ensure the session-keyed VisitorData exists with default shape so every
    // controller can safely call updateDataObject({ [sessionKey]: ... }).
    if (!visitorDataObject[sessionKey]) {
      const defaults = getDefaultVisitorData();
      const lockId = `${sessionKey}-${new Date(Math.round(Date.now() / 60000) * 60000)}-init`;

      if (!visitorDataObject) {
        await visitor.setDataObject({ [sessionKey]: defaults }, { lock: { lockId, releaseLock: true } });
      } else {
        await visitor.updateDataObject({ [sessionKey]: defaults }, { lock: { lockId, releaseLock: true } });
      }
      visitorDataObject = { ...visitorDataObject, [sessionKey]: defaults };
    }

    await visitor.fetchInventoryItems();
    const visitorInventory = getVisitorInventory(visitor.inventoryItems || []);

    return {
      visitor,
      visitorDataObject,
      session: visitorDataObject[sessionKey],
      visitorInventory,
    };
  } catch (error) {
    throw standardizeError(error);
  }
};
