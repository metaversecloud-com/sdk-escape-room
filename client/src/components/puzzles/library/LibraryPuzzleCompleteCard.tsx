import { useContext } from "react";
import { GlobalStateContext } from "@/context/GlobalContext";
import { content } from "@/constants";

interface LibraryPuzzleCompleteCardProps {
  title: string;
  body: string;
  rewardSelector: string;
  puzzleNumber: 1 | 2 | 3;
}

export const LibraryPuzzleCompleteCard = ({
  title,
  body,
  rewardSelector,
  puzzleNumber,
}: LibraryPuzzleCompleteCardProps) => {
  const { visitorInventory, visitorData } = useContext(GlobalStateContext);
  const rewardItemId = visitorData?.libraryRewardItemIds?.[puzzleNumber];
  const reward = visitorInventory?.items?.find(
    (item) =>
      item.metadata?.escapeRoomReward === rewardSelector ||
      (rewardItemId !== undefined && item.id === rewardItemId),
  );
  const rewardWasGranted = reward !== undefined || rewardItemId !== undefined;

  return (
    <div className="card w-full">
      <div className="card-details">
        <h3 className="card-title">{title}</h3>
        <p className="p2 text-success" role="status">
          {body}
        </p>
        <div className="library-paper-success grid gap-2 mt-3">
          <p className="p2" role="status">
            {rewardWasGranted ? content.libraryPuzzleReward.acquired : content.libraryPuzzleReward.unavailable}
          </p>
          {reward?.imageUrl && (
            <div className="mx-auto h-40 w-full max-w-[220px]">
              <img className="library-paper-image" src={reward.imageUrl} alt="Paper" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
