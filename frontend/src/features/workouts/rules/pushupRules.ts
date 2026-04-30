import type { WorkoutRuleInput, WorkoutRuleResult } from "@/features/workouts/types";

function hasRequiredAngles({ angles }: WorkoutRuleInput) {
  return angles.elbowAngle !== null && angles.torsoAngle !== null;
}

export function evaluatePushupRules(input: WorkoutRuleInput): WorkoutRuleResult {
  const { angles, poseDetected } = input;

  if (!poseDetected || !hasRequiredAngles(input)) {
    return {
      feedback: "Keep full body visible",
      feedbackTags: ["body_alignment"],
      formScore: 0,
      isGoodForm: false,
      phase: "unknown",
    };
  }

  const elbowAngle = angles.elbowAngle ?? 180;
  const torsoAngle = angles.torsoAngle ?? 0;
  const feedbackTags = new Set<string>();
  let phase: WorkoutRuleResult["phase"] = "unknown";
  let formScore = 100;
  let feedback = "Control the movement";

  if (elbowAngle > 150) {
    phase = "up";
  } else if (elbowAngle < 100) {
    phase = "down";
  }

  if (torsoAngle > 22) {
    feedbackTags.add("body_alignment");
    formScore -= 30;
    feedback = "Keep your body in one line";
  }

  if (phase === "down") {
    feedback = feedbackTags.has("body_alignment")
      ? "Keep your body in one line"
      : "Good push-up";
  } else if (elbowAngle >= 100 && elbowAngle <= 130) {
    feedbackTags.add("incomplete_depth");
    formScore -= 25;
    feedback = "Lower your body more";
  } else if (elbowAngle > 130 && elbowAngle <= 150) {
    feedbackTags.add("incomplete_extension");
    formScore -= 20;
    feedback = "Fully extend your arms";
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
