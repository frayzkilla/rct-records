export default function PageHeading({
  kicker,
  title,
  description,
  count,
}: {
  kicker: string;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="page-heading">
      <div className="eyebrow">
        <span className="status-dot" />
        {kicker}
        <span>RAW CROWNZ / CATALOG</span>
      </div>
      <div className="heading-line">
        <h1>{title}</h1>
        {count !== undefined && (
          <span className="count-stamp">{String(count).padStart(2, "0")}</span>
        )}
      </div>
      <p>{description}</p>
    </div>
  );
}
