interface ExitGameCardProps {
  onExit: () => void;
  isLoading: boolean;
}

export const ExitGameCard = ({ onExit, isLoading }: ExitGameCardProps) => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">Exit Escape Room</h3>
      <p className="card-description p2">End your current session and return to the start area.</p>
      <div className="card-actions">
        <button className="btn btn-outline" onClick={onExit} disabled={isLoading}>
          Exit Game
        </button>
      </div>
    </div>
  </div>
);

export default ExitGameCard;
