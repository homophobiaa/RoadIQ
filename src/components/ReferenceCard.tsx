// Prominent landing entry for the learning reference — one of the two main
// actions next to "start a test". Coral-forward, animated hover.

import { motion } from "framer-motion";
import { RoadSignNumber } from "./speed-limits/shared";

export function ReferenceCard({ onOpen }: { onOpen: () => void }) {
  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="group relative flex h-full flex-col justify-between overflow-hidden rounded-lg bg-surface-dark p-8 text-left text-on-dark"
    >
      {/* decorative signs */}
      <div className="pointer-events-none absolute -right-6 -top-6 opacity-90">
        <div className="rotate-6 transition-transform duration-300 group-hover:rotate-0">
          <RoadSignNumber value={90} size={92} />
        </div>
      </div>

      <div className="relative">
        <span className="badge mb-4 bg-primary/20 text-[#e8a079]">Справочник</span>
        <h2 className="max-w-[14ch] font-display text-display-sm font-semibold text-on-dark">
          Скорости, категории и важни правила
        </h2>
        <p className="mt-3 max-w-xs text-sm text-on-dark-soft">
          Интерактивна теория на едно място — научи спокойно, извън тестовете.
        </p>
      </div>

      <span className="relative mt-8 inline-flex w-fit items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-on-primary shadow-coral">
        Отвори справочника
        <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </motion.button>
  );
}
