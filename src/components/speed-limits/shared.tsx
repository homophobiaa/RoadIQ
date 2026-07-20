// Shared visual primitives for the speed-limits cheat sheet: road-sign renders
// for each value type, and locally-drawn SVG icons for the four road types.
// All artwork is inline SVG/CSS — no external image URLs.

import type { SpeedLimitValue, RoadType } from "../../data/speedLimits";

/** Circular speed-limit sign: red ring, white field, black number. */
export function RoadSignNumber({ value, size = 64 }: { value: number; size?: number }) {
  const ring = Math.max(4, size * 0.11);
  return (
    <div
      className="relative grid place-items-center rounded-full bg-white"
      style={{
        width: size,
        height: size,
        border: `${ring}px solid #c1121f`,
        boxShadow: "0 2px 6px rgba(20,20,19,0.18), inset 0 1px 2px rgba(255,255,255,0.7)",
      }}
    >
      <span
        className="font-sans font-bold leading-none text-ink"
        style={{ fontSize: size * 0.42, letterSpacing: "-0.02em" }}
      >
        {value}
      </span>
    </div>
  );
}

/** No-entry style sign for "Забранено движението". */
export function ProhibitedSign({ size = 64 }: { size?: number }) {
  return (
    <div
      className="relative grid place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: "#c1121f",
        boxShadow: "0 2px 6px rgba(20,20,19,0.2)",
      }}
      aria-hidden
    >
      <span
        className="rounded-full bg-white"
        style={{ width: size * 0.6, height: size * 0.13 }}
      />
    </div>
  );
}

/** Neutral dash sign for "—" — deliberately NOT red (not a prohibition). */
export function DashSign({ size = 64 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-full border-2 border-dashed border-muted-soft bg-surface-soft"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <span className="font-display leading-none text-muted" style={{ fontSize: size * 0.5 }}>
        —
      </span>
    </div>
  );
}

/** Dispatches a value to the right sign. `size` controls the badge diameter. */
export function SpeedValueSign({ v, size = 64 }: { v: SpeedLimitValue; size?: number }) {
  if (v.type === "speed") return <RoadSignNumber value={v.value} size={size} />;
  if (v.type === "prohibited") return <ProhibitedSign size={size} />;
  return <DashSign size={size} />;
}

// --- Road-type icons (stroke uses currentColor so active state can tint) ---

const svgProps = (size: number) => ({
  width: size,
  height: size,
  viewBox: "0 0 48 48",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export function RoadTypeIcon({ type, size = 40 }: { type: RoadType; size?: number }) {
  switch (type) {
    case "urban":
      return (
        <svg {...svgProps(size)} aria-hidden>
          {/* locality sign + buildings */}
          <rect x="6" y="14" width="12" height="20" rx="1" />
          <rect x="20" y="9" width="12" height="25" rx="1" />
          <rect x="34" y="18" width="8" height="16" rx="1" />
          <path d="M9 20h3M9 25h3M24 15h4M24 21h4M24 27h4" />
          <path d="M4 38h40" />
        </svg>
      );
    case "outsideUrban":
      return (
        <svg {...svgProps(size)} aria-hidden>
          {/* road narrowing to horizon out of town */}
          <path d="M6 40l12-30M42 40L30 10" />
          <path d="M24 12v3M24 22v3M24 32v3" />
          <path d="M20 10h8" />
          <circle cx="38" cy="14" r="3" />
        </svg>
      );
    case "motorway":
      return (
        <svg {...svgProps(size)} aria-hidden>
          {/* motorway shield-ish + divided lanes */}
          <path d="M8 40l8-30h16l8 30" />
          <path d="M24 12v4M24 22v4M24 32v4" />
          <path d="M14 40l4-14M34 40l-4-14" />
        </svg>
      );
    case "expressway":
      return (
        <svg {...svgProps(size)} aria-hidden>
          {/* fast car + speed lines */}
          <path d="M10 30h22l4-6h4a2 2 0 012 2v4h-4" />
          <circle cx="16" cy="34" r="3" />
          <circle cx="32" cy="34" r="3" />
          <path d="M4 20h12M6 25h9M4 15h8" />
        </svg>
      );
  }
}
