const SCRAMBLED = ["EVLAV", "KLCO", "EURSSRPE"];

export const Puzzle4CompleteCard = () => (
  <div className="er-success-card">
    <h2 style={{ color: "white" }}>Transmission Reconstructed!</h2>
    <div className="er-reconstructed-message">
      <h3>The torn fragments reveal a scrambled transmission:</h3>
      <div className="er-scrambled-output">
        {SCRAMBLED.map((line) => (
          <div key={line} className="er-scrambled-line">
            {line}
          </div>
        ))}
      </div>
      <p className="er-next-clue">These scrambled words hold the key to the next puzzle...</p>
    </div>
  </div>
);

export default Puzzle4CompleteCard;
