interface StatusBarProps {
  elapsed: string;
  currentRoom?: string | null;
  onOpenInventory: () => void;
  hasStarted: boolean;
}

export const StatusBar = ({ elapsed, currentRoom, onOpenInventory, hasStarted }: StatusBarProps) => (
  <div className="card w-full">
    <div className="card-details">
      <div className="flex items-center justify-between">
        <div className="flex-col">
          <p className="p2">Timer: {elapsed}</p>
          <p className="p2">Room: {currentRoom || "--"}</p>
        </div>
        <button className="btn btn-outline max-w-[100px]" onClick={onOpenInventory} disabled={!hasStarted}>
          Inventory
        </button>
      </div>
    </div>
  </div>
);

export default StatusBar;
