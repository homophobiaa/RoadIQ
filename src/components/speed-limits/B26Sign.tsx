// Locally-drawn В26 road sign (white face, red border, black speed number).
// The number is an EXAMPLE visualization, not an extra speed-limit rule.

export function B26Sign({ size = 140, sample = 50 }: { size?: number; sample?: number }) {
  const ring = size * 0.1;
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="grid place-items-center rounded-full bg-white"
        style={{
          width: size,
          height: size,
          border: `${ring}px solid #c1121f`,
          boxShadow: "0 8px 24px rgba(193,18,31,0.22), inset 0 2px 6px rgba(0,0,0,0.12)",
        }}
        role="img"
        aria-label={`Пътен знак В26 с примерна стойност ${sample}`}
      >
        <span
          className="font-sans font-bold leading-none text-ink"
          style={{ fontSize: size * 0.42, letterSpacing: "-0.03em" }}
        >
          {sample}
        </span>
      </div>
      <span className="badge bg-ink text-on-dark">В26</span>
      <span className="text-xs text-muted-soft">примерна стойност</span>
    </div>
  );
}
