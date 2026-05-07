export const SessionRunningCard = () => (
  <div className="card w-full er-card er-card--running">
    <div aria-hidden className="er-card__glow er-card__glow--violet" />
    <div className="flex flex-col gap-4 er-card">
      <h3 className="card-title er-title-gold">Power Bay Orders</h3>
      <p className="p2 er-text">
        “Crew, this is Commander Vega. You’re live inside the Power Bay. Start interacting with station assets to
        reroute power and get this room online.”
      </p>
    </div>
  </div>
);

export default SessionRunningCard;
