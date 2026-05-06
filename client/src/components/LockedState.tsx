interface LockedStateProps {
  title: string;
  message: string;
}

export const LockedState = ({ title, message }: LockedStateProps) => (
  <div className="card w-full er-locked">
    <div className="card-details">
      <h4 className="h4 er-locked__title">{title}</h4>
      <p className="p2 er-locked__message">{message}</p>
    </div>
  </div>
);

export default LockedState;
