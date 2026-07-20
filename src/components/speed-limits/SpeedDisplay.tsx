import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { SpeedLimitCategory, RoadType, SpeedLimitValue } from "../../data/speedLimits";
import { roadTypeLabel } from "../../data/speedLimits";

/** Smoothly counts from the previous number to the next one. */
function AnimatedNumber({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    const dur = 450;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return <>{display}</>;
}

export function SpeedDisplay({
  category,
  roadType,
}: {
  category: SpeedLimitCategory;
  roadType: RoadType;
}) {
  const v = category.limits[roadType];
  const key = `${category.id}-${roadType}-${v.type}`;

  return (
    <div className="card-dark relative overflow-hidden">
      {/* ambient speedometer arc */}
      <SpeedometerArc />
      <div className="relative flex flex-col items-center gap-1 text-center">
        <span className="caption-up text-on-dark-soft">{category.label}</span>
        <span className="text-sm text-on-dark-soft">{roadTypeLabel(roadType)}</span>

        <div className="mt-5 grid min-h-[220px] place-items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={key}
              initial={{ opacity: 0, scale: 0.82, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -8 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <BigValue v={v} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function BigValue({ v }: { v: SpeedLimitValue }) {
  if (v.type === "speed") {
    return (
      <div className="flex flex-col items-center">
        <div
          className="relative grid place-items-center rounded-full bg-white"
          style={{
            width: 180,
            height: 180,
            border: "20px solid #c1121f",
            boxShadow: "0 0 60px rgba(193,18,31,0.35), inset 0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          <span
            className="font-sans font-bold leading-none text-ink"
            style={{ fontSize: 78, letterSpacing: "-0.03em" }}
          >
            <AnimatedNumber value={v.value} />
          </span>
        </div>
        <span className="mt-4 font-mono text-title-md text-on-dark">km/h</span>
        {v.note && (
          <span className="mt-1 badge bg-accent-amber/20 text-accent-amber">{v.note}</span>
        )}
      </div>
    );
  }
  if (v.type === "prohibited") {
    return (
      <div className="flex flex-col items-center">
        <div
          className="grid place-items-center rounded-full"
          style={{
            width: 180,
            height: 180,
            background: "#c1121f",
            boxShadow: "0 0 60px rgba(193,18,31,0.4)",
          }}
          aria-hidden
        >
          <span className="rounded-full bg-white" style={{ width: 108, height: 24 }} />
        </div>
        <span className="mt-4 font-display text-title-lg font-semibold text-on-dark">
          Забранено движението
        </span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center">
      <div
        className="grid place-items-center rounded-full border-4 border-dashed border-on-dark-soft/50"
        style={{ width: 180, height: 180 }}
        aria-hidden
      >
        <span className="font-display leading-none text-on-dark-soft" style={{ fontSize: 90 }}>
          —
        </span>
      </div>
      <span className="mt-4 max-w-[220px] text-center text-sm text-on-dark-soft">
        Не е посочена стойност в таблицата
      </span>
    </div>
  );
}

/** Decorative speedometer tick arc behind the value. */
function SpeedometerArc() {
  const ticks = Array.from({ length: 21 });
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-[130px] -translate-x-1/2 opacity-[0.18]"
      width="420"
      height="240"
      viewBox="0 0 420 240"
      aria-hidden
    >
      <path d="M40 220a170 170 0 01340 0" fill="none" stroke="#cc785c" strokeWidth="2" />
      {ticks.map((_, i) => {
        const a = Math.PI + (i / 20) * Math.PI;
        const x1 = 210 + Math.cos(a) * 170;
        const y1 = 220 + Math.sin(a) * 170;
        const x2 = 210 + Math.cos(a) * (i % 5 === 0 ? 150 : 160);
        const y2 = 220 + Math.sin(a) * (i % 5 === 0 ? 150 : 160);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#cc785c"
            strokeWidth={i % 5 === 0 ? 3 : 1.5}
          />
        );
      })}
    </svg>
  );
}
