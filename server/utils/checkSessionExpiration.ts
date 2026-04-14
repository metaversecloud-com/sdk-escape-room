import { World } from "@utils/index.js";
import { VisitorData, WorldConfig, WorldDataObject } from "@shared/types/VisitorData.js";
import { teleportPlayer } from "../controllers/handleTeleportPlayer.js";

type CheckSessionExpirationParams = {
  credentials: any;
  visitor: any;
  sessionKey: string;
};

type CheckSessionExpirationResult = {
  expired: boolean;
  visitorDataObject: Record<string, VisitorData>;
  session: VisitorData;
  remainingMs: number;
  worldConfig: WorldConfig["config"] | {};
};

export const checkSessionExpiration = async ({
  credentials,
  visitor,
  sessionKey,
}: CheckSessionExpirationParams): Promise<CheckSessionExpirationResult> => {
  const { urlSlug, sceneDropId, profileId, visitorId } = credentials;

  const world = World.create(urlSlug, { credentials });
  let worldData: WorldDataObject | null = null;
  try {
    const fetchedData = await world.fetchDataObject();
    worldData = fetchedData as WorldDataObject;
  } catch (error) {
    console.log("No world config found");
  }

  const worldConfig = worldData?.[sceneDropId]?.config;

  let visitorDataObject = (await visitor.fetchDataObject()) as Record<string, VisitorData> | null;

  if (!visitorDataObject || !visitorDataObject[sessionKey]) {
    throw new Error("No active visitor session found");
  }

  const session = visitorDataObject[sessionKey];

  if (!session.sessionActive || !session.startTime) {
    return {
      expired: false,
      visitorDataObject,
      session,
      remainingMs: 0,
      worldConfig : worldData?.[sceneDropId]?.config || {},
    };
  }
  const maxSessionMinutes = worldConfig?.maxSessionMinutes || 30;
  
  const startMs = new Date(session.startTime).getTime();
  const nowMs = Date.now();
  const maxMs = maxSessionMinutes * 60 * 1000;
  const elapsedMs = nowMs - startMs;
  const remainingMs = Math.max(0, maxMs - elapsedMs);

  if (elapsedMs < maxMs) {
    return {
      expired: false,
      visitorDataObject,
      session,
      remainingMs,
      worldConfig: worldData?.[sceneDropId]?.config || {},
    };
  }

  session.sessionActive = false;
  session.timedOut = true;
  session.endTime = new Date(nowMs).toISOString();

  visitorDataObject[sessionKey] = session;

  await visitor.updateDataObject(visitorDataObject, {
    lock: { lockId: `${sessionKey}-${Date.now()}-timeout`, releaseLock: true },
    analytics: [
      {
        analyticName: "gameTimeouts",
        profileId,
        urlSlug,
        uniqueKey: `${profileId}-${sessionKey}-timeout`,
      },
    ],
  });

  await teleportPlayer(
    urlSlug,
    visitorId,
    credentials,
    "EscapeRoom_start_teleport",
  );

  return {
    expired: true,
    visitorDataObject: {
      ...visitorDataObject,
      [sessionKey]: session,
    },
    session,
    remainingMs: 0,
    worldConfig: worldData?.[sceneDropId]?.config || {},
  };
};
