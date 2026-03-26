import { useContext } from "react";
import { PageContainer, PuzzleCircuit, FinalCode, LockedState } from "@/components";
import { GlobalStateContext } from "@/context/GlobalContext";

export const RoomC = () => {
  const { visitorData } = useContext(GlobalStateContext);
  const session = visitorData ? Object.values(visitorData)[0] : null;
  const unlocked = session?.puzzlesCompleted?.[3] && session?.puzzlesCompleted?.[4] && session?.puzzlesCompleted?.[5];

  return (
    <PageContainer isLoading={false} headerText="Room C - Airlock Control">
      {!unlocked && <LockedState title="Locked" message="Complete Room B to unlock Room C." />}
      {unlocked && (
        <div className="flex flex-col gap-4">
          <PuzzleCircuit />
          <FinalCode />
        </div>
      )}
    </PageContainer>
  );
};

export default RoomC;
