import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Gauge,
  Lightbulb,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Square,
  StopCircle,
  Trophy,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import { GlassCard } from "@/shared/ui/GlassCard";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { fadeUp, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { useCamera, type CameraStatus } from "@/features/workouts/hooks/useCamera";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { usePoseDetection } from "@/features/workouts/hooks/usePoseDetection";
import { useWorkoutSession } from "@/features/workouts/hooks/useWorkoutSession";
import type {
  ExerciseType,
  PoseAngleKey,
  PoseAngleReasons,
  PoseAngles,
} from "@/features/workouts/services/pose/exerciseAngles";
import type { PoseValidationResult } from "@/features/workouts/services/pose/poseValidation";

const exerciseOptions: Array<{
  label: string;
  value: ExerciseType;
  helper: string;
}> = [
  {
    label: "Squat",
    value: "squat",
    helper: "Knee, hip, and torso control",
  },
  {
    label: "Push-up",
    value: "push_up",
    helper: "Elbow depth and body line",
  },
  {
    label: "Crunch",
    value: "crunch",
    helper: "Core range and control",
  },
  {
    label: "Bicep Curl",
    value: "bicep_curl",
    helper: "Arm angle and curl control",
  },
];

const cameraStatusLabels: Record<CameraStatus, string> = {
  active: "Camera active",
  denied: "Camera denied",
  error: "Camera error",
  not_started: "Camera off",
  requesting_permission: "Requesting camera",
};

const cameraStatusStyles: Record<CameraStatus, string> = {
  active: "border-volt-400/25 bg-volt-400/10 text-volt-400",
  denied: "border-ember-400/25 bg-ember-400/10 text-ember-400",
  error: "border-ember-400/25 bg-ember-400/10 text-ember-400",
  not_started: "border-white/10 bg-white/[0.08] text-white/68",
  requesting_permission: "border-primary/25 bg-primary/10 text-primary",
};

const angleLabels: Array<{ key: PoseAngleKey; label: string }> = [
  { key: "kneeAngle", label: "Knee" },
  { key: "hipAngle", label: "Hip" },
  { key: "elbowAngle", label: "Elbow" },
  { key: "torsoAngle", label: "Torso" },
  { key: "shoulderAngle", label: "Shoulder" },
];

const primaryAnglesByExercise: Record<
  ExerciseType,
  Array<{ key: PoseAngleKey; label: string }>
> = {
  bicep_curl: [
    { key: "elbowAngle", label: "Elbow" },
    { key: "shoulderAngle", label: "Upper arm" },
  ],
  crunch: [
    { key: "torsoAngle", label: "Torso" },
    { key: "hipAngle", label: "Hip" },
  ],
  push_up: [
    { key: "elbowAngle", label: "Elbow" },
    { key: "shoulderAngle", label: "Shoulder" },
    { key: "torsoAngle", label: "Body line" },
  ],
  squat: [
    { key: "kneeAngle", label: "Knee" },
    { key: "hipAngle", label: "Hip" },
    { key: "torsoAngle", label: "Torso" },
  ],
};

function formatAngle(value: number | null) {
  return typeof value === "number" ? `${value} deg` : "--";
}

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatExerciseName(selectedExercise: ExerciseType) {
  if (selectedExercise === "push_up") {
    return "Push-up";
  }

  if (selectedExercise === "bicep_curl") {
    return "Bicep Curl";
  }

  return selectedExercise[0].toUpperCase() + selectedExercise.slice(1);
}

function getSaveStatusLabel(saveStatus: string) {
  if (saveStatus === "failed") {
    return "Local only";
  }

  if (saveStatus === "skipped") {
    return "Not saved";
  }

  if (saveStatus === "saving") {
    return "Saving";
  }

  if (saveStatus === "saved") {
    return "Saved";
  }

  return "Idle";
}

function getPostureBadge({
  feedbackIsPositive,
  isSessionActive,
  poseValid,
}: {
  feedbackIsPositive: boolean;
  isSessionActive: boolean;
  poseValid: boolean;
}) {
  if (!isSessionActive) {
    return {
      label: "Ready",
      className: "border-white/10 bg-white/[0.055] text-white/62",
    };
  }

  if (!poseValid) {
    return {
      label: "Pose not ready",
      className: "border-ember-400/25 bg-ember-400/10 text-ember-400",
    };
  }

  if (feedbackIsPositive) {
    return {
      label: "Good posture",
      className: "border-volt-400/25 bg-volt-400/10 text-volt-400",
    };
  }

  return {
    label: "Correction needed",
    className: "border-ember-400/25 bg-ember-400/10 text-ember-400",
  };
}

function formatValidationReason(reason: string) {
  return reason
    .split("_")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function getPoseStatusLabel(
  poseValidation: PoseValidationResult,
  countingEnabled: boolean,
) {
  if (countingEnabled) {
    return "Counting enabled";
  }

  if (poseValidation.isValid) {
    return "Pose valid";
  }

  if (poseValidation.reason === "no_pose_detected") {
    return "No pose";
  }

  return formatValidationReason(poseValidation.reason);
}

function StatusChip({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-xl ${className}`}
    >
      {children}
    </span>
  );
}

function CompactMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[11px] font-medium text-white/45">
            {label}
          </span>
          <span className="mt-0.5 block truncate text-lg font-semibold leading-6 text-white">
            {value}
          </span>
        </span>
      </div>
    </div>
  );
}

function PrimaryRepCard({
  correctReps,
  incorrectReps,
  totalReps,
}: {
  correctReps: number;
  incorrectReps: number;
  totalReps: number;
}) {
  return (
    <div className="col-span-2 overflow-hidden rounded-2xl border border-primary/20 bg-[radial-gradient(circle_at_top_right,rgb(var(--theme-primary-rgb)/0.07),rgba(255,255,255,0.035)_42%,rgba(255,255,255,0.02))] p-4 shadow-soft-panel">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            Total reps
          </p>
          <p className="mt-1 text-5xl font-semibold leading-none text-white sm:text-6xl">
            {totalReps}
          </p>
        </div>
        <Trophy aria-hidden="true" className="mb-2 h-8 w-8 text-volt-400" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-volt-400/15 bg-volt-400/10 px-3 py-2">
          <span className="block text-[11px] font-medium text-white/48">
            Correct
          </span>
          <span className="text-lg font-semibold text-volt-400">
            {correctReps}
          </span>
        </div>
        <div className="rounded-xl border border-ember-400/15 bg-ember-400/10 px-3 py-2">
          <span className="block text-[11px] font-medium text-white/48">
            Incorrect
          </span>
          <span className="text-lg font-semibold text-ember-400">
            {incorrectReps}
          </span>
        </div>
      </div>
    </div>
  );
}

function PrimaryAnglePanel({
  angles,
  exerciseType,
  reasons,
}: {
  angles: PoseAngles;
  exerciseType: ExerciseType;
  reasons: PoseAngleReasons;
}) {
  const primaryAngles = primaryAnglesByExercise[exerciseType];

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-white">Movement signals</span>
        <span className="text-xs font-semibold text-primary">
          {formatExerciseName(exerciseType)}
        </span>
      </div>
      <div
        className={`mt-3 grid gap-2 ${
          primaryAngles.length === 2 ? "grid-cols-2" : "grid-cols-3"
        }`}
      >
        {primaryAngles.map((angle) => (
          <div
            className="rounded-xl border border-white/10 bg-carbon-950/45 px-2.5 py-2"
            key={`${exerciseType}-${angle.key}`}
            title={reasons[angle.key] ?? angle.label}
          >
            <span className="block truncate text-[11px] text-white/45">
              {angle.label}
            </span>
            <span className="mt-1 block truncate text-sm font-semibold text-white">
              {formatAngle(angles[angle.key])}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SessionButton({
  children,
  disabled,
  icon: Icon,
  onClick,
  tone = "default",
}: {
  children: ReactNode;
  disabled?: boolean;
  icon: LucideIcon;
  onClick: () => void;
  tone?: "default" | "danger" | "muted";
}) {
  const toneClassName = {
    default:
      "border-primary/25 bg-primary/12 text-primary hover:bg-primary/20",
    danger:
      "border-ember-400/25 bg-ember-400/12 text-ember-400 hover:bg-ember-400/20",
    muted: "border-white/10 bg-white/[0.055] text-white/70 hover:bg-white/[0.08]",
  }[tone];

  return (
    <button
      className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-45 ${toneClassName}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{children}</span>
    </button>
  );
}

function CollapsiblePanel({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/[0.04]">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
          {title}
        </span>
        <ChevronDown
          aria-hidden="true"
          className="h-4 w-4 text-white/45 transition group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-white/10 p-3">{children}</div>
    </details>
  );
}

function AngleMetricGrid({
  angles,
  reasons,
}: {
  angles: PoseAngles;
  reasons: PoseAngleReasons;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {angleLabels.map((angle) => (
        <div
          className="rounded-xl border border-white/10 bg-carbon-950/45 px-3 py-2"
          key={angle.key}
          title={reasons[angle.key] ?? angle.label}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-white/48">{angle.label}</span>
            <span className="text-sm font-semibold text-white">
              {formatAngle(angles[angle.key])}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function LiveWorkoutPage() {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => {
    fadeUp(scope.querySelectorAll("[data-live-panel]"), {
      duration: 0.45,
      stagger: 0.05,
    });
  }, []);
  const auth = useAuth();
  const userId = auth.user?.id;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exerciseType, setExerciseType] = useState<ExerciseType>("squat");
  const {
    errorMessage: cameraError,
    isSupported,
    startCamera,
    status: cameraStatus,
    stopCamera,
    videoRef,
  } = useCamera();
  const {
    angleReasons,
    angles,
    errorMessage: poseError,
    poseValidation,
    status: poseStatus,
    visibleSide,
  } = usePoseDetection({
    canvasRef,
    enabled: cameraStatus === "active",
    exerciseType,
    videoRef,
  });
  const session = useWorkoutSession({
    angleReasons,
    angles,
    cameraActive: cameraStatus === "active",
    poseValidation,
    selectedExercise: exerciseType,
    userId,
  });

  const isCameraActive = cameraStatus === "active";
  const isRequestingPermission = cameraStatus === "requesting_permission";
  const hasCameraProblem =
    cameraStatus === "denied" || cameraStatus === "error" || !isSupported;
  const feedbackIsPositive =
    session.liveFeedback.toLowerCase().startsWith("good") ||
    (poseValidation.isValid &&
      session.formScore >= 80 &&
      session.currentPhase !== "unknown" &&
      session.isSessionActive);
  const poseStatusLabel = getPoseStatusLabel(
    poseValidation,
    session.countingEnabled,
  );
  const postureBadge = getPostureBadge({
    feedbackIsPositive,
    isSessionActive: session.isSessionActive,
    poseValid: poseValidation.isValid,
  });
  const feedbackCardClassName = !session.isSessionActive
    ? "border-white/10 bg-white/[0.045]"
    : feedbackIsPositive
      ? "border-volt-400/25 bg-volt-400/10"
      : "border-ember-400/25 bg-ember-400/10";
  const keyAngle = primaryAnglesByExercise[exerciseType][0];
  const localSummaryNote = session.summary?.localNote ?? null;

  return (
    <div
      className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 xl:h-[calc(100vh-8.75rem)] xl:overflow-hidden"
      ref={scopeRef}
    >
      <div
        className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between"
        data-live-panel
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            Live workout
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
            Real-time pose cockpit
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/52">
          <StatusChip className="border-white/10 bg-white/[0.055] text-white/62">
            Browser-only video
          </StatusChip>
          <StatusChip className="border-white/10 bg-white/[0.055] text-white/62">
            Backend user id: {userId ?? "signed out"}
          </StatusChip>
        </div>
      </div>

      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,1.9fr)_minmax(360px,0.95fr)]">
        <GlassCard
          className="flex min-h-[430px] flex-col overflow-hidden xl:min-h-0"
          data-live-panel
        >
          <div className="flex shrink-0 flex-col gap-3 border-b border-white/10 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Camera aria-hidden="true" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-white">Camera coaching view</h2>
                <p className="text-xs text-white/45">
                  Skeleton overlay, live form feedback, and rep tracking.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <PremiumButton
                className="min-h-10 px-4 py-2 sm:w-auto"
                disabled={isCameraActive || isRequestingPermission || !isSupported}
                icon={Play}
                onClick={startCamera}
              >
                Start Camera
              </PremiumButton>
              <PremiumButton
                className="min-h-10 px-4 py-2 sm:w-auto"
                disabled={!isCameraActive}
                icon={Square}
                onClick={() => {
                  session.pauseSession();
                  stopCamera();
                }}
                variant="secondary"
              >
                Stop
              </PremiumButton>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
            <div className="relative min-h-[300px] flex-1 overflow-hidden rounded-[1.75rem] border border-white/10 bg-carbon-950/85 shadow-soft-panel xl:min-h-0">
              <video
                aria-label="Webcam preview"
                autoPlay
                className={`h-full w-full scale-x-[-1] object-cover transition-opacity duration-300 ${
                  isCameraActive ? "opacity-100" : "opacity-0"
                }`}
                muted
                playsInline
                ref={videoRef}
              />
              <canvas
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1]"
                ref={canvasRef}
              />

              <div className="absolute left-3 right-3 top-3 z-10 flex flex-wrap gap-2">
                <StatusChip className={cameraStatusStyles[cameraStatus]}>
                  {cameraStatusLabels[cameraStatus]}
                </StatusChip>
                <StatusChip
                  className={
                    poseValidation.isValid
                      ? "border-volt-400/25 bg-volt-400/10 text-volt-400"
                      : poseValidation.reason !== "no_pose_detected"
                        ? "border-ember-400/25 bg-ember-400/10 text-ember-400"
                        : "border-white/10 bg-white/[0.08] text-white/68"
                  }
                >
                  {poseStatusLabel}
                </StatusChip>
                <StatusChip className="border-primary/25 bg-primary/10 text-primary">
                  {formatExerciseName(exerciseType)}
                </StatusChip>
              </div>

              {session.isSessionActive ? (
                <div
                  className={`absolute bottom-3 left-3 z-10 max-w-md rounded-2xl border px-4 py-3 backdrop-blur-xl ${
                    feedbackIsPositive
                      ? "border-volt-400/25 bg-volt-400/12 text-white"
                      : "border-ember-400/25 bg-ember-400/12 text-white"
                  }`}
                >
                  <p className="text-sm font-semibold">
                    {session.liveFeedback}
                  </p>
                </div>
              ) : null}

              {!isCameraActive ? (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-md text-center">
                    <div
                      className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
                        hasCameraProblem
                          ? "bg-ember-400/10 text-ember-400"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      {hasCameraProblem ? (
                        <CameraOff aria-hidden="true" className="h-6 w-6" />
                      ) : isRequestingPermission ? (
                        <LoaderCircle
                          aria-hidden="true"
                          className="h-6 w-6 animate-spin"
                        />
                      ) : (
                        <ScanLine aria-hidden="true" className="h-6 w-6" />
                      )}
                    </div>
                    <h2 className="mt-5 text-xl font-semibold text-white">
                      {hasCameraProblem
                        ? "Camera unavailable"
                        : isRequestingPermission
                          ? "Waiting for permission"
                          : "Start your camera"}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-white/56">
                      {cameraError ??
                        "Allow browser camera access to preview your workout and run local pose detection."}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </GlassCard>

        <aside className="min-h-0 xl:sticky xl:top-24 xl:h-full">
          <GlassCard
            className="flex h-full min-h-[430px] flex-col overflow-hidden p-4 xl:min-h-0"
            data-live-panel
          >
            <div className="shrink-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-volt-400">
                    Coach panel
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-white">
                    Live control room
                  </h2>
                </div>
                <StatusChip className="border-white/10 bg-white/[0.055] text-white/62">
                  {session.lifecycle}
                </StatusChip>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <StatusChip className={cameraStatusStyles[cameraStatus]}>
                  {cameraStatusLabels[cameraStatus]}
                </StatusChip>
                <StatusChip className="border-primary/35 bg-primary/12 text-white orange-glow">
                  Selected: {formatExerciseName(exerciseType)}
                </StatusChip>
                <StatusChip
                  className={
                    poseValidation.isValid
                      ? "border-primary/35 bg-primary/12 text-white"
                      : isCameraActive
                        ? "border-ember-400/25 bg-ember-400/10 text-ember-400"
                        : "border-white/10 bg-white/[0.055] text-white/62"
                  }
                >
                  {poseStatusLabel}
                </StatusChip>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {exerciseOptions.map((option) => {
                  const isSelected = exerciseType === option.value;
                  return (
                    <button
                      aria-selected={isSelected}
                      className={`focus-ring rounded-xl border px-2 py-2 text-left text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${
                        isSelected
                          ? "selected-card text-white"
                          : session.isSessionActive
                            ? "border-white/10 bg-carbon-950/30 text-white/35"
                            : "border-white/10 bg-white/[0.045] text-white/62 hover:border-primary/25 hover:bg-white/[0.07] hover:text-white"
                      }`}
                      disabled={session.isSessionActive}
                      key={option.value}
                      onClick={() => setExerciseType(option.value)}
                      role="option"
                      title={option.helper}
                      type="button"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate">{option.label}</span>
                        {isSelected ? (
                          <CheckCircle2
                            aria-hidden="true"
                            className="h-3.5 w-3.5 shrink-0 text-volt-400"
                          />
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[10px] font-medium leading-4 text-white/42">
                        {session.isSessionActive && !isSelected
                          ? "Locked during session"
                          : option.helper}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2">
                <SessionButton
                  disabled={!isCameraActive || session.isSessionActive}
                  icon={Play}
                  onClick={session.startSession}
                >
                  {session.isPaused ? "Resume" : "Start"}
                </SessionButton>
                <SessionButton
                  disabled={!session.isSessionActive}
                  icon={Pause}
                  onClick={session.pauseSession}
                  tone="muted"
                >
                  Pause
                </SessionButton>
                <SessionButton
                  disabled={
                    session.lifecycle === "idle" || session.lifecycle === "ended"
                  }
                  icon={StopCircle}
                  onClick={() => void session.endSession()}
                  tone="danger"
                >
                  End
                </SessionButton>
                <SessionButton
                  icon={RotateCcw}
                  onClick={session.resetSession}
                  tone="muted"
                >
                  Reset
                </SessionButton>
              </div>
            </div>

            <div className="no-scrollbar mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-2">
                <PrimaryRepCard
                  correctReps={session.correctReps}
                  incorrectReps={session.incorrectReps}
                  totalReps={session.totalReps}
                />
                <CompactMetric
                  icon={Clock3}
                  label="Timer"
                  value={formatDuration(session.timerSeconds)}
                />
                <CompactMetric
                  icon={Gauge}
                  label="Form score"
                  value={`${session.formScore}%`}
                />
                <CompactMetric
                  icon={Activity}
                  label="Phase"
                  value={session.currentPhase}
                />
                <CompactMetric
                  icon={StopCircle}
                  label="Result sync"
                  value={getSaveStatusLabel(session.saveStatus)}
                />
              </div>

              <div className={`rounded-2xl border p-4 ${feedbackCardClassName}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
                    Live feedback
                  </p>
                  <StatusChip className={postureBadge.className}>
                    {postureBadge.label}
                  </StatusChip>
                </div>
                <p className="mt-2 text-lg font-semibold leading-6 text-white">
                  {session.isSessionActive
                    ? session.liveFeedback
                    : session.liveFeedback}
                </p>
                {session.isSessionActive && !session.countingEnabled ? (
                  <div className="mt-3 rounded-xl border border-ember-400/20 bg-carbon-950/35 p-3 text-xs leading-5 text-white/62">
                    <p className="font-semibold text-ember-400">
                      {session.countingGuidance}
                    </p>
                    <p className="mt-2">
                      Reason: {session.countingDisabledReason}
                    </p>
                  </div>
                ) : null}
                {session.feedbackTags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {session.feedbackTags.slice(0, 5).map((tag) => (
                      <span
                        className="rounded-full border border-white/10 bg-carbon-950/35 px-2 py-1 text-[11px] font-semibold text-white/62"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>

              <PrimaryAnglePanel
                angles={angles}
                exerciseType={exerciseType}
                reasons={angleReasons}
              />

              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <UserRoundCheck
                      aria-hidden="true"
                      className="h-4 w-4 text-volt-400"
                    />
                    Pose engine
                  </span>
                  <span className="text-xs font-semibold capitalize text-white/62">
                    {poseStatus}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-white/45">
                  <span>Visible side</span>
                  <span className="capitalize text-white/68">{visibleSide}</span>
                </div>
                <div className="mt-3 grid gap-2 rounded-2xl border border-white/10 bg-carbon-950/35 p-3 text-xs text-white/58">
                  <div className="flex items-center justify-between gap-3">
                    <span>Pose valid</span>
                    <span className={poseValidation.isValid ? "text-volt-400" : "text-ember-400"}>
                      {poseValidation.isValid ? "yes" : "no"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Counting enabled</span>
                    <span className={session.countingEnabled ? "text-volt-400" : "text-ember-400"}>
                      {session.countingEnabled ? "yes" : "no"}
                    </span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span>Disabled reason</span>
                    <span className="max-w-[12rem] text-right text-white/70">
                      {session.countingEnabled
                        ? "none"
                        : session.countingDisabledReason}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Key angle: {keyAngle.label}</span>
                    <span className="text-white/70">
                      {formatAngle(angles[keyAngle.key])}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Current phase</span>
                    <span className="capitalize text-white/70">
                      {session.currentPhase}
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs leading-5 text-white/48">
                  Squat and push-up summaries save on End Session. Crunch and
                  bicep curl stay local in v1.
                </p>
                {poseError ? (
                    <div className="mt-2 flex items-start gap-2 text-xs leading-5 text-ember-400">
                    <AlertTriangle
                      aria-hidden="true"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ember-400"
                    />
                    <span>{poseError}</span>
                  </div>
                ) : null}
              </div>

              {session.summary ? (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-primary/20 bg-primary/10 p-4"
                  initial={{ opacity: 0, y: 8 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        Session summary
                      </p>
                      <h3 className="mt-1 font-semibold text-white">
                        {formatExerciseName(session.summary.exercise)}
                      </h3>
                    </div>
                    <StatusChip className="border-white/10 bg-carbon-950/35 text-white/68">
                      {getSaveStatusLabel(session.summary.saveStatus)}
                    </StatusChip>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl bg-carbon-950/35 p-2">
                      <span className="block text-[11px] text-white/45">
                        Time
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {formatDuration(session.summary.durationSeconds)}
                      </span>
                    </div>
                    <div className="rounded-xl bg-carbon-950/35 p-2">
                      <span className="block text-[11px] text-white/45">
                        Reps
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {session.summary.totalReps}
                      </span>
                    </div>
                    <div className="rounded-xl bg-carbon-950/35 p-2">
                      <span className="block text-[11px] text-white/45">
                        Score
                      </span>
                      <span className="text-sm font-semibold text-white">
                        {session.summary.formScore}%
                      </span>
                    </div>
                  </div>

                  {session.summary.feedbackTags.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {session.summary.feedbackTags.slice(0, 6).map((tag) => (
                        <span
                          className="rounded-full border border-white/10 bg-carbon-950/35 px-2 py-1 text-[11px] font-semibold text-white/62"
                          key={tag}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {session.summary.recommendationMessage ? (
                    <p className="mt-3 rounded-2xl border border-volt-400/20 bg-volt-400/10 p-3 text-xs leading-5 text-white/70">
                      {session.summary.recommendationMessage}
                    </p>
                  ) : null}

                  {localSummaryNote ? (
                    <p className="mt-3 rounded-2xl border border-white/10 bg-carbon-950/35 p-3 text-xs leading-5 text-white/70">
                      {localSummaryNote}
                    </p>
                  ) : null}

                  {session.summary.saveError ? (
                    <p className="mt-3 rounded-2xl border border-ember-400/20 bg-ember-400/10 p-3 text-xs leading-5 text-ember-400">
                      {session.summary.saveError}
                    </p>
                  ) : null}
                </motion.div>
              ) : null}

              <CollapsiblePanel icon={Gauge} title="Angle debug">
                <p className="mb-3 text-xs leading-5 text-white/48">
                  Smoothed metrics update several times per second. Hover missing
                  values for the internal reason.
                </p>
                <AngleMetricGrid angles={angles} reasons={angleReasons} />
              </CollapsiblePanel>

              <CollapsiblePanel icon={Lightbulb} title="Setup tips">
                <ul className="space-y-2 text-xs leading-5 text-white/58">
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt-400" />
                    <span>Keep your full body visible in the camera frame.</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt-400" />
                    <span>Use good lighting so landmarks are easier to detect.</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-volt-400" />
                    <span>Keep the camera stable during the session.</span>
                  </li>
                </ul>
              </CollapsiblePanel>
            </div>
          </GlassCard>
        </aside>
      </section>
    </div>
  );
}
