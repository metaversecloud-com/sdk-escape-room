import { StatusPill } from "./StatusPill";

export const RoomBIntroCard = () => (
  <div className="card w-full er-card er-card--violet">
    <div aria-hidden className="er-card__glow" />
    <div className="card-details flex flex-col gap-4 er-card__details-relative">
      <h3 className="card-title er-title-gold">Room 2: Comms Deck</h3>
      <p className="p2 er-text">
        “Crew, welcome to the Comms Deck. Align the satellites, rebuild the transmission, and decode the valve order to
        stabilize the signal.”
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatusPill label="Satellite Alignment" detail="Count the stars" color="#1be0f2" />
        <StatusPill label="Retrieve the Transmission" detail="Assemble the message" color="#f6b300" />
        <StatusPill
          label="Decode the Transmission"
          detail="Figure out what the message is and determine the correct valve order"
          color="#9b7bff"
        />
      </div>
    </div>
  </div>
);

export default RoomBIntroCard;
