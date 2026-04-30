import {
  Clock3,
  CheckCircle2,
  Dumbbell,
  Filter,
  LoaderCircle,
  Lock,
  Play,
  Search,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { pageReveal, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { GlassCard } from "@/shared/ui/GlassCard";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { resolveMediaUrl } from "@/shared/utils/media";
import { libraryService } from "@/features/library/services/libraryService";
import type {
  ExerciseDifficulty,
  UserExerciseVideo,
  UserSubscription,
} from "@/features/library/types";

const selectClassName =
  "focus-ring min-h-11 rounded-xl border border-white/10 bg-carbon-950/60 px-3 text-sm font-medium text-white shadow-inner-glass";

function formatPlan(subscription: UserSubscription | null) {
  if (!subscription || subscription.status !== "active") {
    return "Free access";
  }

  return subscription.unlocks_premium
    ? `${subscription.plan.name} active`
    : "Free access";
}

function VideoThumb({ video }: { video: UserExerciseVideo }) {
  const [hasImageError, setHasImageError] = useState(false);
  const thumbnailUrl = hasImageError ? "" : resolveMediaUrl(video.thumbnail_url);

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-carbon-950/70">
      {thumbnailUrl ? (
        <img
          alt={video.title}
          className="h-full w-full object-cover"
          onError={() => setHasImageError(true)}
          src={thumbnailUrl}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgb(var(--theme-primary-rgb)/0.07),rgba(255,255,255,0.035)_42%,rgba(255,255,255,0.02))] p-4">
          <div className="text-center">
            <Dumbbell
              aria-hidden="true"
              className="mx-auto h-9 w-9 text-white/38"
            />
            <p className="mt-3 line-clamp-2 text-sm font-semibold text-white/62">
              {video.title}
            </p>
          </div>
        </div>
      )}
      {video.locked ? (
        <div className="absolute inset-0 flex items-center justify-center bg-carbon-950/64 backdrop-blur-sm">
          <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-volt-400/25 bg-volt-400/12 px-3 text-xs font-semibold text-volt-400">
            <Lock aria-hidden="true" className="h-3.5 w-3.5" />
            Premium locked
          </span>
        </div>
      ) : !video.video_url ? (
        <div className="absolute inset-0 flex items-center justify-center bg-carbon-950/58 backdrop-blur-sm">
          <span className="inline-flex min-h-9 items-center rounded-full border border-ember-400/25 bg-ember-400/12 px-3 text-xs font-semibold text-ember-400">
            Video unavailable
          </span>
        </div>
      ) : null}
    </div>
  );
}

export default function VideoLibraryPage() {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => pageReveal(scope), []);
  const [videos, setVideos] = useState<UserExerciseVideo[]>([]);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty | "all">("all");
  const [selectedVideoId, setSelectedVideoId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { subscription: nextSubscription, videos: nextVideos } =
        await libraryService.getLibrary();
      setVideos(nextVideos);
      setSubscription(nextSubscription);
    } catch {
      setError("Unable to load exercise library. Start the backend and retry.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(videos.map((video) => video.category)))],
    [videos],
  );

  const filteredVideos = useMemo(() => {
    const query = search.trim().toLowerCase();
    return videos.filter((video) => {
      const matchesSearch =
        query.length === 0 ||
        video.title.toLowerCase().includes(query) ||
        video.description.toLowerCase().includes(query) ||
        video.target_muscles.join(" ").toLowerCase().includes(query);
      const matchesCategory = category === "all" || video.category === category;
      const matchesDifficulty =
        difficulty === "all" || video.difficulty === difficulty;

      return matchesSearch && matchesCategory && matchesDifficulty;
    });
  }, [category, difficulty, search, videos]);

  return (
    <div className="app-page" ref={scopeRef}>
      <PageHeader
        action={
          <PremiumButton icon={Sparkles} to="/subscription">
            Upgrade
          </PremiumButton>
        }
        description="Browse guided exercise videos with clear locked and unlocked states."
        eyebrow={formatPlan(subscription)}
        title="Exercise library"
      />

      <GlassCard className="bento-card p-4 sm:p-5" data-gsap="fade-up">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
          <label className="relative block">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/36"
            />
            <input
              className="min-h-11 w-full rounded-xl border border-white/10 bg-carbon-950/70 pl-10 pr-3 text-sm text-white placeholder:text-white/32 focus:border-primary focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search videos, muscles, goals"
              value={search}
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-border bg-white/[0.045] px-3">
            <Filter aria-hidden="true" className="h-4 w-4 text-primary" />
            <select
              className={`${selectClassName} ${
                category !== "all" ? "selected-chip" : ""
              }`}
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "All categories" : item}
                </option>
              ))}
            </select>
          </label>
          <select
            className={`${selectClassName} ${
              difficulty !== "all" ? "selected-chip" : ""
            }`}
            onChange={(event) =>
              setDifficulty(event.target.value as ExerciseDifficulty | "all")
            }
            value={difficulty}
          >
            <option value="all">All levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
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
            Loading exercise videos
          </div>
        </GlassCard>
      ) : filteredVideos.length === 0 ? (
        <EmptyState
          description="Try a different filter or add videos from the admin panel."
          title="No videos found"
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredVideos.map((video) => {
            const isSelected = selectedVideoId === video.id;
            return (
            <GlassCard
              aria-selected={isSelected}
              className={`bento-card overflow-hidden p-3 ${
                isSelected ? "selected-card" : ""
              } ${video.locked ? "opacity-80" : ""}`}
              data-gsap="card"
              interactive={!video.locked}
              key={video.id}
              onClick={() => setSelectedVideoId(video.id)}
              role="option"
              tabIndex={0}
              variant={isSelected ? "selected" : video.locked ? "disabled" : "interactive"}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedVideoId(video.id);
                }
              }}
            >
              <VideoThumb video={video} />
              <div className="p-2 pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold text-white">
                      {video.title}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/54">
                      {video.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {isSelected ? (
                      <Badge variant="selected">
                        <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                        Selected
                      </Badge>
                    ) : null}
                    <Badge
                      variant={
                        video.locked
                          ? "locked"
                          : video.is_premium
                            ? "premium"
                            : "user"
                      }
                    >
                      {video.locked ? "Locked" : video.is_premium ? "Premium" : "Free"}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-white/58">
                  <span className="rounded-xl border border-white/10 bg-carbon-950/40 px-2 py-2 capitalize">
                    {video.difficulty}
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-carbon-950/40 px-2 py-2">
                    <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                    {video.duration_minutes} min
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {video.target_muscles.slice(0, 3).map((muscle) => (
                    <span
                      className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-[11px] font-semibold text-white/58"
                      key={`${video.id}-${muscle}`}
                    >
                      {muscle}
                    </span>
                  ))}
                </div>

                <div className="mt-4">
                  {video.locked ? (
                    <PremiumButton
                      className="w-full"
                      icon={Lock}
                      to="/subscription"
                      variant="secondary"
                    >
                      Upgrade to Watch
                    </PremiumButton>
                  ) : !video.video_url ? (
                    <PremiumButton
                      className="w-full"
                      disabled
                      icon={Play}
                      variant="secondary"
                    >
                      Video Unavailable
                    </PremiumButton>
                  ) : (
                    <PremiumButton
                      className="w-full"
                      icon={Play}
                      onClick={() => setSelectedVideoId(video.id)}
                      to={`/library/videos/${video.id}`}
                      variant={isSelected ? "selected" : "primary"}
                    >
                      Watch
                    </PremiumButton>
                  )}
                </div>
              </div>
            </GlassCard>
            );
          })}
        </section>
      )}
    </div>
  );
}
