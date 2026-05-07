export const RoomBPuzzle3Complete = () => (
  <div className="grid gap-3">
    <div aria-hidden className="er-card__glow" />
    <p className="p2 er-eyebrow er-text--green">Puzzle Complete</p>
    <h3 className="er-title-gold">Communications Stabilized</h3>

    <div className="er-reconstructed-message my-2 p-3 grid gap-3">
      <h4>ACCESS CARD ACQUIRED</h4>
      <p className="p2 er-text-dim">Access card added to your inventory!</p>
      <p className="er-text-muted">Partial Airlock Code Revealed:</p>
      <div className="er-code-display">7 _ 3 _</div>
    </div>

    <p className="er-next-clue">Check your inventory to see the Access Card. Proceed to Room C!</p>
  </div>
);

export default RoomBPuzzle3Complete;
