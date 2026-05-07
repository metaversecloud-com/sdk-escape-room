const SCRAMBLED = ["EVLAV", "KLCO", "EURSSRPE"];

export const RoomBPuzzle2Complete = () => (
  <div className="card er-card--green">
    <p className="p2 er-eyebrow er-eyebrow--green">Puzzle Complete</p>
    <h3 className="er-title-gold">Communication Signal Aligned</h3>

    <div className="er-reconstructed-message my-2 p-3 grid gap-3">
      <h4>The torn fragments reveal a scrambled transmission:</h4>
      <div className="er-scrambled-output my-2">
        {SCRAMBLED.map((line) => (
          <div key={line} className="er-scrambled-line">
            {line}
          </div>
        ))}
      </div>
    </div>
    <p className="er-next-clue">These scrambled words hold the key to the next puzzle...</p>
  </div>
);

export default RoomBPuzzle2Complete;
