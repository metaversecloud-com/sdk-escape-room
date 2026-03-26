import { World } from "./topiaInit.js";
import { Credentials } from "../types/index.js";
import { AnalyticsEvent } from "../types/Progress.js";
import { standardizeError } from "./standardizeError.js";

type AnalyticsObject = Partial<Record<AnalyticsEvent, number>>;

const ANALYTICS_KEY = "analytics";

// This function handles incrementing a specific analytics event for a visitor; it retrieves the current analytics data from the world configuration, updates the count for the specified event, and saves the updated analytics back to the world data object. If any errors occur during this process, they are standardized and thrown for handling by the calling function.
export const incrementAnalytics = async (credentials: Credentials, event: AnalyticsEvent, by = 1) => {
  try {
    const { urlSlug, sceneDropId } = credentials;
    const world = World.create(urlSlug, { credentials });

    await world.fetchDataObject();
    const worldData = (world as any).dataObject as Record<string, any>;
    const sceneData = worldData?.[sceneDropId] || {};
    const analytics: AnalyticsObject = sceneData[ANALYTICS_KEY] || {};

    // Increment the specified analytics event by the given amount (default is 1) and update the world data object with the new analytics values, ensuring that we acquire a lock to prevent race conditions
    const updatedAnalytics = {
      ...analytics,
      [event]: (analytics[event] || 0) + by,
    };

    // Update the scene data with the new analytics object and save it back to the world data object, using a lock to prevent race conditions when multiple requests are trying to update the analytics at the same time.
    const updatedSceneData = {
      ...sceneData,
      [ANALYTICS_KEY]: updatedAnalytics,
    };

    const lockId = `${sceneDropId}-${Date.now()}`;
    await world.updateDataObject({ [sceneDropId]: updatedSceneData }, { lock: { lockId, releaseLock: true } });

    return updatedAnalytics;
  } catch (error) {
    throw standardizeError(error);
  }
};

