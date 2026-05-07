export const RoomBPuzzle1Complete = () => (
  <div className="grid gap-3">
    <div aria-hidden className="er-card__glow" />
    <p className="p2 er-eyebrow er-text--green">Puzzle Complete</p>
    <h3 className="er-title-gold">Communication Signal Aligned</h3>

    <p className="p2  er-text">The satellites are now in perfect alignment. Communication restored!</p>

    <div className="er-signal-bars" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="er-signal-bar active" />
      ))}
    </div>
  </div>
);

export default RoomBPuzzle1Complete;
