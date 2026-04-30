import {
  CheckCircle2,
  ClipboardList,
  Edit3,
  Film,
  Image,
  LoaderCircle,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Unlock,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import { pageReveal, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { GlassCard } from "@/shared/ui/GlassCard";
import { EmptyState } from "@/shared/ui/EmptyState";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { isHttpUrl, resolveMediaUrl } from "@/shared/utils/media";
import { adminService } from "@/features/admin/services/adminService";
import type {
  AdminUser,
  AdminSummary,
  ExerciseDifficulty,
  ExerciseVideo,
  ExerciseVideoPayload,
  SubscriptionPlan,
  SubscriptionPlanPayload,
} from "@/features/admin/types";

const initialVideoForm = {
  category: "Strength",
  description: "",
  difficulty: "beginner" as ExerciseDifficulty,
  duration_minutes: "10",
  equipment: "Bodyweight",
  is_active: true,
  is_premium: false,
  target_muscles: "",
  thumbnail_url: "",
  title: "",
  video_url: "",
  imagekit_video_file_id: "",
  imagekit_thumbnail_file_id: "",
};

const initialPlanForm = {
  duration_days: "30",
  features: "",
  is_active: true,
  name: "",
  price: "0",
};

function parseList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatPrice(price: number) {
  return price === 0 ? "Free" : `Rs ${price}`;
}

function compactDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCreatedDate(value: string | null) {
  return value ? compactDate(value) : "N/A";
}

function StatusPill({
  children,
  tone = "muted",
}: {
  children: string;
  tone?: "muted" | "good" | "warn";
}) {
  const styles = {
    good: "border-volt-400/25 bg-volt-400/10 text-volt-400",
    muted: "border-white/10 bg-white/[0.055] text-white/62",
    warn: "border-ember-400/25 bg-ember-400/10 text-ember-400",
  };

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-md border px-2 text-xs font-semibold ${styles[tone]}`}
    >
      {children}
    </span>
  );
}

type UploadKind = "video" | "thumbnail";
type UploadStatus = "idle" | "uploading" | "uploaded" | "failed";

function uploadStatusLabel(status: UploadStatus) {
  if (status === "uploading") {
    return "Uploading...";
  }
  if (status === "uploaded") {
    return "Uploaded to ImageKit";
  }
  if (status === "failed") {
    return "Failed";
  }
  return "Ready";
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function SmallActionButton({
  children,
  icon: Icon,
  onClick,
  tone = "muted",
}: {
  children: string;
  icon: typeof Edit3;
  onClick: () => void;
  tone?: "muted" | "danger" | "primary";
}) {
  const styles = {
    danger:
      "border-ember-400/25 bg-ember-400/10 text-ember-400 hover:bg-ember-400/20",
    muted: "border-white/10 bg-white/[0.055] text-white/68 hover:bg-white/[0.08]",
    primary:
      "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15",
  };

  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-primary ${styles[tone]}`}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

const inputClassName =
  "focus-ring min-h-11 w-full rounded-xl border border-white/10 bg-carbon-950/60 px-3 text-sm font-medium text-white shadow-inner-glass placeholder:text-white/34 hover:border-white/20 focus:border-primary";

const textAreaClassName =
  "focus-ring min-h-24 w-full rounded-xl border border-white/10 bg-carbon-950/60 px-3 py-3 text-sm font-medium text-white shadow-inner-glass placeholder:text-white/34 hover:border-white/20 focus:border-primary";

export default function AdminPanelPage() {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => pageReveal(scope), []);
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [videoForm, setVideoForm] = useState(initialVideoForm);
  const [planForm, setPlanForm] = useState(initialPlanForm);
  const [editingVideoId, setEditingVideoId] = useState<number | null>(null);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedThumbnailFile, setSelectedThumbnailFile] = useState<File | null>(
    null,
  );
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [thumbnailUploadStatus, setThumbnailUploadStatus] =
    useState<UploadStatus>("idle");
  const [videoUploadStatus, setVideoUploadStatus] = useState<UploadStatus>("idle");
  const [uploadedThumbnailUrl, setUploadedThumbnailUrl] = useState("");
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState("");

  const isUploading =
    videoUploadStatus === "uploading" || thumbnailUploadStatus === "uploading";
  const hasVideoSource = Boolean(uploadedVideoUrl || videoForm.video_url.trim());

  const activeVideoCount = summary?.active_videos ?? 0;
  const premiumVideoCount = summary?.premium_videos ?? 0;
  const totalVideoCount = summary?.total_videos ?? videos.length;
  const totalPlanCount = summary?.total_plans ?? plans.length;
  const totalUserCount = summary?.total_users ?? 0;
  const verifiedUserCount = summary?.verified_users ?? 0;
  const adminUserCount = summary?.admin_users ?? 0;
  const subscriptionCount = summary?.total_subscriptions ?? 0;

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const {
        plans: nextPlans,
        summary: nextSummary,
        users: nextUsers,
        videos: nextVideos,
      } =
        await adminService.getAdminData();
      setVideos(nextVideos);
      setPlans(nextPlans);
      setUsers(nextUsers);
      setSummary(nextSummary);
    } catch {
      setError("Unable to load admin data. Check backend and admin access.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminData();
  }, [loadAdminData]);

  function resetVideoForm() {
    setEditingVideoId(null);
    setVideoForm(initialVideoForm);
    setSelectedThumbnailFile(null);
    setSelectedVideoFile(null);
    setThumbnailUploadStatus("idle");
    setVideoUploadStatus("idle");
    setUploadedThumbnailUrl("");
    setUploadedVideoUrl("");
    setFileInputVersion((current) => current + 1);
  }

  function resetPlanForm() {
    setEditingPlanId(null);
    setPlanForm(initialPlanForm);
  }

  async function handleVideoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const manualVideoUrl = videoForm.video_url.trim();
      const manualThumbnailUrl = videoForm.thumbnail_url.trim();
      const videoUrl = (uploadedVideoUrl || manualVideoUrl).trim();
      const thumbnailUrl = (uploadedThumbnailUrl || manualThumbnailUrl).trim();

      if (!videoUrl) {
        setError("Upload a video file or provide a fallback video URL.");
        return;
      }
      if (!uploadedVideoUrl && !isHttpUrl(videoUrl)) {
        setError("Video URL must start with http:// or https://.");
        return;
      }
      if (thumbnailUrl && !uploadedThumbnailUrl && !isHttpUrl(thumbnailUrl)) {
        setError("Thumbnail URL must start with http:// or https://.");
        return;
      }

      const payload: ExerciseVideoPayload = {
        category: videoForm.category.trim(),
        description: videoForm.description.trim(),
        difficulty: videoForm.difficulty,
        duration_minutes: Number(videoForm.duration_minutes),
        equipment: videoForm.equipment.trim(),
        is_active: videoForm.is_active,
        is_premium: videoForm.is_premium,
        target_muscles: parseList(videoForm.target_muscles),
        thumbnail_url: thumbnailUrl,
        title: videoForm.title.trim(),
        video_url: videoUrl,
        imagekit_video_file_id: videoForm.imagekit_video_file_id,
        imagekit_thumbnail_file_id: videoForm.imagekit_thumbnail_file_id,
      };

      if (editingVideoId === null) {
        await adminService.createVideo(payload);
      } else {
        await adminService.updateVideo(editingVideoId, payload);
      }
      resetVideoForm();
      await loadAdminData();
    } catch (saveError) {
      setError(
        getErrorMessage(
          saveError,
          "Video save failed. Check required fields and admin access.",
        ),
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload: SubscriptionPlanPayload = {
      duration_days: Number(planForm.duration_days),
      features: parseList(planForm.features),
      is_active: planForm.is_active,
      name: planForm.name.trim(),
      price: Number(planForm.price),
    };

    try {
      if (editingPlanId === null) {
        await adminService.createPlan(payload);
      } else {
        await adminService.updatePlan(editingPlanId, payload);
      }
      resetPlanForm();
      await loadAdminData();
    } catch (planError) {
      setError(getErrorMessage(planError, "Plan save failed. Plan names must be unique."));
    } finally {
      setIsSaving(false);
    }
  }

  async function updateVideo(videoId: number, payload: Partial<ExerciseVideoPayload>) {
    setError(null);
    try {
      await adminService.updateVideo(videoId, payload);
      await loadAdminData();
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Could not update video."));
    }
  }

  async function deleteVideo(videoId: number) {
    if (!window.confirm("Delete this video from the admin catalog?")) {
      return;
    }

    setError(null);
    try {
      await adminService.deleteVideo(videoId);
      await loadAdminData();
    } catch (deleteError) {
      setError(getErrorMessage(deleteError, "Could not delete video."));
    }
  }

  async function updatePlan(planId: number, payload: Partial<SubscriptionPlanPayload>) {
    setError(null);
    try {
      await adminService.updatePlan(planId, payload);
      await loadAdminData();
    } catch (updateError) {
      setError(getErrorMessage(updateError, "Could not update plan."));
    }
  }

  function startVideoEdit(video: ExerciseVideo) {
    setEditingVideoId(video.id);
    setSelectedThumbnailFile(null);
    setSelectedVideoFile(null);
    setThumbnailUploadStatus("idle");
    setVideoUploadStatus("idle");
    setUploadedThumbnailUrl("");
    setUploadedVideoUrl("");
    setFileInputVersion((current) => current + 1);
    setVideoForm({
      category: video.category,
      description: video.description,
      difficulty: video.difficulty,
      duration_minutes: String(video.duration_minutes),
      equipment: video.equipment,
      is_active: video.is_active,
      is_premium: video.is_premium,
      target_muscles: video.target_muscles.join(", "),
      thumbnail_url: video.thumbnail_url,
      title: video.title,
      video_url: video.video_url,
      imagekit_video_file_id: video.imagekit_video_file_id,
      imagekit_thumbnail_file_id: video.imagekit_thumbnail_file_id,
    });
  }

  async function handleAssetUpload(kind: UploadKind, file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    if (kind === "video") {
      setSelectedVideoFile(file);
      setUploadedVideoUrl("");
      setVideoUploadStatus("uploading");
    } else {
      setSelectedThumbnailFile(file);
      setUploadedThumbnailUrl("");
      setThumbnailUploadStatus("uploading");
    }

    try {
      const uploadedAsset = await adminService.uploadAsset(kind, file);
      setVideoForm((current) => ({
        ...current,
        ...(kind === "video"
          ? {
              imagekit_video_file_id: uploadedAsset.file_id,
              video_url: uploadedAsset.url,
            }
          : {
              imagekit_thumbnail_file_id: uploadedAsset.file_id,
              thumbnail_url: uploadedAsset.url,
            }),
      }));
      if (kind === "video") {
        setUploadedVideoUrl(uploadedAsset.url);
        setVideoUploadStatus("uploaded");
      } else {
        setUploadedThumbnailUrl(uploadedAsset.url);
        setThumbnailUploadStatus("uploaded");
      }
    } catch (uploadError) {
      if (kind === "video") {
        setVideoUploadStatus("failed");
      } else {
        setThumbnailUploadStatus("failed");
      }
      setError(getErrorMessage(uploadError, "Upload failed."));
    }
  }

  function startPlanEdit(plan: SubscriptionPlan) {
    setEditingPlanId(plan.id);
    setPlanForm({
      duration_days: String(plan.duration_days),
      features: plan.features.join(", "),
      is_active: plan.is_active,
      name: plan.name,
      price: String(plan.price),
    });
  }

  return (
    <div className="app-page" ref={scopeRef}>
      <PageHeader
        action={
          <PremiumButton icon={RefreshCw} onClick={() => void loadAdminData()}>
            Refresh
          </PremiumButton>
        }
        description="Manage exercise content, premium visibility, uploads, and subscription plans from one operations surface."
        eyebrow="Admin mode"
        title="Content control panel"
      />

      {error ? (
        <div className="rounded-2xl border border-ember-400/25 bg-ember-400/10 p-4 text-sm text-ember-400">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GlassCard className="bento-card p-5" data-gsap="card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Users
          </p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {totalUserCount}
          </p>
        </GlassCard>
        <GlassCard className="bento-card p-5" data-gsap="card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Verified
          </p>
          <p className="mt-2 text-3xl font-semibold text-volt-400">
            {verifiedUserCount}
          </p>
        </GlassCard>
        <GlassCard className="bento-card p-5" data-gsap="card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Admins
          </p>
          <p className="mt-2 text-3xl font-semibold text-primary">
            {adminUserCount}
          </p>
        </GlassCard>
        <GlassCard className="bento-card p-5" data-gsap="card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Videos
          </p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {totalVideoCount}
          </p>
        </GlassCard>
        <GlassCard className="bento-card p-5" data-gsap="card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Active
          </p>
          <p className="mt-2 text-3xl font-semibold text-volt-400">
            {activeVideoCount}
          </p>
        </GlassCard>
        <GlassCard className="bento-card p-5" data-gsap="card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Premium
          </p>
          <p className="mt-2 text-3xl font-semibold text-primary">
            {premiumVideoCount}
          </p>
        </GlassCard>
        <GlassCard className="bento-card p-5" data-gsap="card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Plans
          </p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {totalPlanCount}
          </p>
        </GlassCard>
        <GlassCard className="bento-card p-5" data-gsap="card">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
            Subscriptions
          </p>
          <p className="mt-2 text-3xl font-semibold text-white">
            {subscriptionCount}
          </p>
        </GlassCard>
      </section>

      <GlassCard className="bento-card p-5" data-gsap="fade-up">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              Users overview
            </p>
            <h2 className="mt-1 text-xl font-semibold text-white">
              Authenticated accounts
            </h2>
          </div>
          {isLoading ? (
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <StatusPill>{`${users.length} users`}</StatusPill>
          )}
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <div
              className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"
              key={user.id}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-white">
                    {user.name}
                  </h3>
                  <p className="mt-1 truncate text-xs text-white/48">
                    {user.email}
                  </p>
                </div>
                <StatusPill tone={user.role === "admin" ? "warn" : "muted"}>
                  {user.role === "admin" ? "Admin" : "User"}
                </StatusPill>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusPill tone={user.is_verified ? "good" : "warn"}>
                  {user.is_verified ? "Verified" : "Unverified"}
                </StatusPill>
                {user.fitness_goal ? (
                  <StatusPill>{user.fitness_goal.replace("_", " ")}</StatusPill>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        {!isLoading && users.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              description="Registered accounts will appear here."
              title="No users found"
            />
          </div>
        ) : null}
      </GlassCard>

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <GlassCard className="bento-card p-5" data-gsap="slide-left">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Video management
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                {editingVideoId === null ? "Add exercise video" : "Edit video"}
              </h2>
            </div>
            {editingVideoId !== null ? (
              <SmallActionButton icon={X} onClick={resetVideoForm}>
                Cancel
              </SmallActionButton>
            ) : null}
          </div>

          <form className="mt-5 space-y-3" onSubmit={handleVideoSubmit}>
            <input
              className={inputClassName}
              onChange={(event) =>
                setVideoForm((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="Video title"
              required
              value={videoForm.title}
            />
            <textarea
              className={textAreaClassName}
              onChange={(event) =>
                setVideoForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Description and instructions"
              required
              value={videoForm.description}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={inputClassName}
                onChange={(event) =>
                  setVideoForm((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                placeholder="Category"
                required
                value={videoForm.category}
              />
              <select
                className={inputClassName}
                onChange={(event) =>
                  setVideoForm((current) => ({
                    ...current,
                    difficulty: event.target.value as ExerciseDifficulty,
                  }))
                }
                value={videoForm.difficulty}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
              <input
                className={inputClassName}
                min={1}
                onChange={(event) =>
                  setVideoForm((current) => ({
                    ...current,
                    duration_minutes: event.target.value,
                  }))
                }
                placeholder="Duration"
                required
                type="number"
                value={videoForm.duration_minutes}
              />
              <input
                className={inputClassName}
                onChange={(event) =>
                  setVideoForm((current) => ({
                    ...current,
                    equipment: event.target.value,
                  }))
                }
                placeholder="Equipment"
                value={videoForm.equipment}
              />
            </div>
            <input
              className={inputClassName}
              onChange={(event) =>
                setVideoForm((current) => ({
                  ...current,
                  target_muscles: event.target.value,
                }))
              }
              placeholder="Target muscles, comma separated"
              value={videoForm.target_muscles}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.045] p-3 transition hover:border-primary/35 hover:bg-white/[0.065]">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Video aria-hidden="true" className="h-4 w-4 text-primary" />
                    Upload video
                  </span>
                  <StatusPill
                    tone={
                      videoUploadStatus === "uploaded"
                        ? "good"
                        : videoUploadStatus === "failed"
                          ? "warn"
                          : "muted"
                    }
                  >
                    {uploadStatusLabel(videoUploadStatus)}
                  </StatusPill>
                </span>
                <span className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-3 text-xs font-semibold text-primary">
                  <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                  Choose video
                </span>
                <input
                  accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
                  className="sr-only"
                  disabled={videoUploadStatus === "uploading"}
                  key={`video-file-${fileInputVersion}`}
                  onChange={(event) =>
                    void handleAssetUpload("video", event.target.files?.[0] ?? null)
                  }
                  type="file"
                />
                <span className="mt-2 block truncate text-xs text-white/42">
                  {selectedVideoFile?.name ?? "MP4, WebM, or MOV up to 100MB"}
                </span>
                {videoForm.video_url ? (
                  <a
                    className="mt-2 block truncate text-xs font-semibold text-primary hover:text-primary-light"
                    href={videoForm.video_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {videoForm.video_url}
                  </a>
                ) : null}
              </label>

              <label className="cursor-pointer rounded-2xl border border-white/10 bg-white/[0.045] p-3 transition hover:border-volt-400/35 hover:bg-white/[0.065]">
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Image aria-hidden="true" className="h-4 w-4 text-volt-400" />
                    Upload thumbnail
                  </span>
                  <StatusPill
                    tone={
                      thumbnailUploadStatus === "uploaded"
                        ? "good"
                        : thumbnailUploadStatus === "failed"
                          ? "warn"
                          : "muted"
                    }
                  >
                    {uploadStatusLabel(thumbnailUploadStatus)}
                  </StatusPill>
                </span>
                <span className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-volt-400/20 bg-volt-400/10 px-3 text-xs font-semibold text-volt-400">
                  <Upload aria-hidden="true" className="h-3.5 w-3.5" />
                  Choose image
                </span>
                <input
                  accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                  className="sr-only"
                  disabled={thumbnailUploadStatus === "uploading"}
                  key={`thumbnail-file-${fileInputVersion}`}
                  onChange={(event) =>
                    void handleAssetUpload(
                      "thumbnail",
                      event.target.files?.[0] ?? null,
                    )
                  }
                  type="file"
                />
                <span className="mt-2 block truncate text-xs text-white/42">
                  {selectedThumbnailFile?.name ?? "JPG, PNG, or WebP up to 10MB"}
                </span>
                {videoForm.thumbnail_url ? (
                  <img
                    alt={`${videoForm.title || "Video"} thumbnail preview`}
                    className="mt-3 aspect-video w-full rounded-xl border border-white/10 object-cover"
                    src={resolveMediaUrl(videoForm.thumbnail_url)}
                  />
                ) : null}
              </label>
            </div>
            <input
              className={inputClassName}
              onChange={(event) =>
                setVideoForm((current) => ({
                  ...current,
                  video_url: event.target.value,
                }))
              }
              placeholder="Fallback video URL"
              value={videoForm.video_url}
            />
            <input
              className={inputClassName}
              onChange={(event) =>
                setVideoForm((current) => ({
                  ...current,
                  thumbnail_url: event.target.value,
                }))
              }
              placeholder="Fallback thumbnail URL"
              value={videoForm.thumbnail_url}
            />

            <div className="grid gap-2 sm:grid-cols-2">
              <label
                className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold transition ${
                  videoForm.is_premium
                    ? "selected-chip text-white"
                    : "border-white/10 bg-white/[0.045] text-white/70"
                }`}
              >
                Premium video
                <input
                  checked={videoForm.is_premium}
                  onChange={(event) =>
                    setVideoForm((current) => ({
                      ...current,
                      is_premium: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
              </label>
              <label
                className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold transition ${
                  videoForm.is_active
                    ? "toggle-selected"
                    : "border-white/10 bg-white/[0.045] text-white/70"
                }`}
              >
                Active
                <input
                  checked={videoForm.is_active}
                  onChange={(event) =>
                    setVideoForm((current) => ({
                      ...current,
                      is_active: event.target.checked,
                    }))
                  }
                  type="checkbox"
                />
              </label>
            </div>

            <PremiumButton
              className="w-full"
              disabled={isSaving || isUploading || !hasVideoSource}
              icon={isSaving || isUploading ? Upload : editingVideoId === null ? Plus : Save}
              type="submit"
            >
              {isSaving || isUploading
                ? "Uploading..."
                : editingVideoId === null
                  ? "Add Video"
                  : "Save Video"}
            </PremiumButton>
          </form>
        </GlassCard>

        <GlassCard className="bento-card p-5" data-gsap="slide-right">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-volt-400">
                Catalog
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Exercise videos
              </h2>
            </div>
            {isLoading ? (
              <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            ) : null}
          </div>

          <div className="mt-5 grid gap-3">
            {videos.map((video) => (
              <div
                aria-selected={editingVideoId === video.id}
                className={`rounded-2xl border p-4 transition ${
                  editingVideoId === video.id
                    ? "selected-card"
                    : "border-white/10 bg-white/[0.045] hover:border-primary/25 hover:bg-white/[0.06]"
                }`}
                key={video.id}
              >
                <div className="grid gap-4 lg:grid-cols-[96px_1fr]">
                  <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-white/10 bg-carbon-950/60 lg:aspect-square">
                    {video.thumbnail_url ? (
                      <img
                        alt={video.title}
                        className="h-full w-full object-cover"
                        src={resolveMediaUrl(video.thumbnail_url)}
                      />
                    ) : (
                      <Film aria-hidden="true" className="h-7 w-7 text-white/35" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-white">
                          {video.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-white/54">
                          {video.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusPill tone={video.is_active ? "good" : "warn"}>
                          {video.is_active ? "Active" : "Inactive"}
                        </StatusPill>
                        <StatusPill tone={video.is_premium ? "good" : "muted"}>
                          {video.is_premium ? "Premium" : "Free"}
                        </StatusPill>
                        <StatusPill tone={video.video_url ? "good" : "warn"}>
                          {video.video_url ? "Video attached" : "Video missing"}
                        </StatusPill>
                        <StatusPill tone={video.thumbnail_url ? "good" : "warn"}>
                          {video.thumbnail_url
                            ? "Thumbnail attached"
                            : "Thumbnail missing"}
                        </StatusPill>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/52">
                      <span>{video.category}</span>
                      <span>|</span>
                      <span className="capitalize">{video.difficulty}</span>
                      <span>|</span>
                      <span>{video.duration_minutes} min</span>
                      <span>|</span>
                      <span>{video.equipment || "No equipment"}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {video.target_muscles.map((muscle) => (
                        <span
                          className="rounded-md border border-white/10 bg-carbon-950/45 px-2 py-1 text-[11px] font-semibold text-white/60"
                          key={`${video.id}-${muscle}`}
                        >
                          {muscle}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <SmallActionButton
                        icon={Edit3}
                        onClick={() => startVideoEdit(video)}
                        tone="primary"
                      >
                        Edit
                      </SmallActionButton>
                      <SmallActionButton
                        icon={video.is_premium ? Unlock : Lock}
                        onClick={() =>
                          void updateVideo(video.id, {
                            is_premium: !video.is_premium,
                          })
                        }
                      >
                        {video.is_premium ? "Make Free" : "Make Premium"}
                      </SmallActionButton>
                      <SmallActionButton
                        icon={CheckCircle2}
                        onClick={() =>
                          void updateVideo(video.id, {
                            is_active: !video.is_active,
                          })
                        }
                      >
                        {video.is_active ? "Deactivate" : "Activate"}
                      </SmallActionButton>
                      <SmallActionButton
                        icon={Trash2}
                        onClick={() => void deleteVideo(video.id)}
                        tone="danger"
                      >
                        Delete
                      </SmallActionButton>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {!isLoading && videos.length === 0 ? (
              <EmptyState
                description="Add the first exercise video from the form."
                title="No videos yet"
              />
            ) : null}
          </div>
        </GlassCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.82fr_1.18fr]">
        <GlassCard className="bento-card p-5" data-gsap="slide-left">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Plans
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                {editingPlanId === null ? "Add subscription plan" : "Edit plan"}
              </h2>
            </div>
            {editingPlanId !== null ? (
              <SmallActionButton icon={X} onClick={resetPlanForm}>
                Cancel
              </SmallActionButton>
            ) : null}
          </div>

          <form className="mt-5 space-y-3" onSubmit={handlePlanSubmit}>
            <input
              className={inputClassName}
              onChange={(event) =>
                setPlanForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              placeholder="Plan name"
              required
              value={planForm.name}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className={inputClassName}
                min={0}
                onChange={(event) =>
                  setPlanForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="Price"
                required
                type="number"
                value={planForm.price}
              />
              <input
                className={inputClassName}
                min={0}
                onChange={(event) =>
                  setPlanForm((current) => ({
                    ...current,
                    duration_days: event.target.value,
                  }))
                }
                placeholder="Duration days"
                required
                type="number"
                value={planForm.duration_days}
              />
            </div>
            <textarea
              className={textAreaClassName}
              onChange={(event) =>
                setPlanForm((current) => ({
                  ...current,
                  features: event.target.value,
                }))
              }
              placeholder="Features, comma separated"
              value={planForm.features}
            />
            <label
              className={`flex min-h-11 items-center justify-between gap-3 rounded-md border px-3 text-sm font-semibold transition ${
                planForm.is_active
                  ? "toggle-selected"
                  : "border-white/10 bg-white/[0.045] text-white/70"
              }`}
            >
              Plan active
              <input
                checked={planForm.is_active}
                onChange={(event) =>
                  setPlanForm((current) => ({
                    ...current,
                    is_active: event.target.checked,
                  }))
                }
                type="checkbox"
              />
            </label>
            <PremiumButton
              className="w-full"
              disabled={isSaving}
              icon={editingPlanId === null ? Plus : Save}
              type="submit"
            >
              {editingPlanId === null ? "Add Plan" : "Save Plan"}
            </PremiumButton>
          </form>
        </GlassCard>

        <GlassCard className="bento-card p-5" data-gsap="slide-right">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ClipboardList aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-volt-400">
                Plan management
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Subscription plans
              </h2>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                aria-selected={editingPlanId === plan.id}
                className={`rounded-2xl border p-4 transition ${
                  editingPlanId === plan.id
                    ? "selected-card"
                    : "border-white/10 bg-white/[0.045] hover:border-primary/25 hover:bg-white/[0.06]"
                }`}
                key={plan.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-white">{plan.name}</h3>
                    <p className="mt-1 text-2xl font-semibold text-primary">
                      {formatPrice(plan.price)}
                    </p>
                  </div>
                  <StatusPill tone={plan.is_active ? "good" : "warn"}>
                    {plan.is_active ? "Active" : "Inactive"}
                  </StatusPill>
                </div>
                <p className="mt-2 text-xs text-white/45">
                  {plan.duration_days === 0
                    ? "No expiry"
                    : `${plan.duration_days} days`}{" "}
                  | Created {formatCreatedDate(plan.created_at)}
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-5 text-white/62">
                  {plan.features.map((feature) => (
                    <li className="flex gap-2" key={`${plan.id}-${feature}`}>
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  <SmallActionButton
                    icon={Edit3}
                    onClick={() => {
                      if (plan.id !== null) {
                        startPlanEdit(plan);
                      }
                    }}
                    tone="primary"
                  >
                    Edit
                  </SmallActionButton>
                  <SmallActionButton
                    icon={CheckCircle2}
                    onClick={() =>
                      plan.id === null
                        ? undefined
                        : void updatePlan(plan.id, { is_active: !plan.is_active })
                    }
                  >
                    {plan.is_active ? "Disable" : "Enable"}
                  </SmallActionButton>
                </div>
              </div>
            ))}
          </div>
          {!isLoading && plans.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                description="Plans created by admins will appear here."
                title="No plans yet"
              />
            </div>
          ) : null}
        </GlassCard>
      </section>
    </div>
  );
}
