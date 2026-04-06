import { useContext } from "react";
import { PageContainer, LockedState } from "@/components";
import { GlobalStateContext } from "@/context/GlobalContext";

export const RoomB = () => {
  const { visitorData } = useContext(GlobalStateContext);
  const session = visitorData ? Object.values(visitorData)[0] : null;
  const unlocked = session?.puzzlesCompleted?.[1] && session?.puzzlesCompleted?.[2];

  return (
    <PageContainer isLoading={false} headerText="Room B - Comms Deck">
      {!unlocked && <LockedState title="Locked" message="Restore power in Room A to unlock Room B." />}
      {unlocked && (
        <div className="flex flex-col gap-4">
        </div>
      )}
    </PageContainer>
  );
};

export default RoomB;
