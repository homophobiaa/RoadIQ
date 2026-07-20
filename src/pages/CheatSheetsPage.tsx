import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useStore, type View } from "../store";
import { Logo, PageFade, SpikeMark } from "../components/ui";
import { RoadTypeIcon } from "../components/speed-limits/shared";

interface Sheet {
  title: string;
  subtitle: string;
  view?: View;
  soon?: boolean;
  icon: ReactNode;
}

export default function CheatSheetsPage() {
  const { setView } = useStore();

  const sheets: Sheet[] = [
    {
      title: "Ограничения на скоростта",
      subtitle: "Интерактивна таблица по категории",
      view: "speedLimits",
      icon: <RoadTypeIcon type="motorway" size={30} />,
    },
    {
      title: "Още справочници",
      subtitle: "Очаквай скоро",
      soon: true,
      icon: <SpikeMark className="h-7 w-7" color="currentColor" />,
    },
  ];

  return (
    <PageFade>
      <div className="mx-auto max-w-[1000px] px-6 py-10">
        <header className="mb-12 flex items-center justify-between">
          <Logo />
          <button className="btn-secondary" onClick={() => setView("dashboard")}>
            ← Табло
          </button>
        </header>

        <section className="mb-10 max-w-2xl">
          <span className="caption-up mb-3 inline-flex items-center gap-2">
            <SpikeMark className="h-3.5 w-3.5" /> Справочник
          </span>
          <h1 className="font-display text-display-lg font-semibold text-ink">Справочник</h1>
          <p className="mt-4 text-title-md text-body">
            Бързи, интерактивни помагала за теорията. Избери тема, за да я разгледаш.
          </p>
        </section>

        <div className="grid gap-5 sm:grid-cols-2">
          {sheets.map((s, i) => (
            <motion.button
              key={s.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={s.soon ? undefined : { y: -4 }}
              disabled={s.soon}
              onClick={() => s.view && setView(s.view)}
              className={[
                "group relative flex items-start gap-4 rounded-lg border p-6 text-left transition-shadow",
                s.soon
                  ? "cursor-default border-dashed border-hairline bg-canvas opacity-70"
                  : "border-hairline bg-surface-card hover:shadow-soft",
              ].join(" ")}
            >
              <span
                className={[
                  "grid h-14 w-14 shrink-0 place-items-center rounded-md transition-colors",
                  s.soon ? "bg-surface-strong text-muted" : "bg-primary text-on-primary",
                ].join(" ")}
              >
                {s.icon}
              </span>
              <div>
                <h2 className="font-display text-title-lg font-semibold text-ink">{s.title}</h2>
                <p className="mt-1 text-body">{s.subtitle}</p>
                {!s.soon && (
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary-active">
                    Отвори
                    <span className="transition-transform group-hover:translate-x-0.5">→</span>
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </PageFade>
  );
}
