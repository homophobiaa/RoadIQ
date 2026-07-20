import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ROUTES } from "../store";
import { PageFade, SpikeMark } from "../components/ui";
import { TopNav } from "../components/TopNav";
import { StudyCategoryControl } from "../components/StudyCategoryControl";
import { RoadSignNumber } from "../components/speed-limits/shared";
import { VehicleIllustration } from "../components/categories/VehicleIllustration";

export default function CheatSheetsPage() {
  return (
    <PageFade>
      <div className="mx-auto max-w-[1000px] px-6 py-10">
        <TopNav />

        <section className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <span className="caption-up mb-3 inline-flex items-center gap-2">
              <SpikeMark className="h-3.5 w-3.5" /> Справочник
            </span>
            <h1 className="font-display text-display-lg font-semibold text-ink">Справочник</h1>
            <p className="mt-4 text-title-md text-body">
              Интерактивни помагала за теорията. Избери тема, за да я разгледаш.
            </p>
          </div>
          <StudyCategoryControl />
        </section>

        <div className="grid gap-5 sm:grid-cols-2">
          <HubCard
            to={ROUTES.speedLimits}
            title="Ограничения на скоростта"
            desc="Интерактивна таблица с максимално допустимите скорости."
            preview={
              <div className="flex items-center gap-3">
                <RoadSignNumber value={50} size={54} />
                <RoadSignNumber value={90} size={54} />
                <RoadSignNumber value={140} size={54} />
              </div>
            }
          />
          <HubCard
            to={ROUTES.categories}
            title="Категории превозни средства"
            desc="Какви превозни средства можеш да управляваш с всяка категория."
            preview={
              <div className="w-full text-ink/80">
                <VehicleIllustration type="carTrailer" className="h-16 w-full" />
              </div>
            }
          />
        </div>
      </div>
    </PageFade>
  );
}

function HubCard({
  to,
  title,
  desc,
  preview,
}: {
  to: string;
  title: string;
  desc: string;
  preview: ReactNode;
}) {
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}>
      <Link
        to={to}
        className="group flex h-full flex-col rounded-lg border border-hairline bg-surface-card p-6 transition-shadow hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <div className="mb-5 grid min-h-[92px] place-items-center rounded-md bg-canvas p-4">
          {preview}
        </div>
        <h2 className="font-display text-title-lg font-semibold text-ink">{title}</h2>
        <p className="mt-1 flex-1 text-body">{desc}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary-active">
          Отвори
          <span className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </Link>
    </motion.div>
  );
}
