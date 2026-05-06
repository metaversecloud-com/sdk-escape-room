interface StatusBarProps {
  elapsed: string;
  currentRoom?: string | null;
  onOpenInventory: () => void;
  onExit: () => void;
  isLoading: boolean;
  hasStarted: boolean;
}

export const StatusBar = ({ elapsed, currentRoom, onOpenInventory, onExit, isLoading, hasStarted }: StatusBarProps) => (
  <div className="card w-full">
    <div className="card-details">
      <div className="flex items-center justify-between">
        <div className="flex-col">
          <p className="p2">Timer: {elapsed}</p>
          <p className="p2">Room: {currentRoom || "--"}</p>
        </div>
        <div className="card-actions">
          <button className="btn btn-outline" onClick={onOpenInventory} disabled={!hasStarted}>
            Inventory
          </button>
          <button className="btn btn-outline" onClick={onExit} disabled={isLoading}>
            Exit
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default StatusBar;
