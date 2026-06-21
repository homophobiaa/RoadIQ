// Shared presentational pieces, styled to .claude/DESIGN.md (cream + coral).

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ParseConfidence, QuestionStatus } from "../types";
import { STATUS_LABEL } from "../lib/corrections";
import { cx } from "../lib/utils";

/** Anthropic-style 4-spoke radial spike mark used as the brand glyph. */
export function SpikeMark({ className, color = "#cc785c" }: { className?: string; color?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({ className, onDark = false }: { className?: string; onDark?: boolean }) {
  return (
    <div className={cx("flex items-center gap-2.5", className)}>
      <SpikeMark className="h-6 w-6" color={onDark ? "#faf9f5" : "#cc785c"} />
      <span
        className={cx(
          "font-display text-title-lg font-semibold tracking-tight",
          onDark ? "text-on-dark" : "text-ink",
        )}
      >
        RoadIQ
      </span>
    </div>
  );
}

const CONF_STYLE: Record<ParseConfidence, string> = {
  high: "bg-success/15 text-[#3f8a4f]",
  medium: "bg-accent-amber/20 text-[#a06a13]",
  low: "bg-error/15 text-error",
};
const CONF_LABEL: Record<ParseConfidence, string> = {
  high: "Висока",
  medium: "Средна",
  low: "Ниска",
};

export function ConfidenceBadge({ value }: { value: ParseConfidence }) {
  return <span className={cx("badge", CONF_STYLE[value])}>{CONF_LABEL[value]} увереност</span>;
}

const STATUS_STYLE: Record<QuestionStatus, string> = {
  verified: "bg-success/15 text-[#3f8a4f]",
  corrected: "bg-primary/15 text-primary-active",
  excluded: "bg-ink/10 text-muted",
  parsed: "bg-surface-strong text-muted",
};

export function StatusBadge({ status }: { status: QuestionStatus }) {
  return <span className={cx("badge", STATUS_STYLE[status])}>{STATUS_LABEL[status]}</span>;
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
    <div className="card-outline flex flex-col gap-1 p-6">
      <span className="caption-up">{label}</span>
      <span className={cx("font-display text-display-sm font-semibold text-ink", accent)}>
        {value}
      </span>
    </div>
  );
}

export function PageFade({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
