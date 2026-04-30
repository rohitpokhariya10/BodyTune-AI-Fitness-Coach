import {
  FilesetResolver,
  PoseLandmarker,
  type NormalizedLandmark,
} from "@mediapipe/tasks-vision";
import { useEffect, useRef, useState, type RefObject } from "react";

import { clearPoseCanvas, drawPoseLandmarks, resizeCanvasToVideo } from "@/features/workouts/services/pose/drawing";
import {
  calculateExerciseAngleDebug,
  createEmptyPoseAngleReasons,
  createEmptyPoseAngles,
  type ExerciseType,
  type PoseAngleKey,
  type PoseAngleReasons,
  type PoseAngles,
} from "@/features/workouts/services/pose/exerciseAngles";
import {
  createInvalidPoseValidation,
  isValidExercisePose,
  type PoseSelectedSide,
  type PoseValidationResult,
} from "@/features/workouts/services/pose/poseValidation";

type PoseDetectionStatus = "idle" | "loading" | "ready" | "running" | "error";

type UsePoseDetectionArgs = {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  exerciseType: ExerciseType;
  videoRef: RefObject<HTMLVideoElement | null>;
};

const MEDIAPIPE_VERSION = "0.10.34";
const WASM_ASSET_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task";
const METRIC_UPDATE_INTERVAL_MS = 140;
const ANGLE_SMOOTHING_WINDOW = 4;
const angleKeys: PoseAngleKey[] = [
  "kneeAngle",
  "hipAngle",
  "elbowAngle",
  "torsoAngle",
  "shoulderAngle",
];

async function createPoseLandmarker(delegate: "GPU" | "CPU") {
  const vision = await FilesetResolver.forVisionTasks(WASM_ASSET_URL);

  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      delegate,
      modelAssetPath: POSE_MODEL_URL,
    },
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    numPoses: 1,
    outputSegmentationMasks: false,
    runningMode: "VIDEO",
  });
}

function getPrimaryLandmarks(
  landmarks: NormalizedLandmark[][],
): NormalizedLandmark[] {
  return landmarks[0] ?? [];
}

export function usePoseDetection({
  canvasRef,
  enabled,
  exerciseType,
  videoRef,
}: UsePoseDetectionArgs) {
  const animationFrameRef = useRef<number | null>(null);
  const exerciseTypeRef = useRef<ExerciseType>(exerciseType);
  const lastMetricUpdateRef = useRef(0);
  const lastPoseDetectedRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const smoothingRef = useRef<Record<PoseAngleKey, number[]>>({
    elbowAngle: [],
    hipAngle: [],
    kneeAngle: [],
    shoulderAngle: [],
    torsoAngle: [],
  });
  const [angles, setAngles] = useState<PoseAngles>(() => createEmptyPoseAngles());
  const [angleReasons, setAngleReasons] = useState<PoseAngleReasons>(() =>
    createEmptyPoseAngleReasons("no_pose_detected"),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [poseDetected, setPoseDetected] = useState(false);
  const [poseValidation, setPoseValidation] = useState<PoseValidationResult>(() =>
    createInvalidPoseValidation("no_pose_detected", exerciseType),
  );
  const [status, setStatus] = useState<PoseDetectionStatus>("idle");
  const [visibleSide, setVisibleSide] = useState<PoseSelectedSide>("unknown");

  function resetSmoothing() {
    smoothingRef.current = {
      elbowAngle: [],
      hipAngle: [],
      kneeAngle: [],
      shoulderAngle: [],
      torsoAngle: [],
    };
  }

  function smoothAngles(nextAngles: PoseAngles): PoseAngles {
    const smoothed = { ...nextAngles };

    for (const key of angleKeys) {
      const value = nextAngles[key];

      if (value === null) {
        smoothingRef.current[key] = [];
        smoothed[key] = null;
        continue;
      }

      const history = [...smoothingRef.current[key], value].slice(
        -ANGLE_SMOOTHING_WINDOW,
      );
      smoothingRef.current[key] = history;
      smoothed[key] = Math.round(
        history.reduce((total, angle) => total + angle, 0) / history.length,
      );
    }

    return smoothed;
  }

  useEffect(() => {
    exerciseTypeRef.current = exerciseType;
    resetSmoothing();
    setPoseValidation(createInvalidPoseValidation("no_pose_detected", exerciseType));
  }, [exerciseType]);

  useEffect(() => {
    if (!enabled) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      poseLandmarkerRef.current?.close();
      poseLandmarkerRef.current = null;
      clearPoseCanvas(canvasRef.current);
      lastPoseDetectedRef.current = false;
      resetSmoothing();
      setPoseDetected(false);
      setPoseValidation(createInvalidPoseValidation("no_pose_detected", exerciseTypeRef.current));
      setVisibleSide("unknown");
      setAngles(createEmptyPoseAngles());
      setAngleReasons(createEmptyPoseAngleReasons("no_pose_detected"));
      setStatus("idle");
      return undefined;
    }

    let isCancelled = false;

    async function initializePoseDetection() {
      setStatus("loading");
      setErrorMessage(null);

      try {
        let poseLandmarker: PoseLandmarker;

        try {
          poseLandmarker = await createPoseLandmarker("GPU");
        } catch {
          poseLandmarker = await createPoseLandmarker("CPU");
        }

        if (isCancelled) {
          poseLandmarker.close();
          return;
        }

        poseLandmarkerRef.current = poseLandmarker;
        setStatus("ready");

        const detectFrame = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          const landmarker = poseLandmarkerRef.current;

          if (!video || !canvas || !landmarker || isCancelled) {
            return;
          }

          if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
            resizeCanvasToVideo(canvas, video);

            if (video.currentTime !== lastVideoTimeRef.current) {
              lastVideoTimeRef.current = video.currentTime;

              const result = landmarker.detectForVideo(video, performance.now());
              const primaryLandmarks = getPrimaryLandmarks(result.landmarks);
              const nextPoseDetected = primaryLandmarks.length > 0;

              if (nextPoseDetected) {
                drawPoseLandmarks(canvas, primaryLandmarks);
              } else {
                clearPoseCanvas(canvas);
              }

              if (nextPoseDetected !== lastPoseDetectedRef.current) {
                lastPoseDetectedRef.current = nextPoseDetected;
                setPoseDetected(nextPoseDetected);
              }

              const now = performance.now();
              if (now - lastMetricUpdateRef.current >= METRIC_UPDATE_INTERVAL_MS) {
                lastMetricUpdateRef.current = now;
                if (nextPoseDetected) {
                  const nextPoseValidation = isValidExercisePose(
                    primaryLandmarks,
                    exerciseTypeRef.current,
                  );
                  setPoseValidation(nextPoseValidation);
                  setVisibleSide(nextPoseValidation.selectedSide);

                  if (nextPoseValidation.isValid) {
                    const selectedSide =
                      nextPoseValidation.selectedSide === "unknown"
                        ? undefined
                        : nextPoseValidation.selectedSide;
                    const angleDebug = calculateExerciseAngleDebug(
                      exerciseTypeRef.current,
                      primaryLandmarks,
                      selectedSide,
                    );
                    setAngles(smoothAngles(angleDebug.angles));
                    setAngleReasons(angleDebug.reasons);
                  } else {
                    resetSmoothing();
                    setAngles(createEmptyPoseAngles());
                    setAngleReasons(
                      createEmptyPoseAngleReasons(nextPoseValidation.reason),
                    );
                  }
                } else {
                  resetSmoothing();
                  setPoseValidation(
                    createInvalidPoseValidation(
                      "no_pose_detected",
                      exerciseTypeRef.current,
                    ),
                  );
                  setVisibleSide("unknown");
                  setAngles(createEmptyPoseAngles());
                  setAngleReasons(createEmptyPoseAngleReasons("no_pose_detected"));
                }
                setStatus("running");
              }
            }
          }

          animationFrameRef.current = requestAnimationFrame(detectFrame);
        };

        animationFrameRef.current = requestAnimationFrame(detectFrame);
      } catch (error) {
        if (!isCancelled) {
          setStatus("error");
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to initialize pose detection.",
          );
        }
      }
    }

    void initializePoseDetection();

    return () => {
      isCancelled = true;

      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }

      poseLandmarkerRef.current?.close();
      poseLandmarkerRef.current = null;
      clearPoseCanvas(canvasRef.current);
    };
  }, [canvasRef, enabled, videoRef]);

  return {
    angles,
    angleReasons,
    errorMessage,
    poseDetected,
    poseValidation,
    status,
    visibleSide,
  };
}
