import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [11, 23],
  [12, 24],
  [23, 24],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
];

function isVisible(point: NormalizedLandmark | undefined): point is NormalizedLandmark {
  return Boolean(point && (point.visibility ?? 1) >= 0.35);
}

export function resizeCanvasToVideo(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
): void {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) {
    return;
  }

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

export function clearPoseCanvas(canvas: HTMLCanvasElement | null): void {
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  context?.clearRect(0, 0, canvas.width, canvas.height);
}

export function drawPoseLandmarks(
  canvas: HTMLCanvasElement,
  landmarks: NormalizedLandmark[],
): void {
  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);

  context.lineCap = "round";
  context.lineJoin = "round";
  context.lineWidth = Math.max(3, canvas.width * 0.004);
  context.strokeStyle = "rgba(69, 225, 208, 0.86)";

  for (const [startIndex, endIndex] of POSE_CONNECTIONS) {
    const start = landmarks[startIndex];
    const end = landmarks[endIndex];

    if (!isVisible(start) || !isVisible(end)) {
      continue;
    }

    context.beginPath();
    context.moveTo(start.x * canvas.width, start.y * canvas.height);
    context.lineTo(end.x * canvas.width, end.y * canvas.height);
    context.stroke();
  }

  for (const point of landmarks) {
    if (!isVisible(point)) {
      continue;
    }

    const radius = Math.max(3, canvas.width * 0.006);
    const x = point.x * canvas.width;
    const y = point.y * canvas.height;

    context.beginPath();
    context.fillStyle = "rgba(200, 255, 61, 0.96)";
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
    context.lineWidth = 2;
    context.strokeStyle = "rgba(5, 6, 7, 0.72)";
    context.stroke();
  }
}
