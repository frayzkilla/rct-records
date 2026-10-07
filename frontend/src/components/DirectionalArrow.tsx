export default function DirectionalArrow({ down = false }: { down?: boolean }) {
  return (
    <span className="directional-arrow" aria-hidden="true">
      <span>{down ? "\u2199" : "\u2197"}</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square">
        {down ? <path d="M19 5 5 19M5 5v14h14" /> : <path d="M5 19 19 5M5 5h14v14" />}
      </svg>
    </span>
  );
}
