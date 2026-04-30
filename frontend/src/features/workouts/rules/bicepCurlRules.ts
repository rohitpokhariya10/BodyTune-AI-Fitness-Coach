import type { WorkoutRuleInput, WorkoutRuleResult } from "@/features/workouts/types";

const BICEP_CURL_DOWN_ELBOW_ANGLE = 145;
const BICEP_CURL_UP_ELBOW_ANGLE = 70;
const UPPER_ARM_STABILITY_ANGLE = 35;

function hasRequiredAngles({ angles }: WorkoutRuleInput) {
  return angles.elbowAngle !== null;
}

export function evaluateBicepCurlRules(
  input: WorkoutRuleInput,
): WorkoutRuleResult {
  const { angles, poseDetected } = input;

  if (!poseDetected || !hasRequiredAngles(input)) {
    return {
      feedback: "Keep your arm visible",
      feedbackTags: ["arm_not_visible"],
      formScore: 0,
      isGoodForm: false,
      phase: "unknown",
    };
  }

  const elbowAngle = angles.elbowAngle ?? 180;
  const upperArmAngle = angles.shoulderAngle;
  const feedbackTags = new Set<string>();
  let phase: WorkoutRuleResult["phase"] = "unknown";
  let formScore = 92;
  let feedback = "Control the curl";

  if (elbowAngle >= BICEP_CURL_DOWN_ELBOW_ANGLE) {
    phase = "down";
  } else if (elbowAngle <= BICEP_CURL_UP_ELBOW_ANGLE) {
    phase = "up";
  }

  if (
    typeof upperArmAngle === "number" &&
    upperArmAngle > UPPER_ARM_STABILITY_ANGLE
  ) {
    feedbackTags.add("unstable_upper_arm");
    formScore -= 18;
    feedback = "Keep your upper arm stable";
  }

  if (phase === "up") {
    feedback = feedbackTags.has("unstable_upper_arm")
      ? "Keep your upper arm stable"
      : "Good curl";
  } else if (phase === "down") {
    feedback = feedbackTags.has("unstable_upper_arm")
      ? "Keep your upper arm stable"
      : "Good curl";
  } else if (elbowAngle > BICEP_CURL_UP_ELBOW_ANGLE && elbowAngle <= 110) {
    feedbackTags.add("incomplete_curl");
    formScore = Math.min(formScore, 72);
    feedback = "Curl higher";
  } else if (
    elbowAngle > 110 &&
    elbowAngle < BICEP_CURL_DOWN_ELBOW_ANGLE
  ) {
    feedbackTags.add("incomplete_extension");
    formScore = Math.min(formScore, 75);
    feedback = "Fully extend your arm";
  }

  if (phase === "unknown" && feedbackTags.size === 0) {
    formScore = Math.min(formScore, 75);
  }

  return {
    feedback,
    feedbackTags: [...feedbackTags],
    formScore: Math.max(0, Math.min(100, formScore)),
    isGoodForm: feedbackTags.size === 0 && phase !== "unknown",
    phase,
  };
}
