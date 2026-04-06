export const LockedState = ({ title, message }: { title: string; message: string }) => (
  <div className="card bg-neutral-100 p-4">
    <h4 className="h4 mb-1">{title}</h4>
    <p className="p3 text-muted">{message}</p>
  </div>
);

export default LockedState;
