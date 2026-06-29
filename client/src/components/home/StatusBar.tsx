import { content } from "@/constants";

interface StatusBarProps {
  /** Pre-formatted "MM:SS" string. */
  timer: string;
  currentRoom?: number | null;
  onOpenInventory: () => void;
  hasStarted: boolean;
}

const { statusBar } = content;

export const StatusBar = ({ timer, currentRoom, onOpenInventory, hasStarted }: StatusBarProps) => (
  <div className="card w-full">
    <div className="card-details">
      <div className="flex items-center justify-between">
        <div className="flex-col">
          <p className="p2 er-text--red">
            {statusBar.timerLabel} {timer}
          </p>
          <p className="p2">
            {statusBar.roomLabel} {currentRoom || statusBar.roomPlaceholder}
          </p>
        </div>
        <button
          className="btn btn-outline max-w-[100px]"
          onClick={onOpenInventory}
          disabled={!hasStarted}
          data-inventory-target
        >
          {statusBar.inventoryButton}
        </button>
      </div>
    </div>
  </div>
);

export default StatusBar;
