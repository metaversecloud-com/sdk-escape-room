import { VisitorInterface } from "@rtsdk/topia";
import { VisitorData, VisitorDataObject, WorldConfig, WorldDataObject } from "@shared/types/VisitorData.js";
import { toasts } from "@shared/copy/toasts.js";
import { Credentials } from "../types/Credentials.js";
import { fireToast } from "./fireToast.js";
import { teleportPlayer } from "./teleportPlayer.js";
import { World } from "./topiaInit.js";

const DEFAULT_MAX_SESSION_MINUTES = 30;

interface CheckSessionExpirationParams {
  credentials: Credentials;
  visitor: VisitorInterface;
  sessionKey: string;
}

interface CheckSessionExpirationResult {
  expired: boolean;
  visitorDataObject: VisitorDataObject;
  session: VisitorData;
  remainingMs: number;
  worldConfig: WorldConfig | Record<string, never>;
}

export const checkSessionExpiration = async ({
  credentials,
  visitor,
  sessionKey,
}: CheckSessionExpirationParams): Promise<CheckSessionExpirationResult> => {
  const { urlSlug, sceneDropId, profileId, visitorId } = credentials;

  const world = World.create(urlSlug, { credentials });
  let worldData: WorldDataObject | null = null;
  try {
    worldData = (await world.fetchDataObject()) as WorldDataObject;
  } catch {
    // No world config yet — this can happen on the very first game-state fetch.
  }
  const worldConfig = worldData?.[sceneDropId] || ({} as Record<string, never>);

  const visitorDataObject = ((await visitor.fetchDataObject()) as VisitorDataObject | null) || {};
  const session = visitorDataObject[sessionKey];
  if (!session) {
    // getVisitor should have initialized this — surface the bug rather than continuing silently.
    throw new Error(`No visitor session found at "${sessionKey}". Did the controller call getVisitor first?`);
  }

  if (!session.sessionActive || !session.startTime) {
    return { expired: false, visitorDataObject, session, remainingMs: 0, worldConfig };
  }

  const maxSessionMinutes =
    (worldData?.[sceneDropId]?.maxSessionMinutes ?? DEFAULT_MAX_SESSION_MINUTES) || DEFAULT_MAX_SESSION_MINUTES;
  const startMs = new Date(session.startTime).getTime();
  const nowMs = Date.now();
  const maxMs = maxSessionMinutes * 60 * 1000;
  const elapsedMs = nowMs - startMs;
  const remainingMs = Math.max(0, maxMs - elapsedMs);

  if (elapsedMs < maxMs) {
    return { expired: false, visitorDataObject, session, remainingMs, worldConfig };
  }

  // Session has timed out — mark it inactive, write once, teleport home.
  session.sessionActive = false;
  session.timedOut = true;
  session.endTime = new Date(nowMs).toISOString();
  visitorDataObject[sessionKey] = session;

  await visitor.updateDataObject(
    { [sessionKey]: session },
    {
      lock: { lockId: `${sessionKey}-${Date.now()}-timeout`, releaseLock: true },
      analytics: [
        {
          analyticName: "gameTimeouts",
          profileId,
          urlSlug,
          uniqueKey: `${profileId}-${sessionKey}-timeout`,
          incrementBy: 1,
        },
      ],
    },
  );

  await fireToast({
    visitor,
    groupId: toasts.timeExpired.groupId,
    title: toasts.timeExpired.title,
    text: toasts.timeExpired.text,
  });

  await teleportPlayer(urlSlug, visitorId, credentials, "EscapeRoom_start_teleport");

  return { expired: true, visitorDataObject, session, remainingMs: 0, worldConfig };
};
