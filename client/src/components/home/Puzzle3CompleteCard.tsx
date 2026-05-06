export const Puzzle3CompleteCard = () => (
  <div className="er-success-card">
    <div className="er-success-icon" aria-hidden>
      🛰️
    </div>
    <h2 style={{ color: "white" }}>Communication Signal Aligned!</h2>
    <p className="er-text-muted">The satellites are now in perfect alignment. Communication restored!</p>
    <div className="er-signal-bars" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="er-signal-bar active" />
      ))}
    </div>
  </div>
);

export default Puzzle3CompleteCard;
