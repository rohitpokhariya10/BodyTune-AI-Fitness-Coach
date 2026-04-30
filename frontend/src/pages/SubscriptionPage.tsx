import {
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  LockOpen,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { pageReveal, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { GlassCard } from "@/shared/ui/GlassCard";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { subscriptionService } from "@/features/subscription/services/subscriptionService";
import type { SubscriptionPlan, UserSubscription } from "@/features/subscription/types";

function formatPrice(plan: SubscriptionPlan) {
  if (plan.price === 0) {
    return "Free";
  }

  return `Rs ${plan.price}`;
}

function formatExpiry(subscription: UserSubscription | null) {
  if (!subscription?.expires_at) {
    return "No expiry for free access";
  }

  return `Expires ${new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(subscription.expires_at))}`;
}

export default function SubscriptionPage() {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => pageReveal(scope), []);
  const auth = useAuth();
  const userId = auth.user?.id;
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingPlanId, setPendingPlanId] = useState<number | null>(null);

  const loadSubscriptionData = useCallback(async () => {
      if (!userId) {
        setError("Sign in again to load your subscription.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
      const { plans: nextPlans, subscription: nextSubscription } =
        await subscriptionService.getSubscriptionData();
      setPlans(nextPlans);
      setSubscription(nextSubscription);
    } catch {
      setError("Unable to load subscription plans. Start the backend and retry.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadSubscriptionData();
  }, [loadSubscriptionData]);

  const currentPlanId = subscription?.plan_id ?? subscription?.plan.id ?? null;
  const premiumUnlocked = subscription?.unlocks_premium ?? false;
  const activePlanName = subscription?.plan.name ?? "Free";

  const recommendedPlanId = useMemo(
    () => {
      const premiumPlans = plans.filter((plan) => plan.is_active && plan.price > 0);
      return premiumPlans[premiumPlans.length - 1]?.id ?? null;
    },
    [plans],
  );

  async function handleSubscribe(planId: number) {
    if (!userId) {
      setError("Sign in again to activate a plan.");
      return;
    }

    setPendingPlanId(planId);
    setError(null);
    try {
      await subscriptionService.mockPurchase(userId, planId);
      await loadSubscriptionData();
    } catch {
      setError("Plan activation failed. Check the backend logs and retry.");
    } finally {
      setPendingPlanId(null);
    }
  }

  return (
    <div className="app-page" ref={scopeRef}>
      <PageHeader
        action={
          <PremiumButton icon={RefreshCw} onClick={() => void loadSubscriptionData()}>
            Refresh
          </PremiumButton>
        }
        description="Choose the access level that fits your training and unlock premium video content."
        eyebrow="Plan access"
        title="Subscription access"
      />

      <GlassCard className="orange-glow-card p-5 sm:p-6" data-gsap="fade-up">
        <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                Current plan
              </p>
              <h2 className="mt-1 font-display text-xl font-bold text-white">
                {activePlanName}
              </h2>
              <p className="mt-1 text-sm text-white/52">
                {formatExpiry(subscription)}
              </p>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-carbon-950/35 px-4 py-3 text-sm font-semibold">
            {premiumUnlocked ? "Premium videos unlocked" : "Premium videos locked"}
          </div>
        </div>
      </GlassCard>

      {error ? (
        <div className="rounded-2xl border border-ember-400/25 bg-ember-400/10 p-4 text-sm text-ember-400">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <GlassCard className="flex min-h-56 items-center justify-center p-8">
          <div className="flex items-center gap-3 text-sm font-semibold text-white/62">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            Loading plans
          </div>
        </GlassCard>
      ) : (
        <section className="grid gap-4 lg:grid-cols-3">
          {plans.length === 0 ? (
            <div className="lg:col-span-3">
              <EmptyState
                description="Plans created by admins will appear here."
                title="No subscription plans yet"
              />
            </div>
          ) : null}
          {plans.map((plan) => {
            const isCurrent = currentPlanId === plan.id;
            const isRecommended = recommendedPlanId === plan.id;
            const isPending = pendingPlanId === plan.id;

            return (
              <GlassCard
                className={`p-5 sm:p-6 ${
                  isCurrent || isPending
                    ? "selected-card"
                    : isRecommended
                      ? "orange-glow-card"
                      : "bento-card"
                }`}
                data-gsap="card"
                interactive={!isCurrent && plan.is_active}
                key={plan.id}
                variant={
                  isCurrent || isPending
                    ? "selected"
                    : plan.is_active
                      ? "interactive"
                      : "disabled"
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {isRecommended ? "Recommended" : "Plan"}
                    </p>
                    <h2 className="mt-2 font-display text-xl font-bold text-white">
                      {plan.name}
                    </h2>
                  </div>
                  {isCurrent ? (
                    <Badge variant="active">
                      <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                      Active
                    </Badge>
                  ) : isPending ? (
                    <Badge variant="selected">Selected</Badge>
                  ) : !plan.is_active ? (
                    <Badge variant="locked">Unavailable</Badge>
                  ) : null}
                </div>

                <div className="mt-5">
                  <span className="font-display text-4xl font-bold text-white">
                    {formatPrice(plan)}
                  </span>
                  {plan.price > 0 ? (
                    <span className="ml-2 text-sm text-white/45">/ month</span>
                  ) : null}
                </div>

                <p className="mt-3 text-sm text-white/52">
                  {plan.duration_days === 0
                    ? "Basic access for showcase users."
                    : `${plan.duration_days} days of premium access.`}
                </p>

                <ul className="mt-5 space-y-3 text-sm leading-5 text-white/64">
                  {plan.features.map((feature) => (
                    <li className="flex gap-2" key={`${plan.id}-${feature}`}>
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-volt-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <PremiumButton
                  className="mt-6 w-full"
                  disabled={isCurrent || isPending || !plan.is_active}
                  icon={isCurrent ? CheckCircle2 : plan.price > 0 ? CreditCard : LockOpen}
                  onClick={() =>
                    plan.id === null ? undefined : void handleSubscribe(plan.id)
                  }
                  variant={isCurrent || isPending ? "selected" : "primary"}
                >
                  {isPending
                    ? "Activating"
                    : isCurrent
                      ? "Active Plan"
                      : plan.price > 0
                        ? "Activate Plan"
                        : "Use Free"}
                </PremiumButton>
              </GlassCard>
            );
          })}
        </section>
      )}

      <GlassCard className="bento-card p-5" data-gsap="fade-up">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-white">Payment note</h2>
            <p className="mt-2 text-sm leading-6 text-white/56">
              The subscribe buttons activate plans immediately for your account.
              Payment gateway verification is intentionally out of scope for this
              phase.
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
