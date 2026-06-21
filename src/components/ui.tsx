// Small shared presentational pieces used across pages.

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ParseConfidence } from "../types";
import { cx } from "../lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cx("flex items-center gap-2.5", className)}>
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-coral shadow-glow">
        {/* simple road glyph */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M5 21 9 3h6l4 18" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M12 5v3M12 11v3M12 17v2" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </div>
      <div className="leading-none">
        <span className="font-display text-xl font-bold tracking-tight">RoadIQ</span>
      </div>
    </div>
  );
}

const CONF_STYLE: Record<ParseConfidence, string> = {
  high: "bg-success/15 text-success border-success/30",
  medium: "bg-amber/15 text-amber border-amber/30",
  low: "bg-danger/15 text-danger border-danger/30",
};
const CONF_LABEL: Record<ParseConfidence, string> = {
  high: "Висока",
  medium: "Средна",
  low: "Ниска",
};

export function ConfidenceBadge({ value }: { value: ParseConfidence }) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        CONF_STYLE[value],
      )}
    >
      {CONF_LABEL[value]} увереност
    </span>
  );
}

export function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: ReactNode;
  accent?: string;
}) {
  return (
    <div className="card flex flex-col gap-1">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={cx("font-display text-3xl font-bold", accent)}>{value}</span>
    </div>
  );
}

export function PageFade({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
