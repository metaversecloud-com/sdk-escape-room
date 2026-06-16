import { content } from "@/constants";

interface StatusBarProps {
  elapsed: string;
  currentRoom?: string | null;
  onOpenInventory: () => void;
  hasStarted: boolean;
}

const { statusBar } = content;

export const StatusBar = ({ elapsed, currentRoom, onOpenInventory, hasStarted }: StatusBarProps) => (
  <div className="card w-full">
    <div className="card-details">
      <div className="flex items-center justify-between">
        <div className="flex-col">
          <p className="p2">
            {statusBar.timerLabel} {elapsed}
          </p>
          <p className="p2">
            {statusBar.roomLabel} {currentRoom || statusBar.roomPlaceholder}
          </p>
        </div>
        <button className="btn btn-outline max-w-[100px]" onClick={onOpenInventory} disabled={!hasStarted}>
          {statusBar.inventoryButton}
        </button>
      </div>
    </div>
  </div>
);

export default StatusBar;
