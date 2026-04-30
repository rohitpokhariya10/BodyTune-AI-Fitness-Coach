import { useCallback, useEffect, useRef, useState } from "react";

export type CameraStatus =
  | "not_started"
  | "requesting_permission"
  | "active"
  | "denied"
  | "error";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("not_started");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSupported = Boolean(
    navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setErrorMessage(null);
    setStatus("not_started");
  }, []);

  const startCamera = useCallback(async () => {
    if (!isSupported) {
      setStatus("error");
      setErrorMessage("Camera access is not available in this browser.");
      return;
    }

    if (!videoRef.current) {
      setStatus("error");
      setErrorMessage("Camera preview is not ready yet.");
      return;
    }

    setStatus("requesting_permission");
    setErrorMessage(null);

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;

      await videoRef.current.play();
      setStatus("active");
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setStatus("denied");
        setErrorMessage(
          "Camera permission was denied. Allow camera access in your browser settings and try again.",
        );
        return;
      }

      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to start the camera. Check that a camera is connected.",
      );
    }
  }, [isSupported]);

  useEffect(() => stopCamera, [stopCamera]);

  return {
    errorMessage,
    isSupported,
    startCamera,
    status,
    stopCamera,
    videoRef,
  };
}
