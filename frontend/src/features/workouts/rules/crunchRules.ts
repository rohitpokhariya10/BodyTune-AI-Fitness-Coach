import type { WorkoutRuleInput, WorkoutRuleResult } from "@/features/workouts/types";

function hasRequiredAngles({ angles }: WorkoutRuleInput) {
  return angles.hipAngle !== null;
}

export function evaluateCrunchRules(input: WorkoutRuleInput): WorkoutRuleResult {
  const { angles, poseDetected } = input;

  if (!poseDetected || !hasRequiredAngles(input)) {
    return {
      feedback: "Keep full body visible",
      feedbackTags: ["unstable_movement"],
      formScore: 0,
      isGoodForm: false,
      phase: "unknown",
    };
  }

  const hipAngle = angles.hipAngle ?? 180;
  const torsoAngle = angles.torsoAngle ?? 0;
  const feedbackTags = new Set<string>();
  let phase: WorkoutRuleResult["phase"] = "unknown";
  let formScore = 100;
  let feedback = "Control the movement";

  if (hipAngle > 135) {
    phase = "down";
  } else if (hipAngle < 115) {
    phase = "up";
  }

  if (torsoAngle > 55) {
    feedbackTags.add("unstable_movement");
    formScore -= 20;
    feedback = "Keep your hips stable";
  }

  if (phase === "up") {
    feedback = feedbackTags.has("unstable_movement")
      ? "Keep your hips stable"
      : "Good crunch";
  } else if (hipAngle >= 115 && hipAngle <= 135) {
    feedbackTags.add("incomplete_crunch");
    formScore -= 25;
    feedback = "Lift your shoulders more";
  }

  if (phase === "unknown") {
    formScore -= 10;
  }

  return {
    feedback,
    feedbackTags: [...feedbackTags],
    formScore: Math.max(0, Math.min(100, formScore)),
    isGoodForm: feedbackTags.size === 0 && phase !== "unknown",
    phase,
  };
}
