interface RefRowProps {
  left: string;
  center: string;
  right: string;
}

export const RefRow = ({ left, center, right }: RefRowProps) => (
  <div className="er-ref-row">
    <span className="p2 er-ref-row__label">{left}</span>
    <span className="p2 er-ref-row__center">{center}</span>
    <span className="p2 er-ref-row__value">{right}</span>
  </div>
);

export default RefRow;
