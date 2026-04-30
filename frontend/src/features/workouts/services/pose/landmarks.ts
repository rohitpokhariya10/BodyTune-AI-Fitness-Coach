import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type LandmarkPoint = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type PoseLandmarkName =
  | "nose"
  | "leftShoulder"
  | "rightShoulder"
  | "leftElbow"
  | "rightElbow"
  | "leftWrist"
  | "rightWrist"
  | "leftHip"
  | "rightHip"
  | "leftKnee"
  | "rightKnee"
  | "leftAnkle"
  | "rightAnkle";

export const POSE_LANDMARK_INDEX: Record<PoseLandmarkName, number> = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
};

export const DEFAULT_VISIBILITY_THRESHOLD = 0.45;

export function getLandmarkPoint(
  landmarks: NormalizedLandmark[],
  landmark: PoseLandmarkName | number,
  minVisibility = DEFAULT_VISIBILITY_THRESHOLD,
): LandmarkPoint | null {
  const index =
    typeof landmark === "number" ? landmark : POSE_LANDMARK_INDEX[landmark];
  const point = landmarks[index];

  if (!point) {
    return null;
  }

  if (
    typeof point.visibility === "number" &&
    point.visibility < minVisibility
  ) {
    return null;
  }

  return {
    x: point.x,
    y: point.y,
    z: point.z,
    visibility: point.visibility,
  };
}

export function getMidpoint(
  first: LandmarkPoint | null,
  second: LandmarkPoint | null,
): LandmarkPoint | null {
  if (!first || !second) {
    return null;
  }

  return {
    x: (first.x + second.x) / 2,
    y: (first.y + second.y) / 2,
    z:
      typeof first.z === "number" && typeof second.z === "number"
        ? (first.z + second.z) / 2
        : undefined,
    visibility:
      typeof first.visibility === "number" &&
      typeof second.visibility === "number"
        ? Math.min(first.visibility, second.visibility)
        : undefined,
  };
}

export function getAverageVisibility(
  landmarks: NormalizedLandmark[],
  names: PoseLandmarkName[],
): number {
  const visible = names
    .map((name) => landmarks[POSE_LANDMARK_INDEX[name]]?.visibility ?? 1)
    .filter((visibility) => typeof visibility === "number");

  if (visible.length === 0) {
    return 0;
  }

  return (
    visible.reduce((total, visibility) => total + visibility, 0) /
    visible.length
  );
}

export function chooseVisibleSide(
  landmarks: NormalizedLandmark[],
  leftNames: PoseLandmarkName[],
  rightNames: PoseLandmarkName[],
): "left" | "right" {
  const leftVisibility = getAverageVisibility(landmarks, leftNames);
  const rightVisibility = getAverageVisibility(landmarks, rightNames);

  return leftVisibility >= rightVisibility ? "left" : "right";
}
