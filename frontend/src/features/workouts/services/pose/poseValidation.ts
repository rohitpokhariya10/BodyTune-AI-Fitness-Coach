import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import type { ExerciseType, PoseAngleKey } from "./exerciseAngles";
import { calculateAngle } from "./angleUtils";
import { POSE_LANDMARK_INDEX, type PoseLandmarkName } from "./landmarks";

export type PoseSelectedSide = "left" | "right" | "unknown";

export type PoseValidationResult = {
  isValid: boolean;
  reason: string;
  guidance: string;
  requiredAngles: PoseAngleKey[];
  selectedSide: PoseSelectedSide;
  confidence: number;
  requiredLandmarksPresent: boolean;
};

type SideJoint = "Shoulder" | "Elbow" | "Wrist" | "Hip" | "Knee" | "Ankle";

type LandmarkCheck = {
  joint: SideJoint;
  point: NormalizedLandmark | null;
  reason: string | null;
  visibility: number;
};

type SideValidation = PoseValidationResult & {
  score: number;
};

const MIN_VISIBILITY = 0.35;
const MIN_SQUAT_HIP_ANKLE_DISTANCE = 0.12;
const MIN_PUSHUP_BODY_DISTANCE = 0.34;
const MIN_CRUNCH_BODY_DISTANCE = 0.18;
const MIN_FRAME_X = -0.1;
const MAX_FRAME_X = 1.1;
const MIN_FRAME_Y = -0.1;
const MAX_FRAME_Y = 1.15;

const requiredAnglesByExercise: Record<ExerciseType, PoseAngleKey[]> = {
  bicep_curl: ["elbowAngle"],
  crunch: ["torsoAngle", "hipAngle"],
  push_up: ["elbowAngle", "shoulderAngle", "torsoAngle"],
  squat: ["kneeAngle"],
};

const requiredJointsByExercise: Record<ExerciseType, SideJoint[]> = {
  bicep_curl: ["Shoulder", "Elbow", "Wrist"],
  crunch: ["Shoulder", "Hip", "Knee"],
  push_up: ["Shoulder", "Elbow", "Wrist", "Hip", "Ankle"],
  squat: ["Shoulder", "Hip", "Knee", "Ankle"],
};

export function createInvalidPoseValidation(
  reason = "no_pose_detected",
  exerciseType: ExerciseType = "squat",
): PoseValidationResult {
  return {
    confidence: 0,
    guidance: getPoseValidationGuidance(reason),
    isValid: false,
    reason,
    requiredAngles: requiredAnglesByExercise[exerciseType],
    selectedSide: "unknown",
    requiredLandmarksPresent: false,
  };
}

export function isValidExercisePose(
  landmarks: NormalizedLandmark[],
  exerciseType: ExerciseType,
): PoseValidationResult {
  if (landmarks.length === 0) {
    return createInvalidPoseValidation("no_pose_detected", exerciseType);
  }

  const candidates: SideValidation[] = [
    validateSide(landmarks, exerciseType, "left"),
    validateSide(landmarks, exerciseType, "right"),
  ];
  const validCandidates = candidates.filter((candidate) => candidate.isValid);

  if (validCandidates.length > 0) {
    return validCandidates.sort((first, second) => second.score - first.score)[0];
  }

  return candidates.sort((first, second) => second.score - first.score)[0];
}

export function getPoseValidationGuidance(reason: string): string {
  if (reason === "session_not_started") {
    return "Start a session when you are ready";
  }

  if (reason === "waiting_for_stability") {
    return "Hold a steady valid pose before reps count";
  }

  if (reason === "no_pose_detected") {
    return "Step into frame so the camera can see you";
  }

  if (reason === "missing_shoulder") {
    return "Keep one shoulder visible";
  }

  if (reason === "missing_elbow" || reason === "missing_wrist") {
    return "Keep shoulder, elbow, and wrist visible on one arm";
  }

  if (reason === "arm_not_visible" || reason === "invalid_angle") {
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

  if (reason === "camera_inactive") {
    return "Start camera before counting reps";
  }

  if (reason === "angle_jump" || reason === "selected_side_unstable") {
    return "Hold steady so movement can be tracked";
  }

  return "Keep the required landmarks visible";
}

function validateSide(
  landmarks: NormalizedLandmark[],
  exerciseType: ExerciseType,
  side: "left" | "right",
): SideValidation {
  const requiredJoints = requiredJointsByExercise[exerciseType];
  const checks = requiredJoints.map((joint) =>
    validateLandmark(landmarks, sideName(side, joint), joint),
  );
  const validChecks = checks.filter((check) => check.reason === null);
  const confidence =
    validChecks.length > 0
      ? validChecks.reduce((total, check) => total + check.visibility, 0) /
        validChecks.length
      : 0;
  const baseResult = {
    confidence: roundConfidence(confidence),
    requiredAngles: requiredAnglesByExercise[exerciseType],
    requiredLandmarksPresent: validChecks.length === checks.length,
    selectedSide: side,
  };
  const failedCheck = checks.find((check) => check.reason !== null);

  if (failedCheck?.reason) {
    return {
      ...baseResult,
      guidance: getPoseValidationGuidance(failedCheck.reason),
      isValid: false,
      reason: failedCheck.reason,
      score: validChecks.length + confidence,
    };
  }

  const points = Object.fromEntries(
    checks.map((check) => [check.joint, check.point]),
  ) as Record<SideJoint, NormalizedLandmark>;
  const bodyScaleReason = validateBodyScale(exerciseType, points);

  if (bodyScaleReason) {
    return {
      ...baseResult,
      guidance: getPoseValidationGuidance(bodyScaleReason),
      isValid: false,
      reason: bodyScaleReason,
      score: validChecks.length + confidence,
    };
  }

  if (exerciseType === "squat") {
    const kneeAngle = calculateAngle(points.Hip, points.Knee, points.Ankle);
    if (typeof kneeAngle !== "number" || Number.isNaN(kneeAngle)) {
      return {
        ...baseResult,
        guidance: getPoseValidationGuidance("invalid_knee_angle"),
        isValid: false,
        reason: "invalid_knee_angle",
        score: validChecks.length + confidence,
      };
    }
  }

  return {
    ...baseResult,
    guidance: "Pose valid",
    isValid: true,
    reason: "valid",
    score: validChecks.length + confidence + 10,
  };
}

function validateLandmark(
  landmarks: NormalizedLandmark[],
  name: PoseLandmarkName,
  joint: SideJoint,
): LandmarkCheck {
  const point = landmarks[POSE_LANDMARK_INDEX[name]];
  const reason = missingReasonForJoint(joint);

  if (!point) {
    return {
      joint,
      point: null,
      reason,
      visibility: 0,
    };
  }

  const visibility =
    typeof point.visibility === "number" ? point.visibility : 1;

  if (visibility < MIN_VISIBILITY) {
    return {
      joint,
      point,
      reason,
      visibility,
    };
  }

  if (!isPointInFrame(point)) {
    return {
      joint,
      point,
      reason,
      visibility,
    };
  }

  return {
    joint,
    point,
    reason: null,
    visibility,
  };
}

function validateBodyScale(
  exerciseType: ExerciseType,
  points: Record<SideJoint, NormalizedLandmark>,
): string | null {
  if (exerciseType === "squat") {
    if (distance(points.Hip, points.Ankle) < MIN_SQUAT_HIP_ANKLE_DISTANCE) {
      return "body_too_small";
    }
  }

  if (exerciseType === "push_up") {
    const bodyDistance = distance(points.Shoulder, points.Ankle);
    if (bodyDistance < MIN_PUSHUP_BODY_DISTANCE) {
      return "body_too_small";
    }
  }

  if (exerciseType === "crunch") {
    const bodyDistance = distance(points.Shoulder, points.Knee);
    if (bodyDistance < MIN_CRUNCH_BODY_DISTANCE) {
      return "body_too_small";
    }
  }

  return null;
}

function sideName(side: "left" | "right", joint: SideJoint): PoseLandmarkName {
  return `${side}${joint}` as PoseLandmarkName;
}

function missingReasonForJoint(joint: SideJoint) {
  return `missing_${joint.toLowerCase()}`;
}

function isPointInFrame(point: NormalizedLandmark) {
  return (
    point.x >= MIN_FRAME_X &&
    point.x <= MAX_FRAME_X &&
    point.y >= MIN_FRAME_Y &&
    point.y <= MAX_FRAME_Y
  );
}

function distance(first: NormalizedLandmark, second: NormalizedLandmark) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function roundConfidence(confidence: number) {
  return Math.round(confidence * 100) / 100;
}
