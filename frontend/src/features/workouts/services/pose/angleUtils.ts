import type { LandmarkPoint } from "./landmarks";

function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateAngle(
  a: LandmarkPoint | null,
  b: LandmarkPoint | null,
  c: LandmarkPoint | null,
): number | null {
  if (!a || !b || !c) {
    return null;
  }

  const ab = {
    x: a.x - b.x,
    y: a.y - b.y,
  };
  const cb = {
    x: c.x - b.x,
    y: c.y - b.y,
  };

  const dotProduct = ab.x * cb.x + ab.y * cb.y;
  const abMagnitude = Math.hypot(ab.x, ab.y);
  const cbMagnitude = Math.hypot(cb.x, cb.y);

  if (abMagnitude === 0 || cbMagnitude === 0) {
    return null;
  }

  const cosine = clamp(dotProduct / (abMagnitude * cbMagnitude), -1, 1);
  return roundAngle(toDegrees(Math.acos(cosine)));
}

export function calculateSegmentAngle(
  a: LandmarkPoint | null,
  b: LandmarkPoint | null,
  relativeTo: "horizontal" | "vertical" = "vertical",
): number | null {
  if (!a || !b) {
    return null;
  }

  const deltaX = b.x - a.x;
  const deltaY = b.y - a.y;

  if (deltaX === 0 && deltaY === 0) {
    return null;
  }

  const angleFromHorizontal = Math.abs(toDegrees(Math.atan2(deltaY, deltaX)));
  const normalizedHorizontal =
    angleFromHorizontal > 180 ? 360 - angleFromHorizontal : angleFromHorizontal;

  if (relativeTo === "horizontal") {
    return roundAngle(Math.min(normalizedHorizontal, 180 - normalizedHorizontal));
  }

  return roundAngle(Math.abs(90 - normalizedHorizontal));
}

export function roundAngle(angle: number): number {
  return Math.round(angle);
}
