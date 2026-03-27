import { VisitorInterface } from "@rtsdk/topia";
import { Visitor } from "./topiaInit.js";
import { Credentials } from "../types/index.js";
import { standardizeError } from "./standardizeError.js";
import { VisitorDataObjectType } from "@shared/types/VisitorData.js";

export const getVisitor = async (credentials: Credentials, shouldGetVisitorDetails = false) => {
  try {
    const { sceneDropId, urlSlug, visitorId } = credentials;

    let visitor: VisitorInterface;
    if (shouldGetVisitorDetails) visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    else visitor = await Visitor.create(visitorId, urlSlug, { credentials });

    if (!visitor) throw "Not in world";

    const dataObject = (await visitor.fetchDataObject()) as VisitorDataObjectType;

    const lockId = `${sceneDropId}-${new Date(Math.round(new Date().getTime() / 60000) * 60000)}`;

    // If no visitor data object exists for this scene drop and URL slug, create a new one with default session state; this ensures that we have a consistent structure for tracking the player's progress and session information for the escape room game, even if they are starting fresh or if their previous session data was lost.
    // The session state includes information about whether the game has started, when it started, which room the player is currently in, which rooms are unlocked, which puzzles have been completed, and whether the session has expired or timed out; by initializing this data structure when the visitor first interacts with the game, we can reliably track their progress and manage their game state as they play through the escape room experience.
    // We use a lock when creating or updating the visitor data object to prevent race conditions
    const defaultSessionData = {
      startTime: undefined,
      sessionActive: false,
      sessionExpired: false,
      timedOut: false,
      currentRoom: null,
      puzzlesCompleted: { 1: false, 2: false, 3: false, 4: false, 5: false, 6: false },
      inventory: {},
      badges: [],
    };

    if (!dataObject) {
      await visitor.setDataObject(
        { [`${urlSlug}-${sceneDropId}`]: defaultSessionData },
        { lock: { lockId, releaseLock: true } },
      );
    } else if (!dataObject[`${urlSlug}-${sceneDropId}`]) {
      await visitor.updateDataObject(
        { [`${urlSlug}-${sceneDropId}`]: defaultSessionData },
        { lock: { lockId, releaseLock: true } },
      );
    }

    const visitorDataObject = (await visitor.fetchDataObject()) as VisitorDataObjectType;

    await visitor.fetchInventoryItems();
    let visitorInventory: { [key: string]: { id: string; icon: string; name: string } } = {};

    for (const visitorItem of visitor.inventoryItems) {
      const { id, status, item } = visitorItem;
      const { name, type, image_url = "" } = item || {};

      if (status === "ACTIVE" && type === "BADGE") {
        visitorInventory[name] = {
          id,
          icon: image_url,
          name,
        };
      }
    }

    return { visitor, visitorInventory, visitorDataObject };
  } catch (error) {
    throw standardizeError(error);
  }
};
