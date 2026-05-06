interface InfoCardProps {
  title: string;
  message: string;
}

export const InfoCard = ({ title, message }: InfoCardProps) => (
  <div className="card w-full">
    <div className="card-details">
      <h3 className="card-title">{title}</h3>
      <p className="card-description p2">{message}</p>
    </div>
  </div>
);

export default InfoCard;
