export const Puzzle5CompleteCard = () => (
  <div className="er-success-card">
    <div className="er-success-icon" aria-hidden>
      🔓
    </div>
    <h2 style={{ color: "white" }}>Communications Stabilized!</h2>
    <div className="er-access-card-message">
      <h3>🎫 ACCESS CARD ACQUIRED! 🎫</h3>
      <p>Access card added to your inventory!</p>
      <div className="mt-3">
        <p className="er-text-muted" style={{ marginBottom: "0.5rem" }}>
          Partial Airlock Code Revealed:
        </p>
        <div className="er-code-display">7 _ 3 _</div>
      </div>
    </div>
    <p className="er-clue-text">Check your inventory to see the Access Card. Proceed to Room C!</p>
    <div className="er-signal-bars" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="er-signal-bar active" />
      ))}
    </div>
  </div>
);

export default Puzzle5CompleteCard;
