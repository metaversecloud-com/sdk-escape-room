import { content } from "@/constants";
import { StatusPill } from "./StatusPill";
import commanderVegaImg from "@/assets/CommanderVega.png";

export const RoomIntroCard = ({ children, roomId }: { children?: React.ReactNode; roomId: number }) => {
  const room = content.rooms[roomId as keyof typeof content.rooms];
  // The pill list is identical across rooms — read it from the shared
  // `content.roomIntroPills` so a copy edit only has to happen in one place.
  const pills = content.roomIntroPills;
  return (
    <div className="card w-full er-card er-card--running">
      <div aria-hidden className="er-card__glow er-card__glow--violet" />
      <div className="flex flex-col gap-4 er-card">
        <h3 className="card-title er-title-gold">
          Room {roomId}: {room?.title}
        </h3>
        <div className="flex items-start gap-3">
          <img
            src={commanderVegaImg}
            alt="Commander Vega"
            className="flex-shrink-0 rounded-lg"
            style={{ width: 96, height: 96, objectFit: "cover" }}
          />
          <p className="p2 er-text">{room?.description}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {pills.map((pill) => (
            <StatusPill key={pill.label} label={pill.label} detail={pill.detail} color={pill.color} />
          ))}
        </div>
        {children}
      </div>
    </div>
  );
};

export default RoomIntroCard;
