import { useCallback, useEffect, useState, type FormEvent } from "react";
import { LoaderCircle, Save, UserRound } from "lucide-react";

import { ApiClientError } from "@/shared/api/client";
import { GlassCard } from "@/shared/ui/GlassCard";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import type { ProfileFormState } from "@/shared/types";
import { ActivityHeatmap } from "@/features/activity/components/ActivityHeatmap";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  profileService,
  type UserProfile,
  type UserProfilePayload,
} from "@/features/profile/services/profileService";

const fitnessGoalOptions: Array<{
  label: string;
  value: ProfileFormState["fitness_goal"];
}> = [
  { label: "General fitness", value: "general_fitness" },
  { label: "Strength", value: "strength" },
  { label: "Weight loss", value: "weight_loss" },
  { label: "Mobility", value: "mobility" },
];

const experienceOptions: Array<{
  label: string;
  value: ProfileFormState["experience_level"];
}> = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const profileInputClassName =
  "focus-ring mt-2 h-12 w-full rounded-xl border border-white/10 bg-carbon-950/60 px-4 text-white shadow-inner-glass placeholder:text-white/28 hover:border-white/20 focus:border-primary";

const profileSelectClassName =
  "focus-ring mt-2 h-12 w-full rounded-xl border border-white/10 bg-carbon-950/70 px-4 text-white shadow-inner-glass hover:border-white/20 focus:border-primary";

function formStateFromAuthUser(
  user: ReturnType<typeof useAuth>["user"],
): ProfileFormState {
  const fitnessGoal =
    user?.fitness_goal === "strength" ||
    user?.fitness_goal === "weight_loss" ||
    user?.fitness_goal === "mobility"
      ? user.fitness_goal
      : "general_fitness";
  const experienceLevel =
    user?.experience_level === "intermediate" ||
    user?.experience_level === "advanced"
      ? user.experience_level
      : "beginner";

  return {
    age: user?.age ? String(user.age) : "",
    calorie_goal: "",
    carbs_goal_g: "",
    experience_level: experienceLevel,
    fats_goal_g: "",
    fitness_goal: fitnessGoal,
    height_cm: user?.height_cm ? String(user.height_cm) : "",
    name: user?.name ?? "",
    protein_goal_g: "",
    weight_kg: user?.weight_kg ? String(user.weight_kg) : "",
  };
}

function formStateFromProfile(profile: UserProfile): ProfileFormState {
  return {
    age: profile.age === null ? "" : String(profile.age),
    calorie_goal:
      profile.calorie_goal === null ? "" : String(profile.calorie_goal),
    carbs_goal_g:
      profile.carbs_goal_g === null ? "" : String(profile.carbs_goal_g),
    experience_level: profile.experience_level,
    fats_goal_g: profile.fats_goal_g === null ? "" : String(profile.fats_goal_g),
    fitness_goal: profile.fitness_goal,
    height_cm: profile.height_cm === null ? "" : String(profile.height_cm),
    name: profile.name,
    protein_goal_g:
      profile.protein_goal_g === null ? "" : String(profile.protein_goal_g),
    weight_kg: profile.weight_kg === null ? "" : String(profile.weight_kg),
  };
}

function optionalNumber(value: string): number | null {
  return value.trim() === "" ? null : Number(value);
}

function payloadFromForm(formState: ProfileFormState): UserProfilePayload | null {
  const age = optionalNumber(formState.age);
  const height = optionalNumber(formState.height_cm);
  const weight = optionalNumber(formState.weight_kg);
  const calorieGoal = optionalNumber(formState.calorie_goal);
  const proteinGoal = optionalNumber(formState.protein_goal_g);
  const carbsGoal = optionalNumber(formState.carbs_goal_g);
  const fatsGoal = optionalNumber(formState.fats_goal_g);
  const numericValues = [
    calorieGoal,
    proteinGoal,
    carbsGoal,
    fatsGoal,
  ];

  if (
    !formState.name.trim() ||
    (age !== null && (age < 13 || age > 100)) ||
    (height !== null && (height < 80 || height > 250)) ||
    (weight !== null && (weight < 25 || weight > 300)) ||
    numericValues.some((value) => value !== null && value <= 0) ||
    numericValues.some((value) => value !== null && !Number.isFinite(value))
  ) {
    return null;
  }

  return {
    age,
    calorie_goal: calorieGoal,
    carbs_goal_g: carbsGoal,
    experience_level: formState.experience_level,
    fats_goal_g: fatsGoal,
    fitness_goal: formState.fitness_goal,
    height_cm: height,
    name: formState.name.trim(),
    protein_goal_g: proteinGoal,
    weight_kg: weight,
  };
}

export default function ProfilePage() {
  const auth = useAuth();
  const [formState, setFormState] = useState<ProfileFormState>(() =>
    formStateFromAuthUser(auth.user),
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const profile = await profileService.getMe();
      setFormState(formStateFromProfile(profile));
    } catch (caughtError) {
      setFormState(formStateFromAuthUser(auth.user));
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Unable to load profile data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [auth.user]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  function updateField<Field extends keyof ProfileFormState>(
    field: Field,
    value: ProfileFormState[Field],
  ) {
    setFormState((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const payload = payloadFromForm(formState);
    if (!payload) {
      setError("Please enter valid profile numbers.");
      return;
    }

    setIsSaving(true);
    try {
      const profile = await profileService.updateMe(payload);
      setFormState(formStateFromProfile(profile));
      auth.updateUser({
        age: profile.age,
        experience_level: profile.experience_level,
        fitness_goal: profile.fitness_goal,
        height_cm: profile.height_cm,
        name: profile.name,
        weight_kg: profile.weight_kg,
      });
      await loadProfile();
      setSuccess("Profile saved.");
    } catch (caughtError) {
      setError(
        caughtError instanceof ApiClientError
          ? caughtError.message
          : "Profile save failed.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="app-page">
      <PageHeader
        description="Keep training goals, body metrics, and experience level ready for personalized coaching."
        eyebrow="Profile"
        title="Training profile"
      />

      <GlassCard className="bento-card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <UserRound aria-hidden="true" className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-white">Profile details</h2>
            <p className="mt-1 text-sm text-white/52">Personal coaching baseline</p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-8 flex min-h-40 items-center justify-center gap-3 text-sm font-semibold text-white/62">
            <LoaderCircle className="h-5 w-5 animate-spin text-primary" />
            Loading profile
          </div>
        ) : (
        <form className="mt-8 grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
          {error ? (
            <div className="rounded-2xl border border-ember-400/25 bg-ember-400/10 p-4 text-sm text-ember-400 md:col-span-2">
              {error}
            </div>
          ) : null}
          {success ? (
            <div className="rounded-2xl border border-volt-400/25 bg-volt-400/10 p-4 text-sm text-volt-400 md:col-span-2">
              {success}
            </div>
          ) : null}
          <label className="block">
            <span className="text-sm font-medium text-white/70">Name</span>
            <input
              className={profileInputClassName}
              onChange={(event) => updateField("name", event.target.value)}
              type="text"
              value={formState.name}
            />
          </label>

          <div className="md:col-span-2">
            <h3 className="text-base font-semibold text-white">Nutrition goals</h3>
            <p className="mt-1 text-sm text-white/52">
              Leave these blank until you want dashboard targets.
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-white/70">
              Daily calorie goal
            </span>
            <input
              className={profileInputClassName}
              onChange={(event) => updateField("calorie_goal", event.target.value)}
              type="number"
              value={formState.calorie_goal}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-white/70">Protein goal g</span>
            <input
              className={profileInputClassName}
              onChange={(event) => updateField("protein_goal_g", event.target.value)}
              type="number"
              value={formState.protein_goal_g}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-white/70">Carbs goal g</span>
            <input
              className={profileInputClassName}
              onChange={(event) => updateField("carbs_goal_g", event.target.value)}
              type="number"
              value={formState.carbs_goal_g}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-white/70">Fats goal g</span>
            <input
              className={profileInputClassName}
              onChange={(event) => updateField("fats_goal_g", event.target.value)}
              type="number"
              value={formState.fats_goal_g}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-white/70">Age</span>
            <input
              className={profileInputClassName}
              onChange={(event) => updateField("age", event.target.value)}
              type="number"
              value={formState.age}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-white/70">Height cm</span>
            <input
              className={profileInputClassName}
              onChange={(event) => updateField("height_cm", event.target.value)}
              type="number"
              value={formState.height_cm}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-white/70">Weight kg</span>
            <input
              className={profileInputClassName}
              onChange={(event) => updateField("weight_kg", event.target.value)}
              type="number"
              value={formState.weight_kg}
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-white/70">Fitness goal</span>
            <select
              className={profileSelectClassName}
              onChange={(event) =>
                updateField(
                  "fitness_goal",
                  event.target.value as ProfileFormState["fitness_goal"],
                )
              }
              value={formState.fitness_goal}
            >
              {fitnessGoalOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-white/70">
              Experience level
            </span>
            <select
              className={profileSelectClassName}
              onChange={(event) =>
                updateField(
                  "experience_level",
                  event.target.value as ProfileFormState["experience_level"],
                )
              }
              value={formState.experience_level}
            >
              {experienceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex justify-end md:col-span-2">
            <PremiumButton disabled={isSaving} icon={isSaving ? LoaderCircle : Save} type="submit">
              {isSaving ? "Saving" : "Save profile"}
            </PremiumButton>
          </div>
        </form>
        )}
      </GlassCard>

      <section className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-white">Consistency Map</h2>
          <p className="mt-1 text-sm text-white/52">
            A compact look at the effort behind your current profile.
          </p>
        </div>
        <ActivityHeatmap compact days={120} title="Recent Activity" />
      </section>
    </div>
  );
}
