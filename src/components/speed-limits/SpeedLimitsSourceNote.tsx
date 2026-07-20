import { motion } from "framer-motion";
import { SOURCE_NOTE, B26_MEANING } from "../../data/speedLimits";
import { B26Sign } from "./B26Sign";

export function SpeedLimitsSourceNote() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
      className="card-outline flex flex-col items-center gap-8 border-primary/30 bg-primary/[0.05] sm:flex-row sm:items-center"
    >
      <motion.div whileHover={{ rotate: -3, scale: 1.03 }} transition={{ type: "spring", stiffness: 300, damping: 18 }}>
        <B26Sign size={140} sample={50} />
      </motion.div>
      <div className="flex-1">
        <h3 className="mb-2 font-display text-title-lg font-semibold text-ink">
          Пътен знак В26
        </h3>
        <p className="mb-3 text-sm font-medium text-primary-active">{B26_MEANING}</p>
        <p className="text-body leading-relaxed">{SOURCE_NOTE}</p>
      </div>
    </motion.div>
  );
}
