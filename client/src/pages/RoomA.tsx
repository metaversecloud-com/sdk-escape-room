import { useContext } from "react";
import { PageContainer, PuzzlePowerConsole, PuzzleReactorSwitch, LockedState } from "@/components";
import { GlobalStateContext } from "@/context/GlobalContext";

export const RoomA = () => {
  const { visitorData } = useContext(GlobalStateContext);
  const session = visitorData ? Object.values(visitorData)[0] : null;
  const unlocked = session?.sessionActive;

  return (
    <PageContainer isLoading={false} headerText="Room A - Power Bay">
      {!unlocked && <LockedState title="Locked" message="Complete prior steps to enter Room A." />}
      {unlocked && (
        <div className="flex flex-col gap-4">
          <PuzzlePowerConsole />
          <PuzzleReactorSwitch />
        </div>
      )}
    </PageContainer>
  );
};

export default RoomA;
