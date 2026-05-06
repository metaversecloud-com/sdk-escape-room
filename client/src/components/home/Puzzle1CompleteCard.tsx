export const Puzzle1CompleteCard = () => (
  <div className="card w-full er-card er-card--green">
    <div aria-hidden className="er-card__glow" />
    <div className="card-details flex flex-col md:flex-row items-center gap-5 er-card__details-relative">
      <div className="flex-1">
        <p className="p2 er-eyebrow er-eyebrow--green" style={{ marginBottom: 6 }}>
          Power Bay Secure
        </p>
        <h3 className="card-title er-title-gold">Puzzle Complete</h3>
        <p className="p2 mt-2 er-text">Electrical cabinet unlocked.</p>
        <p className="p2 mt-2 er-text">
          <strong>Commander Vega</strong>: “Nice work, crew. Keep momentum!”
        </p>
      </div>
    </div>
    <div className="card-details flex flex-col md:flex-row items-center gap-5 er-card__details-relative">
      <div className="flex-1">
        <p className="p2 er-eyebrow er-eyebrow--green" style={{ marginBottom: 6 }}>
          You obtained a <strong>Fuse</strong>! (Serial: 74A1)
        </p>
        <p className="p2 mt-2 er-text">
          Check your inventory to view details about this item and how it might be used in upcoming puzzles.
        </p>
      </div>
    </div>
  </div>
);

export default Puzzle1CompleteCard;
