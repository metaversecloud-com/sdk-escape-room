import { content } from "@/constants";
import { StatusPill } from "./StatusPill";

export const RoomIntroCard = ({ children, roomId }: { children?: React.ReactNode; roomId: number }) => {
  const room = content.rooms[roomId as keyof typeof content.rooms];
  // Pills are optional per room (currently only room 2 has them). Auto-render
  // so any caller — start screen, screen=roomN, teleport success — gets the
  // same intro UI without re-wiring pill mapping.
  const pills = room && "pills" in room ? room.pills : undefined;
  return (
    <div className="card w-full er-card er-card--running">
      <div aria-hidden className="er-card__glow er-card__glow--violet" />
      <div className="flex flex-col gap-4 er-card">
        <h3 className="card-title er-title-gold">
          Room {roomId}: {room?.title}
        </h3>
        <p className="p2 er-text">{room?.description}</p>
        {pills && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {pills.map((pill) => (
              <StatusPill key={pill.label} label={pill.label} detail={pill.detail} color={pill.color} />
            ))}
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default RoomIntroCard;
