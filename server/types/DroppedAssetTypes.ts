import { DroppedAssetInterface } from "@rtsdk/topia";

export interface IDroppedAsset extends DroppedAssetInterface {
  dataObject: {
    leaderboard?: number;
  };
}
