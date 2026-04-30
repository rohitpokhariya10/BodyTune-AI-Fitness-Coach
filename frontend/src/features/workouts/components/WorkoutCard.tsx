import { Activity, ArrowRight, Clock, Gauge } from "lucide-react";

import type { WorkoutOption } from "@/shared/types";
import { GlassCard } from "@/shared/ui/GlassCard";
import { PremiumButton } from "@/shared/ui/PremiumButton";

type WorkoutCardProps = {
  workout: WorkoutOption;
};

const accentStyles = {
  aqua: "from-aqua-400/22 via-transparent to-aqua-400/5 text-aqua-400",
  volt: "from-volt-400/22 via-transparent to-volt-400/5 text-volt-400",
  ember: "from-primary/16 via-transparent to-primary/5 text-primary",
};

export function WorkoutCard({ workout }: WorkoutCardProps) {
  return (
    <GlassCard interactive className="h-full overflow-hidden">
      <div className={`bg-gradient-to-br ${accentStyles[workout.accent]} p-6`}>
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-white/58">
              Live camera coach
            </p>
            <h3 className="mt-3 text-3xl font-semibold text-white">
              {workout.title}
            </h3>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/[0.08]">
            <Activity aria-hidden="true" className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-5 text-sm leading-6 text-white/62">
          {workout.description}
        </p>
      </div>

      <div className="space-y-5 p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <Gauge aria-hidden="true" className="h-4 w-4 text-white/58" />
            <span className="text-sm text-white/68">{workout.difficulty}</span>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3">
            <Clock aria-hidden="true" className="h-4 w-4 text-white/58" />
            <span className="text-sm text-white/68">{workout.duration}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {workout.focusAreas.map((area) => (
            <span
              className="rounded-md border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-medium text-white/62"
              key={area}
            >
              {area}
            </span>
          ))}
        </div>
        <PremiumButton className="w-full" icon={ArrowRight} to="/workouts/live">
          Start Live Coaching
        </PremiumButton>
      </div>
    </GlassCard>
  );
}
