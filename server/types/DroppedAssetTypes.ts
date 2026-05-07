import { DroppedAssetInterface } from "@rtsdk/topia";

export interface KeyAssetDataObject {
  // Pipe-delimited entries keyed by `${profileId}-${timestamp}`: "displayName|completionTime"
  leaderboard?: Record<string, string>;
}

export interface IDroppedAsset extends DroppedAssetInterface {
  dataObject: KeyAssetDataObject;
}
