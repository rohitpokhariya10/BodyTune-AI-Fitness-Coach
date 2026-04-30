import { useCallback, useEffect, useRef, useState } from "react";

import { apiClient } from "@/shared/api/client";
import type {
  ExerciseType,
  PoseAngleKey,
  PoseAngleReasons,
  PoseAngles,
} from "@/features/workouts/services/pose/exerciseAngles";
import {
  getPoseValidationGuidance,
  type PoseSelectedSide,
  type PoseValidationResult,
} from "@/features/workouts/services/pose/poseValidation";
import { evaluateBicepCurlRules } from "@/features/workouts/rules/bicepCurlRules";
import { evaluateCrunchRules } from "@/features/workouts/rules/crunchRules";
import { evaluatePushupRules } from "@/features/workouts/rules/pushupRules";
import { evaluateSquatRules } from "@/features/workouts/rules/squatRules";
import type {
  BackendSaveStatus,
  RecommendationRead,
  SessionSummary,
  WorkoutPhase,
  WorkoutCountingStatus,
  WorkoutResultCreatePayload,
  WorkoutResultRead,
  WorkoutRuleInput,
  WorkoutRuleResult,
} from "@/features/workouts/types";

type SessionLifecycle = "idle" | "active" | "paused" | "ended";

type WorkoutSessionState = {
  lifecycle: SessionLifecycle;
  timerSeconds: number;
  totalReps: number;
  correctReps: number;
  incorrectReps: number;
  currentPhase: WorkoutPhase;
  liveFeedback: string;
  feedbackTags: string[];
  formScore: number;
  saveStatus: BackendSaveStatus;
  saveError: string | null;
  recommendationMessage: string | null;
  summary: SessionSummary | null;
  countingStatus: WorkoutCountingStatus;
};

type UseWorkoutSessionArgs = {
  angleReasons: PoseAngleReasons;
  angles: PoseAngles;
  cameraActive: boolean;
  poseValidation: PoseValidationResult;
  selectedExercise: ExerciseType;
  userId?: number;
};

const ANGLE_JUMP_LIMIT_DEGREES = 70;
const BICEP_CURL_MIN_REP_DURATION_MS = 350;
const BICEP_CURL_POSE_VALID_STABILITY_MS = 200;
const BICEP_CURL_REP_COOLDOWN_MS = 450;
const MIN_REP_DURATION_MS = 400;
const PHASE_STABILITY_MS = 150;
const POSE_VALID_STABILITY_MS = 250;
const REP_COOLDOWN_MS = 500;
const SIDE_CHANGE_WINDOW_MS = 1200;
const SIDE_CHANGE_LIMIT = 3;

const initialCountingStatus: WorkoutCountingStatus = {
  countingEnabled: false,
  disabledReason: "session_not_started",
  guidance: "Start a session when you are ready.",
  poseValid: false,
};

const initialSessionState: WorkoutSessionState = {
  countingStatus: initialCountingStatus,
  correctReps: 0,
  currentPhase: "unknown",
  feedbackTags: [],
  formScore: 0,
  incorrectReps: 0,
  lifecycle: "idle",
  liveFeedback: "Start a session when you are ready.",
  recommendationMessage: null,
  saveError: null,
  saveStatus: "idle",
  summary: null,
  timerSeconds: 0,
  totalReps: 0,
};

function evaluateRules(
  selectedExercise: ExerciseType,
  input: WorkoutRuleInput,
): WorkoutRuleResult {
  if (selectedExercise === "push_up") {
    return evaluatePushupRules(input);
  }

  if (selectedExercise === "crunch") {
    return evaluateCrunchRules(input);
  }

  if (selectedExercise === "bicep_curl") {
    return evaluateBicepCurlRules(input);
  }

  return evaluateSquatRules(input);
}

function isBackendSupportedExercise(
  selectedExercise: ExerciseType,
): selectedExercise is "squat" | "push_up" {
  return selectedExercise === "squat" || selectedExercise === "push_up";
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

function getLocalSummaryMessage(selectedExercise: ExerciseType) {
  if (selectedExercise === "bicep_curl") {
    return "Bicep curl summary is stored locally in v1. Backend support can be added later.";
  }

  return "Crunch summary is local until the backend supports crunch.";
}

function getRequiredAngleProblem(
  angles: PoseAngles,
  requiredAngles: PoseAngleKey[],
) {
  for (const angleKey of requiredAngles) {
    const value = angles[angleKey];
    if (typeof value !== "number" || Number.isNaN(value)) {
      return angleKey === "kneeAngle" ? "invalid_knee_angle" : "invalid_angle";
    }
  }

  return null;
}

function getAngleJumpProblem(
  previousAngles: PoseAngles | null,
  nextAngles: PoseAngles,
  requiredAngles: PoseAngleKey[],
) {
  if (previousAngles === null) {
    return null;
  }

  for (const angleKey of requiredAngles) {
    const previousValue = previousAngles[angleKey];
    const nextValue = nextAngles[angleKey];

    if (typeof previousValue !== "number" || typeof nextValue !== "number") {
      return angleKey === "kneeAngle" ? "invalid_knee_angle" : "invalid_angle";
    }

    if (Math.abs(nextValue - previousValue) > ANGLE_JUMP_LIMIT_DEGREES) {
      return "angle_jump";
    }
  }

  return null;
}

function getDisabledGuidance(reason: string) {
  if (reason === "session_not_started") {
    return "Start a session when you are ready";
  }

  if (reason === "waiting_for_stability") {
    return "Hold a steady valid pose before reps count";
  }

  if (reason === "camera_inactive") {
    return "Start camera before counting reps";
  }

  if (reason === "no_pose_detected") {
    return "Step into frame so the camera can see you";
  }

  if (reason === "angle_jump" || reason === "selected_side_unstable") {
    return "Hold steady so movement can be tracked";
  }

  return getPoseValidationGuidance(reason);
}

function createCountingStatus({
  countingEnabled,
  disabledReason,
  poseValid,
}: {
  countingEnabled: boolean;
  disabledReason: string;
  poseValid: boolean;
}): WorkoutCountingStatus {
  return {
    countingEnabled,
    disabledReason,
    guidance: countingEnabled ? "Counting enabled" : getDisabledGuidance(disabledReason),
    poseValid,
  };
}

function getPausedFeedback(reason: string) {
  if (reason === "missing_shoulder") {
    return "Keep one shoulder visible";
  }

  if (
    reason === "missing_elbow" ||
    reason === "missing_wrist" ||
    reason === "arm_not_visible" ||
    reason === "invalid_angle"
  ) {
    return "Keep your arm visible";
  }

  if (reason === "missing_hip") {
    return "Keep one hip visible";
  }

  if (reason === "missing_knee") {
    return "Keep one knee visible";
  }

  if (reason === "missing_ankle") {
    return "Keep one ankle visible";
  }

  if (reason === "invalid_knee_angle") {
    return "Keep hip, knee, and ankle visible on one side";
  }

  if (reason === "body_too_small") {
    return "Move slightly so hip, knee, and ankle are separated";
  }

  if (reason === "waiting_for_stability") {
    return "Hold a steady valid pose before reps count";
  }

  if (reason === "session_not_started") {
    return "Start a session when you are ready";
  }

  return getPoseValidationGuidance(reason);
}

export function useWorkoutSession({
  angleReasons,
  angles,
  cameraActive,
  poseValidation,
  selectedExercise,
  userId,
}: UseWorkoutSessionArgs) {
  const [session, setSession] =
    useState<WorkoutSessionState>(initialSessionState);
  const feedbackTagsRef = useRef<Set<string>>(new Set());
  const formScoreSamplesRef = useRef<number[]>([]);
  const latestFeedbackRef = useRef(initialSessionState.liveFeedback);
  const phaseRef = useRef<WorkoutPhase>("unknown");
  const pendingPhaseRef = useRef<WorkoutPhase>("unknown");
  const pendingPhaseSinceRef = useRef(0);
  const poseValidSinceRef = useRef<number | null>(null);
  const previousAnglesRef = useRef<PoseAngles | null>(null);
  const repArmedRef = useRef(false);
  const repGoodFormRef = useRef(true);
  const repStartedAtRef = useRef(0);
  const repTagsRef = useRef<Set<string>>(new Set());
  const lastRepAtRef = useRef(0);
  const sideChangeEventsRef = useRef<number[]>([]);
  const visibleSideRef = useRef<PoseSelectedSide>("unknown");
  const sessionRef = useRef(session);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const resetInternals = useCallback(() => {
    feedbackTagsRef.current = new Set();
    formScoreSamplesRef.current = [];
    latestFeedbackRef.current = initialSessionState.liveFeedback;
    phaseRef.current = "unknown";
    pendingPhaseRef.current = "unknown";
    pendingPhaseSinceRef.current = 0;
    poseValidSinceRef.current = null;
    previousAnglesRef.current = null;
    repArmedRef.current = false;
    repGoodFormRef.current = true;
    repStartedAtRef.current = 0;
    repTagsRef.current = new Set();
    lastRepAtRef.current = 0;
    sideChangeEventsRef.current = [];
    visibleSideRef.current = "unknown";
  }, []);

  const resetSession = useCallback(() => {
    resetInternals();
    setSession(initialSessionState);
  }, [resetInternals]);

  useEffect(() => {
    resetSession();
  }, [resetSession, selectedExercise]);

  const startSession = useCallback(() => {
    visibleSideRef.current = poseValidation.selectedSide;
    sideChangeEventsRef.current = [];

    setSession((current) => {
      if (current.lifecycle === "active") {
        return current;
      }

      if (current.lifecycle === "ended") {
        resetInternals();
        return {
          ...initialSessionState,
          lifecycle: "active",
          liveFeedback: `Session started: ${formatExerciseName(selectedExercise)}`,
        };
      }

      return {
        ...current,
        lifecycle: "active",
        liveFeedback:
          current.lifecycle === "paused"
            ? "Session resumed"
            : `Session started: ${formatExerciseName(selectedExercise)}`,
        saveStatus: "idle",
        saveError: null,
        summary: null,
      };
    });
  }, [poseValidation.selectedSide, resetInternals, selectedExercise]);

  const pauseSession = useCallback(() => {
    setSession((current) =>
      current.lifecycle === "active"
        ? {
            ...current,
            lifecycle: "paused",
            liveFeedback: "Session paused",
          }
        : current,
    );
  }, []);

  useEffect(() => {
    if (session.lifecycle !== "active") {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setSession((current) => ({
        ...current,
        timerSeconds: current.timerSeconds + 1,
      }));
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [session.lifecycle]);

  useEffect(() => {
    if (session.lifecycle !== "active") {
      return;
    }

    const now = performance.now();
    const disabledReason = getCountingDisabledReason({
      angles,
      cameraActive,
      poseValidation,
      previousAngles: previousAnglesRef.current,
    });

    if (disabledReason === "angle_jump") {
      skipCurrentFrame(disabledReason);
      return;
    }

    if (disabledReason !== null) {
      resetCountingGate(disabledReason);
      return;
    }

    const validForMs =
      poseValidSinceRef.current === null ? 0 : now - poseValidSinceRef.current;
    const poseValidStabilityMs =
      selectedExercise === "bicep_curl"
        ? BICEP_CURL_POSE_VALID_STABILITY_MS
        : POSE_VALID_STABILITY_MS;

    if (validForMs < poseValidStabilityMs) {
      resetCountingGate("waiting_for_stability");
      previousAnglesRef.current = angles;
      return;
    }

    previousAnglesRef.current = angles;

    const ruleResult = evaluateRules(selectedExercise, {
      angleReasons,
      angles,
      poseDetected: poseValidation.isValid,
    });

    latestFeedbackRef.current = poseValidation.isValid
      ? ruleResult.feedback
      : getPausedFeedback(poseValidation.reason);

    for (const tag of ruleResult.feedbackTags) {
      feedbackTagsRef.current.add(tag);
    }

    if (ruleResult.formScore > 0) {
      formScoreSamplesRef.current = [
        ...formScoreSamplesRef.current,
        ruleResult.formScore,
      ].slice(-60);
    }

    const averageFormScore =
      formScoreSamplesRef.current.length > 0
        ? Math.round(
            formScoreSamplesRef.current.reduce(
              (total, score) => total + score,
              0,
            ) / formScoreSamplesRef.current.length,
          )
        : 0;

    setSession((current) => ({
      ...current,
      countingStatus: createCountingStatus({
        countingEnabled: true,
        disabledReason: "none",
        poseValid: true,
      }),
      currentPhase: phaseRef.current,
      feedbackTags: [...feedbackTagsRef.current],
      formScore: averageFormScore,
      liveFeedback: latestFeedbackRef.current,
    }));

    if (!poseValidation.isValid || ruleResult.phase === "unknown") {
      pendingPhaseRef.current = "unknown";
      pendingPhaseSinceRef.current = 0;
      return;
    }

    const previousPhase = phaseRef.current;
    const nextPhase = getStablePhase(ruleResult.phase, now);

    if (nextPhase === null || previousPhase === nextPhase) {
      if (repArmedRef.current) {
        repGoodFormRef.current =
          repGoodFormRef.current && ruleResult.isGoodForm;
        for (const tag of ruleResult.feedbackTags) {
          repTagsRef.current.add(tag);
        }
      }
      return;
    }

    const repStartsFromDown =
      selectedExercise === "crunch" || selectedExercise === "bicep_curl";
    const startsRep =
      repStartsFromDown
        ? previousPhase === "down" && nextPhase === "up"
        : previousPhase === "up" && nextPhase === "down";
    const completesRep =
      repStartsFromDown
        ? previousPhase === "up" && nextPhase === "down"
        : previousPhase === "down" && nextPhase === "up";

    if (startsRep) {
      repArmedRef.current = true;
      repGoodFormRef.current = ruleResult.isGoodForm;
      repStartedAtRef.current = now;
      repTagsRef.current = new Set(ruleResult.feedbackTags);
    }

    if (repArmedRef.current) {
      repGoodFormRef.current = repGoodFormRef.current && ruleResult.isGoodForm;
      for (const tag of ruleResult.feedbackTags) {
        repTagsRef.current.add(tag);
      }
    }

    if (completesRep && repArmedRef.current) {
      const repDuration = now - repStartedAtRef.current;
      const minRepDuration =
        selectedExercise === "bicep_curl"
          ? BICEP_CURL_MIN_REP_DURATION_MS
          : MIN_REP_DURATION_MS;
      const repCooldown =
        selectedExercise === "bicep_curl"
          ? BICEP_CURL_REP_COOLDOWN_MS
          : REP_COOLDOWN_MS;

      if (
        repDuration >= minRepDuration &&
        now - lastRepAtRef.current >= repCooldown
      ) {
        lastRepAtRef.current = now;
        const isCorrectRep =
          repGoodFormRef.current && repTagsRef.current.size === 0;

        for (const tag of repTagsRef.current) {
          feedbackTagsRef.current.add(tag);
        }

        setSession((current) => ({
          ...current,
          correctReps: current.correctReps + (isCorrectRep ? 1 : 0),
          feedbackTags: [...feedbackTagsRef.current],
          incorrectReps: current.incorrectReps + (isCorrectRep ? 0 : 1),
          liveFeedback: isCorrectRep
            ? `Good ${formatExerciseName(selectedExercise).toLowerCase()} rep`
            : latestFeedbackRef.current,
          totalReps: current.totalReps + 1,
        }));
      }

      repArmedRef.current = false;
      repGoodFormRef.current = true;
      repStartedAtRef.current = 0;
      repTagsRef.current = new Set();
    }

    phaseRef.current = nextPhase;
    setSession((current) => ({
      ...current,
      currentPhase: nextPhase,
    }));

    function getStablePhase(
      rawPhase: WorkoutPhase,
      timestamp: number,
    ): WorkoutPhase | null {
      if (rawPhase === "unknown") {
        pendingPhaseRef.current = "unknown";
        pendingPhaseSinceRef.current = 0;
        return null;
      }

      if (rawPhase === phaseRef.current) {
        pendingPhaseRef.current = "unknown";
        pendingPhaseSinceRef.current = 0;
        return rawPhase;
      }

      if (pendingPhaseRef.current !== rawPhase) {
        pendingPhaseRef.current = rawPhase;
        pendingPhaseSinceRef.current = timestamp;
        return null;
      }

      if (timestamp - pendingPhaseSinceRef.current < PHASE_STABILITY_MS) {
        return null;
      }

      pendingPhaseRef.current = "unknown";
      pendingPhaseSinceRef.current = 0;
      return rawPhase;
    }

    function resetCountingGate(reason: string) {
      const status = createCountingStatus({
        countingEnabled: false,
        disabledReason: reason,
        poseValid: poseValidation.isValid,
      });
      latestFeedbackRef.current = getPausedFeedback(reason);
      phaseRef.current = "unknown";
      pendingPhaseRef.current = "unknown";
      pendingPhaseSinceRef.current = 0;
      if (reason !== "waiting_for_stability") {
        poseValidSinceRef.current = null;
        previousAnglesRef.current = null;
      }
      repArmedRef.current = false;
      repGoodFormRef.current = true;
      repStartedAtRef.current = 0;
      repTagsRef.current = new Set();

      setSession((current) => ({
        ...current,
        countingStatus: status,
        currentPhase: "unknown",
        formScore: 0,
        liveFeedback: latestFeedbackRef.current,
      }));
    }

    function skipCurrentFrame(reason: string) {
      const status = createCountingStatus({
        countingEnabled: false,
        disabledReason: reason,
        poseValid: poseValidation.isValid,
      });
      latestFeedbackRef.current = getPausedFeedback(reason);

      setSession((current) => ({
        ...current,
        countingStatus: status,
        liveFeedback: latestFeedbackRef.current,
      }));
    }

    function getCountingDisabledReason({
      angles: nextAngles,
      cameraActive: isCameraActive,
      poseValidation: nextPoseValidation,
      previousAngles,
    }: {
      angles: PoseAngles;
      cameraActive: boolean;
      poseValidation: PoseValidationResult;
      previousAngles: PoseAngles | null;
    }): string | null {
      if (!isCameraActive) {
        return "camera_inactive";
      }

      if (!nextPoseValidation.isValid) {
        return nextPoseValidation.reason;
      }

      const requiredAngleProblem = getRequiredAngleProblem(
        nextAngles,
        nextPoseValidation.requiredAngles,
      );
      if (requiredAngleProblem !== null) {
        return requiredAngleProblem;
      }

      const angleJumpProblem = getAngleJumpProblem(
        previousAngles,
        nextAngles,
        nextPoseValidation.requiredAngles,
      );
      if (angleJumpProblem !== null) {
        return angleJumpProblem;
      }

      const nextSelectedSide = nextPoseValidation.selectedSide;
      if (nextSelectedSide === "unknown") {
        return nextPoseValidation.reason;
      }

      if (visibleSideRef.current !== nextSelectedSide) {
        visibleSideRef.current = nextSelectedSide;
        sideChangeEventsRef.current = [
          ...sideChangeEventsRef.current.filter(
            (eventAt) => now - eventAt <= SIDE_CHANGE_WINDOW_MS,
          ),
          now,
        ];
      } else {
        sideChangeEventsRef.current = sideChangeEventsRef.current.filter(
          (eventAt) => now - eventAt <= SIDE_CHANGE_WINDOW_MS,
        );
      }

      if (sideChangeEventsRef.current.length >= SIDE_CHANGE_LIMIT) {
        return "selected_side_unstable";
      }

      if (poseValidSinceRef.current === null) {
        poseValidSinceRef.current = now;
      }

      return null;
    }
  }, [
    angleReasons,
    angles,
    cameraActive,
    poseValidation,
    selectedExercise,
    session.lifecycle,
  ]);

  const endSession = useCallback(async () => {
    const snapshot = sessionRef.current;
    const durationSeconds = snapshot.timerSeconds;
    const feedbackTags = [...feedbackTagsRef.current];
    const baseSummary: SessionSummary = {
      correctReps: snapshot.correctReps,
      durationSeconds,
      exercise: selectedExercise,
      feedbackTags,
      formScore: snapshot.formScore,
      incorrectReps: snapshot.incorrectReps,
      localNote: isBackendSupportedExercise(selectedExercise)
        ? null
        : getLocalSummaryMessage(selectedExercise),
      recommendationMessage: null,
      saveError: null,
      saveStatus: isBackendSupportedExercise(selectedExercise)
        ? "saving"
        : "skipped",
      totalReps: snapshot.totalReps,
    };

    setSession((current) => ({
      ...current,
      lifecycle: "ended",
      saveError: null,
      saveStatus: baseSummary.saveStatus,
      summary: baseSummary,
    }));

    if (!isBackendSupportedExercise(selectedExercise)) {
      setSession((current) => ({
        ...current,
        liveFeedback: getLocalSummaryMessage(selectedExercise),
        summary: {
          ...baseSummary,
          saveStatus: "skipped",
        },
      }));
      return;
    }

    if (!userId) {
      setSession((current) => ({
        ...current,
        liveFeedback: "Session completed locally. Sign in again to save results.",
        saveError: "Session completed locally. Sign in again to save results.",
        saveStatus: "skipped",
        summary: {
          ...baseSummary,
          saveError: "Session completed locally. Sign in again to save results.",
          saveStatus: "skipped",
        },
      }));
      return;
    }

    const payload: WorkoutResultCreatePayload = {
      correct_reps: snapshot.correctReps,
      duration_seconds: Math.max(1, durationSeconds),
      feedback_tags: feedbackTags,
      incorrect_reps: snapshot.incorrectReps,
      primary_feedback: latestFeedbackRef.current || null,
      total_reps: snapshot.totalReps,
      user_id: userId,
      workout_type: selectedExercise,
    };

    try {
      const savedResult = await apiClient.request<WorkoutResultRead>(
        "/api/v1/results",
        {
          body: JSON.stringify(payload),
          method: "POST",
        },
      );
      const recommendation = await apiClient.request<RecommendationRead>(
        "/api/v1/recommendations",
        {
          body: JSON.stringify({
            user_id: userId,
            workout_result_id: savedResult.id,
          }),
          method: "POST",
        },
      );

      setSession((current) => ({
        ...current,
        recommendationMessage: recommendation.message,
        saveStatus: "saved",
        summary: {
          ...baseSummary,
          recommendationMessage: recommendation.message,
          saveStatus: "saved",
        },
      }));
    } catch {
      setSession((current) => ({
        ...current,
        liveFeedback: "Session completed locally. Could not save to backend.",
        saveError: "Session completed locally. Could not save to backend.",
        saveStatus: "failed",
        summary: {
          ...baseSummary,
          saveError: "Session completed locally. Could not save to backend.",
          saveStatus: "failed",
        },
      }));
    }
  }, [selectedExercise, userId]);

  return {
    countingDisabledReason: session.countingStatus.disabledReason,
    countingEnabled: session.countingStatus.countingEnabled,
    countingGuidance: session.countingStatus.guidance,
    correctReps: session.correctReps,
    currentPhase: session.currentPhase,
    endSession,
    feedbackTags: session.feedbackTags,
    formScore: session.formScore,
    incorrectReps: session.incorrectReps,
    isPaused: session.lifecycle === "paused",
    isSessionActive: session.lifecycle === "active",
    lifecycle: session.lifecycle,
    liveFeedback: session.liveFeedback,
    pauseSession,
    poseValid: poseValidation.isValid,
    recommendationMessage: session.recommendationMessage,
    resetSession,
    saveError: session.saveError,
    saveStatus: session.saveStatus,
    startSession,
    summary: session.summary,
    timerSeconds: session.timerSeconds,
    totalReps: session.totalReps,
  };
}
