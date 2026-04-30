import type { WorkoutRuleInput, WorkoutRuleResult } from "@/features/workouts/types";

const SQUAT_UP_KNEE_ANGLE = 145;
const SQUAT_DOWN_KNEE_ANGLE = 125;

function hasRequiredAngles({ angles }: WorkoutRuleInput) {
  return angles.kneeAngle !== null;
}

export function evaluateSquatRules(input: WorkoutRuleInput): WorkoutRuleResult {
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

  const kneeAngle = angles.kneeAngle ?? 180;
  const torsoAngle = angles.torsoAngle ?? 0;
  const feedbackTags = new Set<string>();
  let phase: WorkoutRuleResult["phase"] = "unknown";
  let formScore = 100;
  let feedback = "Control the movement";

  if (kneeAngle >= SQUAT_UP_KNEE_ANGLE) {
    phase = "up";
  } else if (kneeAngle <= SQUAT_DOWN_KNEE_ANGLE) {
    phase = "down";
  }

  if (torsoAngle > 30) {
    feedbackTags.add("back_alignment");
    formScore -= 25;
    feedback = "Keep your torso stable";
  }

  if (phase === "down") {
    feedback = feedbackTags.has("back_alignment")
      ? "Keep your torso stable"
      : "Good squat depth";
  } else if (
    kneeAngle > SQUAT_DOWN_KNEE_ANGLE &&
    kneeAngle < SQUAT_UP_KNEE_ANGLE
  ) {
    feedbackTags.add("shallow_depth");
    formScore -= 25;
    feedback = "Bend your knees more";
  }

  if (phase === "unknown") {
    feedbackTags.add("unstable_movement");
    formScore -= 15;
  }

  return {
    feedback,
    feedbackTags: [...feedbackTags],
    formScore: Math.max(0, Math.min(100, formScore)),
    isGoodForm: feedbackTags.size === 0 && phase !== "unknown",
    phase,
  };
}
