import type { Credentials } from "../types/Credentials.js";

const getLockWindow = () => Math.round(Date.now() / 60000);

export const getVisitorDataObjectLockId = (
  credentials: Pick<Credentials, "urlSlug" | "sceneDropId" | "visitorId">,
) =>
  `${credentials.urlSlug}-${credentials.sceneDropId}-${credentials.visitorId}-visitor-${getLockWindow()}`;

export const getKeyAssetDataObjectLockId = (
  credentials: Pick<Credentials, "urlSlug" | "sceneDropId">,
) =>
  `${credentials.urlSlug}-${credentials.sceneDropId}-key-asset-${getLockWindow()}`;
