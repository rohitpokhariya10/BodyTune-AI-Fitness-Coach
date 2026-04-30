import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

import { calculateAngle, calculateSegmentAngle } from "./angleUtils";
import {
  chooseVisibleSide,
  getLandmarkPoint,
  getMidpoint,
  type PoseLandmarkName,
} from "./landmarks";

export type ExerciseType = "squat" | "push_up" | "crunch" | "bicep_curl";

export type PoseAngles = {
  kneeAngle: number | null;
  hipAngle: number | null;
  elbowAngle: number | null;
  torsoAngle: number | null;
  shoulderAngle: number | null;
};

export type PoseAngleKey = keyof PoseAngles;

export type PoseAngleReasons = Record<PoseAngleKey, string | null>;

export type PoseAngleDebug = {
  angles: PoseAngles;
  reasons: PoseAngleReasons;
  visibleSide: "left" | "right";
};

const emptyAngles: PoseAngles = {
  kneeAngle: null,
  hipAngle: null,
  elbowAngle: null,
  torsoAngle: null,
  shoulderAngle: null,
};

const emptyReasons: PoseAngleReasons = {
  kneeAngle: "no_pose_detected",
  hipAngle: "no_pose_detected",
  elbowAngle: "no_pose_detected",
  torsoAngle: "no_pose_detected",
  shoulderAngle: "no_pose_detected",
};

const ANGLE_VISIBILITY_THRESHOLD = 0.35;

function sideName(
  side: "left" | "right",
  joint: "Shoulder" | "Elbow" | "Wrist" | "Hip" | "Knee" | "Ankle",
): PoseLandmarkName {
  return `${side}${joint}` as PoseLandmarkName;
}

export function calculateSquatAngles(
  landmarks: NormalizedLandmark[],
): PoseAngles {
  return calculateSquatAngleDebug(landmarks).angles;
}

export function calculateSquatAngleDebug(
  landmarks: NormalizedLandmark[],
  preferredSide?: "left" | "right",
): PoseAngleDebug {
  const side =
    preferredSide ??
    chooseVisibleSide(
      landmarks,
      ["leftShoulder", "leftHip", "leftKnee", "leftAnkle"],
      ["rightShoulder", "rightHip", "rightKnee", "rightAnkle"],
    );

  const shoulder = getLandmarkPoint(
    landmarks,
    sideName(side, "Shoulder"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const elbow = getLandmarkPoint(
    landmarks,
    sideName(side, "Elbow"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const wrist = getLandmarkPoint(
    landmarks,
    sideName(side, "Wrist"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const hip = getLandmarkPoint(
    landmarks,
    sideName(side, "Hip"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const knee = getLandmarkPoint(
    landmarks,
    sideName(side, "Knee"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const ankle = getLandmarkPoint(
    landmarks,
    sideName(side, "Ankle"),
    ANGLE_VISIBILITY_THRESHOLD,
  );

  const angles = {
    kneeAngle: calculateAngle(hip, knee, ankle),
    hipAngle: calculateAngle(shoulder, hip, knee),
    elbowAngle: calculateAngle(shoulder, elbow, wrist),
    torsoAngle: calculateSegmentAngle(shoulder, hip, "vertical"),
    shoulderAngle: calculateAngle(elbow, shoulder, hip),
  };

  return {
    angles,
    reasons: buildReasons(angles, {
      kneeAngle: "invalid_knee_angle",
      hipAngle: "missing_hip",
      elbowAngle: "missing_shoulder",
      torsoAngle: "missing_shoulder",
      shoulderAngle: "missing_shoulder",
    }),
    visibleSide: side,
  };
}

export function calculatePushupAngles(
  landmarks: NormalizedLandmark[],
): PoseAngles {
  return calculatePushupAngleDebug(landmarks).angles;
}

export function calculatePushupAngleDebug(
  landmarks: NormalizedLandmark[],
  preferredSide?: "left" | "right",
): PoseAngleDebug {
  const side =
    preferredSide ??
    chooseVisibleSide(
      landmarks,
      ["leftShoulder", "leftElbow", "leftWrist", "leftHip"],
      ["rightShoulder", "rightElbow", "rightWrist", "rightHip"],
    );

  const shoulder = getLandmarkPoint(
    landmarks,
    sideName(side, "Shoulder"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const elbow = getLandmarkPoint(
    landmarks,
    sideName(side, "Elbow"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const wrist = getLandmarkPoint(
    landmarks,
    sideName(side, "Wrist"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const hip = getLandmarkPoint(
    landmarks,
    sideName(side, "Hip"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const knee = getLandmarkPoint(
    landmarks,
    sideName(side, "Knee"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const ankle = getLandmarkPoint(
    landmarks,
    sideName(side, "Ankle"),
    ANGLE_VISIBILITY_THRESHOLD,
  );

  const angles = {
    kneeAngle: calculateAngle(hip, knee, ankle),
    hipAngle: calculateAngle(shoulder, hip, knee),
    elbowAngle: calculateAngle(shoulder, elbow, wrist),
    torsoAngle: calculateSegmentAngle(shoulder, hip, "horizontal"),
    shoulderAngle: calculateAngle(elbow, shoulder, hip),
  };

  return {
    angles,
    reasons: buildReasons(angles, {
      kneeAngle: "Need hip, knee, and ankle visible",
      hipAngle: "Need shoulder, hip, and knee visible",
      elbowAngle: "Need shoulder, elbow, and wrist visible",
      torsoAngle: "Need shoulder and hip visible",
      shoulderAngle: "Need elbow, shoulder, and hip visible",
    }),
    visibleSide: side,
  };
}

export function calculateCrunchAngles(
  landmarks: NormalizedLandmark[],
): PoseAngles {
  return calculateCrunchAngleDebug(landmarks).angles;
}

export function calculateCrunchAngleDebug(
  landmarks: NormalizedLandmark[],
  preferredSide?: "left" | "right",
): PoseAngleDebug {
  const leftShoulder = getLandmarkPoint(
    landmarks,
    "leftShoulder",
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const rightShoulder = getLandmarkPoint(
    landmarks,
    "rightShoulder",
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const leftHip = getLandmarkPoint(
    landmarks,
    "leftHip",
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const rightHip = getLandmarkPoint(
    landmarks,
    "rightHip",
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const leftKnee = getLandmarkPoint(
    landmarks,
    "leftKnee",
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const rightKnee = getLandmarkPoint(
    landmarks,
    "rightKnee",
    ANGLE_VISIBILITY_THRESHOLD,
  );

  const side =
    preferredSide ??
    chooseVisibleSide(
      landmarks,
      ["leftShoulder", "leftElbow", "leftWrist", "leftHip", "leftKnee"],
      ["rightShoulder", "rightElbow", "rightWrist", "rightHip", "rightKnee"],
    );

  const shoulder = getLandmarkPoint(
    landmarks,
    sideName(side, "Shoulder"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const elbow = getLandmarkPoint(
    landmarks,
    sideName(side, "Elbow"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const wrist = getLandmarkPoint(
    landmarks,
    sideName(side, "Wrist"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const hip = getLandmarkPoint(
    landmarks,
    sideName(side, "Hip"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const knee = getLandmarkPoint(
    landmarks,
    sideName(side, "Knee"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const ankle = getLandmarkPoint(
    landmarks,
    sideName(side, "Ankle"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const midShoulder = getMidpoint(leftShoulder, rightShoulder) ?? shoulder;
  const midHip = getMidpoint(leftHip, rightHip) ?? hip;
  const midKnee = getMidpoint(leftKnee, rightKnee) ?? knee;

  const angles = {
    kneeAngle: calculateAngle(hip, knee, ankle),
    hipAngle: calculateAngle(midShoulder, midHip, midKnee),
    elbowAngle: calculateAngle(shoulder, elbow, wrist),
    torsoAngle: calculateSegmentAngle(midShoulder, midHip, "horizontal"),
    shoulderAngle: calculateAngle(elbow, shoulder, hip),
  };

  return {
    angles,
    reasons: buildReasons(angles, {
      kneeAngle: "Need hip, knee, and ankle visible",
      hipAngle: "Need shoulders, hips, and knees visible",
      elbowAngle: "Need shoulder, elbow, and wrist visible",
      torsoAngle: "Need shoulders and hips visible",
      shoulderAngle: "Need elbow, shoulder, and hip visible",
    }),
    visibleSide: side,
  };
}

export function calculateBicepCurlAngles(
  landmarks: NormalizedLandmark[],
): PoseAngles {
  return calculateBicepCurlAngleDebug(landmarks).angles;
}

export function calculateBicepCurlAngleDebug(
  landmarks: NormalizedLandmark[],
  preferredSide?: "left" | "right",
): PoseAngleDebug {
  const side =
    preferredSide ??
    chooseVisibleSide(
      landmarks,
      ["leftShoulder", "leftElbow", "leftWrist"],
      ["rightShoulder", "rightElbow", "rightWrist"],
    );

  const shoulder = getLandmarkPoint(
    landmarks,
    sideName(side, "Shoulder"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const elbow = getLandmarkPoint(
    landmarks,
    sideName(side, "Elbow"),
    ANGLE_VISIBILITY_THRESHOLD,
  );
  const wrist = getLandmarkPoint(
    landmarks,
    sideName(side, "Wrist"),
    ANGLE_VISIBILITY_THRESHOLD,
  );

  const angles = {
    kneeAngle: null,
    hipAngle: null,
    elbowAngle: calculateAngle(shoulder, elbow, wrist),
    torsoAngle: null,
    shoulderAngle: calculateSegmentAngle(shoulder, elbow, "vertical"),
  };

  return {
    angles,
    reasons: buildReasons(angles, {
      kneeAngle: null,
      hipAngle: null,
      elbowAngle: "arm_not_visible",
      torsoAngle: null,
      shoulderAngle: "arm_not_visible",
    }),
    visibleSide: side,
  };
}

export function calculateExerciseAngles(
  exerciseType: ExerciseType,
  landmarks: NormalizedLandmark[],
): PoseAngles {
  return calculateExerciseAngleDebug(exerciseType, landmarks).angles;
}

export function calculateExerciseAngleDebug(
  exerciseType: ExerciseType,
  landmarks: NormalizedLandmark[],
  preferredSide?: "left" | "right",
): PoseAngleDebug {
  if (landmarks.length === 0) {
    return {
      angles: createEmptyPoseAngles(),
      reasons: createEmptyPoseAngleReasons("no_pose_detected"),
      visibleSide: "left",
    };
  }

  if (exerciseType === "push_up") {
    return calculatePushupAngleDebug(landmarks, preferredSide);
  }

  if (exerciseType === "crunch") {
    return calculateCrunchAngleDebug(landmarks, preferredSide);
  }

  if (exerciseType === "bicep_curl") {
    return calculateBicepCurlAngleDebug(landmarks, preferredSide);
  }

  return calculateSquatAngleDebug(landmarks, preferredSide);
}

export function createEmptyPoseAngles(): PoseAngles {
  return { ...emptyAngles };
}

export function createEmptyPoseAngleReasons(
  reason = "no_pose_detected",
): PoseAngleReasons {
  return {
    kneeAngle: reason,
    hipAngle: reason,
    elbowAngle: reason,
    torsoAngle: reason,
    shoulderAngle: reason,
  };
}

function buildReasons(
  angles: PoseAngles,
  missingReasons: PoseAngleReasons,
): PoseAngleReasons {
  return {
    kneeAngle: angles.kneeAngle === null ? missingReasons.kneeAngle : null,
    hipAngle: angles.hipAngle === null ? missingReasons.hipAngle : null,
    elbowAngle: angles.elbowAngle === null ? missingReasons.elbowAngle : null,
    torsoAngle: angles.torsoAngle === null ? missingReasons.torsoAngle : null,
    shoulderAngle:
      angles.shoulderAngle === null ? missingReasons.shoulderAngle : null,
  };
}
