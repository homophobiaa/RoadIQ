import { SOURCE_NOTE } from "../../data/speedLimits";

export function SpeedLimitsSourceNote() {
  return (
    <div className="card-outline flex gap-4 border-primary/30 bg-primary/[0.05]">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/15 font-display text-title-md font-semibold text-primary-active">
        i
      </span>
      <p className="text-body leading-relaxed">{SOURCE_NOTE}</p>
    </div>
  );
}
