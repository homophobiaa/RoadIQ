import { motion, useReducedMotion } from "framer-motion";

export function SpeedLimitsHero() {
  const reduce = useReducedMotion();
  return (
    <div className="card-dark relative overflow-hidden">
      {/* Animated road with moving centre dashes */}
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
        <svg className="absolute inset-x-0 bottom-0 h-40 w-full" viewBox="0 0 400 160" preserveAspectRatio="none">
          <defs>
            <linearGradient id="roadFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1f1e1b" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.5" />
            </linearGradient>
          </defs>
          <path d="M150 160 L185 40 L215 40 L250 160 Z" fill="url(#roadFade)" />
          <motion.line
            x1="200"
            y1="40"
            x2="200"
            y2="160"
            stroke="#e8a55a"
            strokeWidth="3"
            strokeDasharray="10 14"
            animate={reduce ? undefined : { strokeDashoffset: [0, -48] }}
            transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
          />
        </svg>
        {/* speedometer arc top-right */}
        <svg className="absolute -right-10 -top-16 h-64 w-64 opacity-30" viewBox="0 0 200 200" aria-hidden>
          <circle cx="100" cy="100" r="80" fill="none" stroke="#cc785c" strokeWidth="2" strokeDasharray="4 8" />
          <circle cx="100" cy="100" r="60" fill="none" stroke="#cc785c" strokeWidth="1.5" />
        </svg>
      </div>

      <div className="relative">
        <span className="badge mb-4 bg-primary/20 text-[#e8a079]">Данни от учебната таблица</span>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-display text-display-md font-semibold text-on-dark sm:text-display-lg"
        >
          Ограничения на скоростта
        </motion.h1>
        <p className="mt-3 max-w-xl text-title-md text-on-dark-soft">
          Избери категория и тип път, за да видиш максимално допустимата скорост.
        </p>
      </div>
    </div>
  );
}
