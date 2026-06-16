import { content } from "@/constants";

export const RoomIntroCard = ({ children, roomId }: { children?: React.ReactNode; roomId: number }) => {
  const room = content.rooms[roomId as keyof typeof content.rooms];
  return (
    <div className="card w-full er-card er-card--running">
      <div aria-hidden className="er-card__glow er-card__glow--violet" />
      <div className="flex flex-col gap-4 er-card">
        <h3 className="card-title er-title-gold">
          Room {roomId}: {room?.title}
        </h3>
        <p className="p2 er-text">{room?.description}</p>
        {children}
      </div>
    </div>
  );
};

export default RoomIntroCard;
