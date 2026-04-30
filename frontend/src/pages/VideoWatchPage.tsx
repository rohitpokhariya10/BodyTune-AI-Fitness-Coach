import {
  ArrowLeft,
  Clock3,
  Dumbbell,
  LoaderCircle,
  Lock,
  PlayCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { GlassCard } from "@/shared/ui/GlassCard";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { resolveMediaUrl } from "@/shared/utils/media";
import { activityService } from "@/features/activity/services/activityService";
import { libraryService } from "@/features/library/services/libraryService";
import type { VideoAccessResponse } from "@/features/library/types";

function supportsAiCoaching(title: string, category: string) {
  const text = `${title} ${category}`.toLowerCase();
  return (
    text.includes("squat") ||
    text.includes("push") ||
    text.includes("crunch") ||
    text.includes("curl") ||
    text.includes("bicep")
  );
}

export default function VideoWatchPage() {
  const { videoId } = useParams();
  const recordedVideoWatchRef = useRef<number | null>(null);
  const [videoAccess, setVideoAccess] = useState<VideoAccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadVideo = useCallback(async () => {
    if (!videoId) {
      setError("Video id is missing.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await libraryService.getVideo(videoId);
      setVideoAccess(response);
    } catch {
      setError("Unable to load this video.");
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    void loadVideo();
  }, [loadVideo]);

  const video = videoAccess?.video ?? null;
  const videoUrl = useMemo(() => resolveMediaUrl(video?.video_url), [video?.video_url]);
  const thumbnailUrl = useMemo(
    () => resolveMediaUrl(video?.thumbnail_url),
    [video?.thumbnail_url],
  );
  const canStartCoaching = useMemo(
    () => (video ? supportsAiCoaching(video.title, video.category) : false),
    [video],
  );

  useEffect(() => {
    if (!video || videoAccess?.locked || recordedVideoWatchRef.current === video.id) {
      return;
    }

    recordedVideoWatchRef.current = video.id;
    void activityService.recordVideoWatch(video.id).catch(() => undefined);
  }, [video, videoAccess?.locked]);

  if (isLoading) {
    return (
      <GlassCard className="flex min-h-[420px] items-center justify-center p-8">
        <div className="flex items-center gap-3 text-sm font-semibold text-white/62">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          Loading video
        </div>
      </GlassCard>
    );
  }

  if (error || !videoAccess || !video) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-lg font-semibold text-white">Video unavailable</p>
        <p className="mt-2 text-sm text-white/52">{error}</p>
        <PremiumButton className="mt-6" icon={ArrowLeft} to="/library">
          Back to Library
        </PremiumButton>
      </GlassCard>
    );
  }

  if (videoAccess.locked) {
    return (
      <div className="space-y-5">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/62 transition hover:text-white"
          to="/library"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to library
        </Link>

        <GlassCard className="orange-glow-card overflow-hidden p-6">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-carbon-950/70">
              {thumbnailUrl ? (
                <img
                  alt={video.title}
                  className="h-full w-full object-cover opacity-45"
                  src={thumbnailUrl}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgb(var(--theme-primary-rgb)/0.07),rgba(255,255,255,0.035)_42%,rgba(255,255,255,0.02))]">
                  <Dumbbell aria-hidden="true" className="h-12 w-12 text-white/32" />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-carbon-950/68 backdrop-blur-sm">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-volt-400/25 bg-volt-400/12 text-volt-400">
                  <Lock aria-hidden="true" className="h-7 w-7" />
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-volt-400">
                Premium content
              </p>
              <h1 className="mt-3 text-3xl font-semibold text-white">
                {video.title}
              </h1>
              <p className="mt-4 text-sm leading-6 text-white/58">
                {videoAccess.message}
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <PremiumButton icon={Sparkles} to="/subscription">
                  Upgrade Subscription
                </PremiumButton>
                <PremiumButton icon={ArrowLeft} to="/library" variant="secondary">
                  Browse Free Videos
                </PremiumButton>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        className="inline-flex items-center gap-2 text-sm font-semibold text-white/62 transition hover:text-white"
        to="/library"
      >
        <ArrowLeft aria-hidden="true" className="h-4 w-4" />
        Back to library
      </Link>

      <GlassCard className="bento-card overflow-hidden">
        <div className="aspect-video bg-black">
          {videoUrl ? (
            <video
              className="h-full w-full"
              controls
              poster={thumbnailUrl || undefined}
              src={videoUrl}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-white">
                  Video unavailable
                </p>
                <p className="mt-2 text-sm text-white/52">
                  Admin has not attached a playable video file.
                </p>
              </div>
            </div>
          )}
        </div>
      </GlassCard>

      <section className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <GlassCard className="bento-card p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {video.category}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.055] px-2 py-1 text-xs font-semibold capitalize text-white/62">
              {video.difficulty}
            </span>
            {video.is_premium ? (
              <span className="rounded-full border border-volt-400/25 bg-volt-400/10 px-2 py-1 text-xs font-semibold text-volt-400">
                Premium
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-semibold text-white">
            {video.title}
          </h1>
          <p className="mt-4 text-sm leading-7 text-white/60">
            {video.description}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-xs text-white/42">Duration</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-white">
                <Clock3 aria-hidden="true" className="h-4 w-4 text-primary" />
                {video.duration_minutes} min
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-xs text-white/42">Equipment</p>
              <p className="mt-1 font-semibold text-white">
                {video.equipment || "Bodyweight"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
              <p className="text-xs text-white/42">Access</p>
              <p className="mt-1 flex items-center gap-2 font-semibold text-volt-400">
                <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                Unlocked
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="bento-card p-5">
          <h2 className="font-semibold text-white">Training actions</h2>
          <p className="mt-2 text-sm leading-6 text-white/54">
            Watch the movement first, then launch live coaching for supported
            exercises.
          </p>
          {canStartCoaching ? (
            <PremiumButton
              className="mt-5 w-full"
              icon={PlayCircle}
              to="/workouts/live"
            >
              Start AI Coaching
            </PremiumButton>
          ) : (
            <PremiumButton
              className="mt-5 w-full"
              disabled
              icon={PlayCircle}
              variant="secondary"
            >
              Coaching Coming Later
            </PremiumButton>
          )}
          <div className="mt-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/42">
              Target muscles
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {video.target_muscles.map((muscle) => (
                <span
                  className="rounded-full border border-white/10 bg-white/[0.045] px-2 py-1 text-xs font-semibold text-white/62"
                  key={muscle}
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>
        </GlassCard>
      </section>
    </div>
  );
}
