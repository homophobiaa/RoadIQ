// Local SVG line-art for each vehicle type. No external image URLs.
// Base silhouettes + optional trailer, composed from an IllustrationType.

import { motion } from "framer-motion";
import type { IllustrationType } from "../../data/drivingCategories";

const CORAL = "#cc785c";

function Wheel({ cx, cy, r = 7 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeWidth="2.5" />
      <circle cx={cx} cy={cy} r={r * 0.35} fill={CORAL} />
    </>
  );
}

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Base({ type }: { type: string }) {
  switch (type) {
    case "moped":
      return (
        <g>
          <Wheel cx={22} cy={52} r={9} />
          <Wheel cx={78} cy={52} r={9} />
          <path d="M22 52l14-16h18l10 16" {...stroke} />
          <path d="M36 36l-6-10h8" {...stroke} />
          <path d="M54 36l14-2" {...stroke} />
          <rect x="40" y="30" width="18" height="7" rx="3" {...stroke} />
        </g>
      );
    case "motorcycle":
      return (
        <g>
          <Wheel cx={20} cy={52} r={11} />
          <Wheel cx={82} cy={52} r={11} />
          <path d="M20 52l16-14h22l12 14" {...stroke} />
          <path d="M58 38l16-6" {...stroke} />
          <path d="M30 40h26l6-6" {...stroke} />
          <rect x="42" y="30" width="20" height="6" rx="3" {...stroke} />
        </g>
      );
    case "motorTricycle":
      return (
        <g>
          <Wheel cx={20} cy={52} r={10} />
          <Wheel cx={72} cy={52} r={10} />
          <Wheel cx={92} cy={52} r={10} />
          <path d="M20 52l16-16h24l14 16" {...stroke} />
          <rect x="42" y="30" width="20" height="6" rx="3" {...stroke} />
        </g>
      );
    case "quadricycle":
      return (
        <g>
          <Wheel cx={26} cy={54} />
          <Wheel cx={82} cy={54} />
          <path d="M14 54v-12l12-12h44l10 12v12" {...stroke} />
          <path d="M32 30l8-8h22l4 8" {...stroke} />
          <path d="M14 42h80" {...stroke} />
        </g>
      );
    case "car":
      return (
        <g>
          <Wheel cx={28} cy={54} />
          <Wheel cx={80} cy={54} />
          <path d="M10 54v-10l14-2 8-14h34l14 16v10" {...stroke} />
          <path d="M34 26l6 12h30" {...stroke} />
        </g>
      );
    case "truckMedium":
      return (
        <g>
          <Wheel cx={26} cy={56} />
          <Wheel cx={86} cy={56} />
          <path d="M8 56V32h30v24" {...stroke} />
          <path d="M38 56V24h56v32" {...stroke} />
          <path d="M8 40h30" {...stroke} />
        </g>
      );
    case "truckHeavy":
      return (
        <g>
          <Wheel cx={24} cy={56} />
          <Wheel cx={70} cy={56} />
          <Wheel cx={86} cy={56} />
          <path d="M8 56V30h26v26" {...stroke} />
          <path d="M34 56V20h62v36" {...stroke} />
          <path d="M8 40h26" {...stroke} />
        </g>
      );
    case "bus":
      return (
        <g>
          <Wheel cx={26} cy={56} />
          <Wheel cx={82} cy={56} />
          <path d="M8 56V26a6 6 0 016-6h80a6 6 0 016 6v30" {...stroke} />
          <path d="M20 30h64M20 40h64" {...stroke} />
        </g>
      );
    case "minibus":
      return (
        <g>
          <Wheel cx={28} cy={56} />
          <Wheel cx={78} cy={56} />
          <path d="M10 56V30a6 6 0 016-6h64a6 6 0 016 6v26" {...stroke} />
          <path d="M22 32h52" {...stroke} />
        </g>
      );
    default:
      return null;
  }
}

function Trailer() {
  return (
    <g>
      <path d="M110 50h44v-16h-44z" {...stroke} />
      <path d="M104 46h6" {...stroke} />
      <Wheel cx={132} cy={54} r={6} />
    </g>
  );
}

const BASE_OF: Record<IllustrationType, string> = {
  moped: "moped",
  motorcycle: "motorcycle",
  motorTricycle: "motorTricycle",
  quadricycle: "quadricycle",
  car: "car",
  carTrailer: "car",
  truckMedium: "truckMedium",
  truckMediumTrailer: "truckMedium",
  truckHeavy: "truckHeavy",
  truckHeavyTrailer: "truckHeavy",
  bus: "bus",
  busTrailer: "bus",
  minibus: "minibus",
  minibusTrailer: "minibus",
};

const HAS_TRAILER: IllustrationType[] = [
  "carTrailer",
  "truckMediumTrailer",
  "truckHeavyTrailer",
  "busTrailer",
  "minibusTrailer",
];

export function VehicleIllustration({
  type,
  className,
}: {
  type: IllustrationType;
  className?: string;
}) {
  const trailer = HAS_TRAILER.includes(type);
  return (
    <svg viewBox="0 0 165 70" className={className} role="img" aria-label={`Илюстрация: ${type}`}>
      <motion.g
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Base type={BASE_OF[type]} />
      </motion.g>
      {trailer && (
        <motion.g
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.08 }}
        >
          <Trailer />
        </motion.g>
      )}
    </svg>
  );
}
