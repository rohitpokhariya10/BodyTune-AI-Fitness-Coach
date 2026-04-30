import type { FeatureItem } from "@/shared/types";
import { GlassCard } from "./GlassCard";

type FeatureCardProps = {
  feature: FeatureItem;
};

export function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = feature.icon;

  return (
    <GlassCard interactive className="h-full p-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <h3 className="mt-6 text-lg font-semibold text-foreground">{feature.title}</h3>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {feature.description}
      </p>
    </GlassCard>
  );
}
