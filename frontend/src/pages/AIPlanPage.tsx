import {
  AlertTriangle,
  Brain,
  CalendarDays,
  Download,
  Droplets,
  Dumbbell,
  Flame,
  LoaderCircle,
  RefreshCw,
  Save,
  Sparkles,
  Target,
  Trash2,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { aiPlanService } from "@/features/ai-plan/services/aiPlanService";
import { downloadPlanPdf } from "@/features/ai-plan/services/planPdf";
import type {
  AIPlan,
  AIPlanGenerateInput,
  ActivityLevel,
  BudgetMode,
  DietType,
  ExperienceLevel,
  FitnessGoal,
  Gender,
  PlanDuration,
  WorkoutLocation,
} from "@/features/ai-plan/types";
import { GlassCard } from "@/shared/ui/GlassCard";
import { Input } from "@/shared/ui/Input";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { Select } from "@/shared/ui/Select";
import { Toast } from "@/shared/ui/Toast";
import { cn } from "@/shared/utils";

type Option<T extends string | number> = {
  label: string;
  value: T;
};

const goalOptions: Option<FitnessGoal>[] = [
  { label: "Fat loss", value: "fat_loss" },
  { label: "Muscle gain", value: "muscle_gain" },
  { label: "Strength", value: "strength" },
  { label: "Endurance", value: "endurance" },
  { label: "General fitness", value: "general_fitness" },
];

const genderOptions: Option<Gender>[] = [
  { label: "Prefer not to say", value: "prefer_not_to_say" },
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
  { label: "Other", value: "other" },
];

const budgetOptions: Option<BudgetMode>[] = [
  { label: "Low budget", value: "low" },
  { label: "Medium budget", value: "medium" },
  { label: "High budget", value: "high" },
];

const dietOptions: Option<DietType>[] = [
  { label: "Mixed", value: "mixed" },
  { label: "Vegetarian", value: "vegetarian" },
  { label: "Non vegetarian", value: "non_vegetarian" },
  { label: "Eggetarian", value: "eggetarian" },
  { label: "Vegan", value: "vegan" },
];

const activityOptions: Option<ActivityLevel>[] = [
  { label: "Sedentary", value: "sedentary" },
  { label: "Light", value: "light" },
  { label: "Moderate", value: "moderate" },
  { label: "Active", value: "active" },
];

const experienceOptions: Option<ExperienceLevel>[] = [
  { label: "Beginner", value: "beginner" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Advanced", value: "advanced" },
];

const locationOptions: Option<WorkoutLocation>[] = [
  { label: "Home", value: "home" },
  { label: "Gym", value: "gym" },
  { label: "Mixed", value: "mixed" },
];

const durationOptions: Option<PlanDuration>[] = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

const defaultForm: AIPlanGenerateInput = {
  activity_level: "moderate",
  age: 24,
  allergies_restrictions: "",
  budget: "medium",
  days_per_week: 4,
  diet_type: "mixed",
  duration_days: 7,
  equipment: "Bodyweight, resistance band, dumbbells if available",
  experience_level: "beginner",
  gender: "prefer_not_to_say",
  goal: "general_fitness",
  height_cm: 170,
  meals_per_day: 4,
  medical_note: "",
  monthly_budget: null,
  weight_kg: 70,
  workout_location: "home",
  workout_time_minutes: 45,
};

type TabKey = "nutrition" | "workout" | "tips" | "why";

function labelFromValue(value: string) {
  return value.replace(/_/g, " ");
}

function Field({
  children,
  error,
  hint,
  label,
}: {
  children: ReactNode;
  error?: string;
  hint?: string;
  label: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      {children}
      {error ? <span className="block text-xs font-semibold text-destructive">{error}</span> : null}
      {!error && hint ? <span className="block text-xs leading-relaxed text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function SectionCard({
  children,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  icon: typeof Brain;
  title: string;
}) {
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-black text-foreground">{title}</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </GlassCard>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  note,
  value,
}: {
  icon: typeof Target;
  label: string;
  note?: string;
  value: string;
}) {
  return (
    <div className="min-h-[112px] rounded-xl border border-border bg-card/75 p-4">
      <div className="flex h-full items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{label}</p>
          <p className="mt-1 text-xl font-black text-foreground">{value}</p>
          {note ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{note}</p> : null}
        </div>
      </div>
    </div>
  );
}

function TextArea({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <textarea
      className="focus-ring form-field min-h-[86px] w-full resize-none px-3 py-2 text-sm font-medium text-foreground shadow-inner-glass placeholder:text-muted-foreground/65 hover:border-primary/35 focus:border-primary"
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      value={value}
    />
  );
}

function LoadingPlan() {
  return (
    <GlassCard className="p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin" />
        </div>
        <div>
          <h3 className="text-lg font-black text-foreground">Building your personalized plan...</h3>
          <p className="text-sm text-muted-foreground">Creating nutrition, workout, macros, and recovery guidance.</p>
        </div>
      </div>
    </GlassCard>
  );
}

function PlanResult({
  isExportingPdf,
  isSaved,
  onDownload,
  onGenerateAgain,
  plan,
}: {
  isExportingPdf: boolean;
  isSaved: boolean;
  onDownload: () => void;
  onGenerateAgain: () => void;
  plan: AIPlan;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("nutrition");
  const data = plan.plan_data;
  const tabs: Option<TabKey>[] = [
    { label: "Nutrition", value: "nutrition" },
    { label: "Workout", value: "workout" },
    { label: "Tips", value: "tips" },
    { label: "Why", value: "why" },
  ];

  return (
    <div className="space-y-5">
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h2 className="max-w-2xl text-2xl font-black leading-tight text-foreground">{plan.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {labelFromValue(plan.goal)} plan generated on {new Date(plan.created_at).toLocaleDateString()}.
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            <PremiumButton className="px-4" disabled={isExportingPdf} icon={isExportingPdf ? LoaderCircle : Download} onClick={onDownload} title="Download PDF">
              {isExportingPdf ? "Preparing PDF..." : "Download PDF"}
            </PremiumButton>
            <PremiumButton className="px-4" icon={RefreshCw} onClick={onGenerateAgain} variant="secondary">
              Generate again
            </PremiumButton>
            <PremiumButton className="px-4" icon={Save} variant="ghost" disabled>
              {isSaved ? "Saved" : "Generated"}
            </PremiumButton>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-3">
          <SummaryTile icon={Flame} label="Calories" value={`${data.summary.calories_per_day}`} />
          <SummaryTile icon={Utensils} label="Protein" value={`${data.macros.protein_g}g`} />
          <SummaryTile icon={Brain} label="Carbs" value={`${data.macros.carbs_g}g`} />
          <SummaryTile icon={Droplets} label="Fats" value={`${data.macros.fats_g}g`} />
          <SummaryTile
            icon={Droplets}
            label="Hydration"
            note="Body weight + activity + workout time"
            value={`${data.hydration.liters_per_day}L`}
          />
          <SummaryTile icon={CalendarDays} label="Duration" value={`${plan.duration_days}d`} />
        </div>
        <div className="mt-3">
          {data.personalization_reasons?.length ? (
            <div className="rounded-xl border border-border bg-card/75 p-4">
              <h3 className="font-black text-foreground">Why this plan fits you</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {data.personalization_reasons.slice(0, 5).map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <div className="flex flex-wrap gap-2 border-b border-border pb-4">
          {tabs.map((tab) => (
            <button
              className={cn(
                "focus-ring rounded-xl px-4 py-2 text-sm font-bold transition",
                activeTab === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "nutrition" ? (
          <div className="mt-5 space-y-5">
            <div className="rounded-xl border border-border bg-card/70 p-4">
              <h3 className="font-black text-foreground">Daily targets</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {data.summary.calories_per_day} calories/day, {data.macros.protein_g}g protein, {data.macros.carbs_g}g carbs,
                {" "}{data.macros.fats_g}g fats, and {data.hydration.liters_per_day}L water/day.
              </p>
              {data.summary.calorie_note ? (
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{data.summary.calorie_note}</p>
              ) : null}
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{data.hydration.note}</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {data.meals.map((meal) => (
                <div className="rounded-xl border border-border bg-card/70 p-4" key={meal.meal}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-black text-foreground">{meal.meal}</h3>
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                      {meal.target_calories} kcal
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{meal.foods.join(", ")}</p>
                  {meal.protein_g || meal.carbs_g || meal.fats_g ? (
                    <p className="mt-2 text-xs font-semibold text-muted-foreground">
                      Approx macros: {meal.protein_g ?? 0}g protein / {meal.carbs_g ?? 0}g carbs / {meal.fats_g ?? 0}g fats
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{meal.note}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-xl border border-border bg-card/70 p-4">
                <h3 className="font-black text-foreground">Vitamins and minerals</h3>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {data.vitamins_minerals.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-card/70 p-4">
                <h3 className="font-black text-foreground">Budget-friendly foods</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.budget_foods.map((food) => (
                    <span className="rounded-lg border border-border bg-muted px-3 py-1 text-xs font-bold text-muted-foreground" key={food}>
                      {food}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "workout" ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {data.workouts.map((day) => (
              <div className="rounded-xl border border-border bg-card/70 p-4" key={day.day}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">Day {day.day}</p>
                    <h3 className="mt-1 font-black text-foreground">{day.title}</h3>
                  </div>
                  <span className="rounded-lg border border-border bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">
                    {day.duration_minutes} min
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  {day.exercises.map((exercise) => (
                    <div className="rounded-lg bg-background/35 px-3 py-2" key={`${day.day}-${exercise.name}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-foreground">{exercise.name}</p>
                        <p className="text-xs font-bold text-muted-foreground">
                          {exercise.sets} x {exercise.reps} / {exercise.rest_seconds}s
                        </p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{exercise.note}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeTab === "tips" ? (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card/70 p-4">
              <h3 className="font-black text-foreground">Recovery</h3>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                {data.recovery_tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card/70 p-4">
              <h3 className="font-black text-foreground">Hydration</h3>
              <p className="mt-3 text-2xl font-black text-primary">{data.hydration.liters_per_day}L/day</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{data.hydration.note}</p>
            </div>
            <div className="rounded-xl border border-border bg-card/70 p-4 lg:col-span-2">
              <div className="flex gap-3">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h3 className="font-black text-foreground">Safety disclaimer</h3>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-muted-foreground">
                    {data.safety_notes.map((note) => (
                      <li key={note}>{note}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "why" ? (
          <div className="mt-5 rounded-xl border border-border bg-card/70 p-4">
            <h3 className="font-black text-foreground">Why this plan fits you</h3>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
              {(data.personalization_reasons?.length
                ? data.personalization_reasons
                : ["This plan uses your body details, diet preference, schedule, and workout setup."]).map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </GlassCard>
    </div>
  );
}

export default function AIPlanPage() {
  const [form, setForm] = useState<AIPlanGenerateInput>(defaultForm);
  const [plans, setPlans] = useState<AIPlan[]>([]);
  const [currentPlan, setCurrentPlan] = useState<AIPlan | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const validation = useMemo(() => {
    const messages: Partial<Record<keyof AIPlanGenerateInput, string>> = {};
    if (form.age < 13 || form.age > 100) messages.age = "Enter an age from 13 to 100.";
    if (form.height_cm < 80 || form.height_cm > 250) messages.height_cm = "Enter height from 80 to 250 cm.";
    if (form.weight_kg < 25 || form.weight_kg > 300) messages.weight_kg = "Enter weight from 25 to 300 kg.";
    if (form.meals_per_day < 2 || form.meals_per_day > 6) messages.meals_per_day = "Choose 2 to 6 meals.";
    if (form.days_per_week < 1 || form.days_per_week > 7) messages.days_per_week = "Choose 1 to 7 days.";
    if (form.workout_time_minutes < 10 || form.workout_time_minutes > 180) {
      messages.workout_time_minutes = "Choose 10 to 180 minutes.";
    }
    return messages;
  }, [form]);

  const canGenerate = Object.keys(validation).length === 0 && [7, 14, 30].includes(form.duration_days);

  const loadPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const savedPlans = await aiPlanService.list();
      setPlans(savedPlans);
      setCurrentPlan((existing) => existing ?? savedPlans[0] ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load saved plans.");
    } finally {
      setIsLoadingPlans(false);
    }
  };

  useEffect(() => {
    void loadPlans();
  }, []);

  const updateForm = <K extends keyof AIPlanGenerateInput>(
    key: K,
    value: AIPlanGenerateInput[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleNumberChange =
    (key: keyof Pick<AIPlanGenerateInput, "age" | "height_cm" | "weight_kg" | "monthly_budget" | "meals_per_day" | "days_per_week" | "workout_time_minutes">) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value === "" ? 0 : Number(event.target.value);
      updateForm(key, key === "monthly_budget" && value <= 0 ? null : value);
    };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canGenerate) {
      setError("Please fix the highlighted fields before generating your plan.");
      return;
    }

    try {
      setError(null);
      setNotice(null);
      setIsGenerating(true);
      const plan = await aiPlanService.generate(form);
      setCurrentPlan(plan);
      setPlans((current) => [plan, ...current.filter((item) => item.id !== plan.id)]);
      setNotice("Your personalized plan is ready.");
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Could not generate plan. Please check your details and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async (plan: AIPlan | null) => {
    if (!plan) {
      setError("Generate a plan first.");
      return;
    }
    try {
      setError(null);
      setIsExportingPdf(true);
      await downloadPlanPdf(plan);
      setNotice("PDF download started.");
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Could not export PDF. Please try again.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const deletePlan = async (planId: number) => {
    try {
      await aiPlanService.delete(planId);
      setPlans((current) => current.filter((plan) => plan.id !== planId));
      setCurrentPlan((current) => (current?.id === planId ? null : current));
      setNotice("Saved plan deleted.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete saved plan.");
    }
  };

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">Personalized AI Plan</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground md:text-base">
            Answer a few details and get your diet, workout, and macro plan.
          </p>
        </div>
        <PremiumButton
          disabled={!currentPlan || isExportingPdf}
          icon={isExportingPdf ? LoaderCircle : Download}
          onClick={() => void handleDownload(currentPlan)}
          title={currentPlan ? "Download current plan" : "Generate a plan first"}
          variant="secondary"
        >
          {isExportingPdf ? "Preparing PDF..." : "Download PDF"}
        </PremiumButton>
      </section>

      {error ? <Toast message={error} variant="destructive" /> : null}
      {notice ? <Toast message={notice} variant="success" /> : null}

      <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(340px,460px)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
            <SectionCard icon={Target} title="Body & Goal">
              <Field label="Goal">
                <Select value={form.goal} onChange={(event) => updateForm("goal", event.target.value as FitnessGoal)}>
                  {goalOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </Field>
              <Field error={validation.age} label="Age">
                <Input min={13} max={100} onChange={handleNumberChange("age")} type="number" value={form.age} />
              </Field>
              <Field error={validation.height_cm} label="Height cm">
                <Input min={80} max={250} onChange={handleNumberChange("height_cm")} type="number" value={form.height_cm} />
              </Field>
              <Field error={validation.weight_kg} label="Weight kg">
                <Input min={25} max={300} onChange={handleNumberChange("weight_kg")} type="number" value={form.weight_kg} />
              </Field>
              <Field label="Activity level">
                <Select value={form.activity_level} onChange={(event) => updateForm("activity_level", event.target.value as ActivityLevel)}>
                  {activityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </Field>
              <Field label="Gender">
                <Select value={form.gender} onChange={(event) => updateForm("gender", event.target.value as Gender)}>
                  {genderOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </Field>
            </SectionCard>

            <SectionCard icon={Utensils} title="Diet & Budget">
              <Field label="Diet preference">
                <Select value={form.diet_type} onChange={(event) => updateForm("diet_type", event.target.value as DietType)}>
                  {dietOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </Field>
              <Field label="Budget">
                <Select value={form.budget} onChange={(event) => updateForm("budget", event.target.value as BudgetMode)}>
                  {budgetOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </Field>
              <Field error={validation.meals_per_day} label="Meals per day">
                <Input max={6} min={2} onChange={handleNumberChange("meals_per_day")} type="number" value={form.meals_per_day} />
              </Field>
              <Field label="Monthly budget" hint="Optional">
                <Input min={0} onChange={handleNumberChange("monthly_budget")} placeholder="Optional" type="number" value={form.monthly_budget ?? ""} />
              </Field>
            </SectionCard>

            <SectionCard icon={Dumbbell} title="Workout Setup">
              <Field label="Experience level">
                <Select value={form.experience_level} onChange={(event) => updateForm("experience_level", event.target.value as ExperienceLevel)}>
                  {experienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </Field>
              <Field label="Workout location">
                <Select value={form.workout_location} onChange={(event) => updateForm("workout_location", event.target.value as WorkoutLocation)}>
                  {locationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </Field>
              <Field error={validation.days_per_week} label="Days per week">
                <Input max={7} min={1} onChange={handleNumberChange("days_per_week")} type="number" value={form.days_per_week} />
              </Field>
              <Field error={validation.workout_time_minutes} label="Workout time">
                <Input min={10} max={180} onChange={handleNumberChange("workout_time_minutes")} type="number" value={form.workout_time_minutes} />
              </Field>
              <Field label="Duration">
                <Select value={form.duration_days} onChange={(event) => updateForm("duration_days", Number(event.target.value) as PlanDuration)}>
                  {durationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </Select>
              </Field>
              <div />
              <div className="md:col-span-2">
                <Field label="Equipment">
                  <TextArea onChange={(value) => updateForm("equipment", value)} value={form.equipment} />
                </Field>
              </div>
            </SectionCard>

            <SectionCard icon={AlertTriangle} title="Restrictions & Medical Notes">
              <div className="sm:col-span-2">
                <Field label="Allergies/restrictions" hint="Optional">
                  <TextArea
                    onChange={(value) => updateForm("allergies_restrictions", value)}
                    placeholder="Example: lactose intolerance, peanut allergy, no onion/garlic"
                    value={form.allergies_restrictions}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Injury/medical note" hint="Optional. This helps the plan stay conservative.">
                  <TextArea
                    onChange={(value) => updateForm("medical_note", value)}
                    placeholder="Example: mild knee discomfort, chronic kidney disease"
                    value={form.medical_note ?? ""}
                  />
                </Field>
              </div>
            </SectionCard>

            <div className="sticky bottom-4 z-10 rounded-xl border border-border bg-card/95 p-3 shadow-soft backdrop-blur">
              <PremiumButton className="w-full" disabled={isGenerating || !canGenerate} icon={isGenerating ? LoaderCircle : Sparkles} type="submit">
                {isGenerating ? "Building your personalized plan..." : "Generate personalized plan"}
              </PremiumButton>
            </div>
          </form>

          <GlassCard className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-black text-foreground">Saved plans</h2>
              {isLoadingPlans ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin text-primary" /> : null}
            </div>
            <div className="mt-4 space-y-3">
              {plans.length === 0 && !isLoadingPlans ? (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm leading-6 text-muted-foreground">
                  No plan yet. Add your details and generate your first plan.
                </div>
              ) : null}
              {plans.map((plan) => (
                <div className="rounded-xl border border-border bg-card/70 p-4" key={plan.id}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-black text-foreground">{plan.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {labelFromValue(plan.goal)} | {plan.duration_days} days | {new Date(plan.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <PremiumButton className="min-h-9 px-3 py-2 text-xs" onClick={() => setCurrentPlan(plan)} variant="secondary">
                        Open
                      </PremiumButton>
                      <PremiumButton
                        className="min-h-9 px-3 py-2 text-xs"
                        icon={Trash2}
                        onClick={() => void deletePlan(plan.id)}
                        variant="ghost"
                      >
                        Delete
                      </PremiumButton>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="min-w-0">
          {isGenerating ? <LoadingPlan /> : null}
          {!isGenerating && currentPlan ? (
            <PlanResult
              isExportingPdf={isExportingPdf}
              isSaved={plans.some((plan) => plan.id === currentPlan.id)}
              onDownload={() => void handleDownload(currentPlan)}
              onGenerateAgain={() => {
                setCurrentPlan(null);
                window.scrollTo({ behavior: "smooth", top: 0 });
              }}
              plan={currentPlan}
            />
          ) : null}
          {!isGenerating && !currentPlan ? (
            <GlassCard className="p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Brain aria-hidden="true" className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-2xl font-black text-foreground">No plan yet.</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Add your details and generate your first plan.
              </p>
            </GlassCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
