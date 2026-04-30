import type { AIPlan, MealPlanItem, WorkoutDay, WorkoutExercise } from "@/features/ai-plan/types";

const pageWidth = 595;
const pageHeight = 842;
const margin = 44;
const contentWidth = pageWidth - margin * 2;
const bottomMargin = 42;
const defaultLineHeight = 14;

type PdfFontSize = 10 | 11 | 12 | 14 | 18;

type PdfLine = {
  fontSize: PdfFontSize;
  text: string;
};

type NormalizedPlanForPdf = {
  allergies: string;
  budget: string;
  createdAt: string;
  daysPerWeek: number | string;
  dietType: string;
  durationDays: number;
  equipment: string;
  experienceLevel: string;
  goal: string;
  hydrationLiters: number | string;
  hydrationNote: string;
  hydrationBreakdown: string;
  inputSummary: Array<[string, string]>;
  macros: {
    calories: number | string;
    carbs: number | string;
    fats: number | string;
    protein: number | string;
  };
  meals: MealPlanItem[];
  medicalNote: string;
  personalizationReasons: string[];
  recoveryTips: string[];
  safetyNotes: string[];
  title: string;
  vitaminsMinerals: string[];
  budgetFoods: string[];
  workouts: WorkoutDay[];
};

function cleanText(value: unknown) {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function labelFromValue(value: unknown) {
  return cleanText(value).replace(/_/g, " ");
}

function toArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readNumber(value: unknown, fallback: number | string = "-") {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

const dietBlockedTerms: Record<string, string[]> = {
  eggetarian: ["chicken", "fish", "meat", "mutton", "beef", "pork", "seafood"],
  vegan: ["eggs", "egg", "milk", "curd", "yogurt", "paneer", "cheese", "whey", "chicken", "fish", "meat", "seafood"],
  vegetarian: ["eggs", "egg", "chicken", "fish", "mutton", "meat", "seafood"],
};

function textHasTerm(text: string, term: string) {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
}

function blockedTermsForPdf(dietType: string, allergies: string, medicalNote: string) {
  const normalizedDiet = dietType.replace(/\s+/g, "_").toLowerCase();
  const freeText = `${allergies} ${medicalNote}`.toLowerCase();
  const blocked = [...(dietBlockedTerms[normalizedDiet] ?? [])];
  if (freeText.includes("lactose") || freeText.includes("dairy")) {
    blocked.push("milk", "curd", "yogurt", "paneer", "cheese", "whey");
  }
  if (freeText.includes("peanut")) blocked.push("peanuts", "peanut butter");
  if (freeText.includes("egg")) blocked.push("eggs", "egg");
  if (freeText.includes("gluten")) blocked.push("wheat", "roti", "bread");
  if (freeText.includes("onion") || freeText.includes("garlic")) blocked.push("onion", "garlic");
  return Array.from(new Set(blocked));
}

function isPdfTextAllowed(text: string, blockedTerms: string[]) {
  return !blockedTerms.some((term) => textHasTerm(text, term));
}

function filterPdfStrings(items: string[], blockedTerms: string[]) {
  return items.filter((item) => isPdfTextAllowed(item, blockedTerms));
}

function normalizeMeal(value: unknown, index: number): MealPlanItem {
  const meal = readRecord(value);
  return {
    carbs_g: Number(meal.carbs_g) || undefined,
    fats_g: Number(meal.fats_g) || undefined,
    foods: toArray<string>(meal.foods).map(cleanText).filter(Boolean),
    meal: cleanText(meal.meal) || `Meal ${index + 1}`,
    note: cleanText(meal.note),
    protein_g: Number(meal.protein_g) || undefined,
    target_calories: Number(meal.target_calories) || 0,
  };
}

function normalizeExercise(value: unknown): WorkoutExercise {
  const exercise = readRecord(value);
  return {
    name: cleanText(exercise.name) || "Exercise",
    note: cleanText(exercise.note ?? exercise.notes),
    reps: cleanText(exercise.reps) || "-",
    rest_seconds: Number(exercise.rest_seconds ?? exercise.rest) || 0,
    sets: Number(exercise.sets) || 1,
  };
}

function normalizeWorkout(value: unknown, index: number): WorkoutDay {
  const workout = readRecord(value);
  return {
    day: Number(workout.day) || index + 1,
    duration_minutes: Number(workout.duration_minutes) || 0,
    exercises: toArray<unknown>(workout.exercises).map(normalizeExercise),
    title: cleanText(workout.title ?? workout.focus) || "Workout / Recovery",
    type: workout.type === "recovery" ? "recovery" : "training",
  };
}

export function normalizePlanForPdf(plan: AIPlan | Record<string, unknown>): NormalizedPlanForPdf {
  const root = readRecord(plan);
  const planData = readRecord(root.plan_data ?? root.planData ?? root);
  const inputData = readRecord(root.input_data ?? root.inputData ?? planData.input_data);
  const summary = readRecord(planData.summary);
  const macros = readRecord(planData.macros ?? planData.nutrition);
  const hydration = readRecord(planData.hydration);
  const nutrition = readRecord(planData.nutrition);
  const mealsSource = planData.meals ?? nutrition.meals;
  const workoutsSource = planData.workouts ?? root.workouts;
  const durationDays = Number(root.duration_days ?? root.durationDays ?? summary.duration_days ?? inputData.duration_days) || 1;

  const allergies = cleanText(inputData.allergies_restrictions);
  const medicalNote = cleanText(inputData.medical_note);
  const dietType = labelFromValue(inputData.diet_type);
  const blockedTerms = blockedTermsForPdf(dietType, allergies, medicalNote);
  const normalizedMeals = toArray<unknown>(mealsSource).map(normalizeMeal).map((meal) => ({
    ...meal,
    foods: filterPdfStrings(meal.foods, blockedTerms),
    note: isPdfTextAllowed(meal.note, blockedTerms) ? meal.note : "",
  })).filter((meal) => meal.foods.length > 0);

  const normalized = {
    allergies,
    budget: labelFromValue(summary.budget ?? inputData.budget),
    budgetFoods: filterPdfStrings(toArray<string>(planData.budget_foods ?? nutrition.budget_foods).map(cleanText).filter(Boolean), blockedTerms),
    createdAt: cleanText(root.created_at ?? root.createdAt) || new Date().toISOString(),
    daysPerWeek: readNumber(inputData.days_per_week),
    dietType,
    durationDays,
    equipment: cleanText(inputData.equipment),
    experienceLevel: labelFromValue(inputData.experience_level),
    goal: labelFromValue(root.goal ?? summary.goal ?? inputData.goal),
    hydrationLiters: readNumber(hydration.liters_per_day ?? nutrition.hydration_liters),
    hydrationNote: cleanText(hydration.note),
    hydrationBreakdown: [
      `base ${cleanText(hydration.base_liters)}L`,
      `workout +${cleanText(hydration.workout_adjustment_liters)}L`,
      `activity +${cleanText(hydration.activity_adjustment_liters)}L`,
      `goal +${cleanText(hydration.goal_adjustment_liters)}L`,
    ].filter((item) => !item.includes("undefined") && !item.includes("base L")).join(", "),
    inputSummary: [] as Array<[string, string]>,
    macros: {
      calories: readNumber(summary.calories_per_day ?? nutrition.calories),
      carbs: readNumber(macros.carbs_g),
      fats: readNumber(macros.fats_g),
      protein: readNumber(macros.protein_g),
    },
    meals: normalizedMeals,
    medicalNote,
    personalizationReasons: filterPdfStrings(toArray<string>(planData.personalization_reasons).map(cleanText).filter(Boolean), blockedTerms),
    recoveryTips: filterPdfStrings(toArray<string>(planData.recovery_tips ?? planData.tips).map(cleanText).filter(Boolean), blockedTerms),
    safetyNotes: filterPdfStrings(toArray<string>(planData.safety_notes ?? planData.disclaimer).map(cleanText).filter(Boolean), blockedTerms),
    title: cleanText(root.title) || "Personalized AI Plan",
    vitaminsMinerals: filterPdfStrings(toArray<string>(planData.vitamins_minerals ?? nutrition.vitamins_and_minerals).map(cleanText).filter(Boolean), blockedTerms),
    workouts: toArray<unknown>(workoutsSource).map(normalizeWorkout),
  };

  normalized.inputSummary = [
    ["Age", cleanText(inputData.age)],
    ["Height", `${cleanText(inputData.height_cm)} cm`],
    ["Weight", `${cleanText(inputData.weight_kg)} kg`],
    ["Activity level", labelFromValue(inputData.activity_level)],
    ["Experience level", normalized.experienceLevel],
    ["Workout location", labelFromValue(inputData.workout_location)],
    ["Equipment", normalized.equipment || "Not specified"],
    ["Allergies/restrictions", normalized.allergies || "None mentioned"],
    ["Injury/medical note", normalized.medicalNote || "None mentioned"],
  ];

  return normalized;
}

function wrapLine(text: string, fontSize: PdfFontSize) {
  const maxChars = Math.max(42, Math.floor(contentWidth / (fontSize * 0.48)));
  const words = cleanText(text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function pdfEscape(text: string) {
  return cleanText(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function addPageIfNeeded(pages: PdfLine[][], y: number, neededHeight = defaultLineHeight) {
  if (y + neededHeight <= pageHeight - bottomMargin) {
    return y;
  }
  pages.push([]);
  return margin;
}

function addWrappedText(
  pages: PdfLine[][],
  y: number,
  text: string,
  fontSize: PdfFontSize = 10,
  prefix = "",
) {
  wrapLine(`${prefix}${text}`, fontSize).forEach((line) => {
    y = addPageIfNeeded(pages, y);
    pages[pages.length - 1].push({ fontSize, text: line });
    y += fontSize + 4;
  });
  return y;
}

function addSpacer(pages: PdfLine[][], y: number, height = 8) {
  return addPageIfNeeded(pages, y + height) + height;
}

function addSectionTitle(pages: PdfLine[][], y: number, title: string) {
  y = addSpacer(pages, y, 8);
  return addWrappedText(pages, y, title, 14);
}

function addKeyValueRows(pages: PdfLine[][], y: number, rows: Array<[string, unknown]>) {
  rows.forEach(([key, value]) => {
    y = addWrappedText(pages, y, `${key}: ${cleanText(value) || "-"}`, 10);
  });
  return y;
}

function addMealPlan(pages: PdfLine[][], y: number, plan: NormalizedPlanForPdf) {
  y = addSectionTitle(pages, y, "Full Meal Plan");
  if (plan.meals.length === 0) {
    return addWrappedText(pages, y, "No meal data was returned for this plan.", 10);
  }

  y = addWrappedText(
    pages,
    y,
    "Daily nutrition template. Repeat this structure across the selected duration unless your coach or dietitian adjusts it.",
    10,
  );
  plan.meals.forEach((meal) => {
    y = addWrappedText(pages, y, `${meal.meal}${meal.target_calories ? ` (${meal.target_calories} kcal)` : ""}`, 11);
    y = addWrappedText(pages, y, meal.foods.join(", "), 10, "- Foods: ");
    if (meal.protein_g || meal.carbs_g || meal.fats_g) {
      y = addWrappedText(
        pages,
        y,
        `${meal.protein_g ?? 0}g protein / ${meal.carbs_g ?? 0}g carbs / ${meal.fats_g ?? 0}g fats`,
        10,
        "- Approx macros: ",
      );
    }
    if (meal.note) y = addWrappedText(pages, y, meal.note, 10, "- Note: ");
  });

  y = addSectionTitle(pages, y, "Day-wise Nutrition Coverage");
  for (let day = 1; day <= plan.durationDays; day += 1) {
    y = addWrappedText(pages, y, `Day ${day}: Follow the daily nutrition template above.`, 10);
  }
  return y;
}

function addWorkoutPlan(pages: PdfLine[][], y: number, workouts: WorkoutDay[]) {
  y = addSectionTitle(pages, y, "Full Workout Plan");
  if (workouts.length === 0) {
    return addWrappedText(pages, y, "No workout data was returned for this plan.", 10);
  }

  workouts.forEach((day) => {
    y = addWrappedText(pages, y, `Day ${day.day}: ${day.title} (${day.type}, ${day.duration_minutes} min)`, 11);
    day.exercises.forEach((exercise) => {
      y = addWrappedText(
        pages,
        y,
        `${exercise.name}: ${exercise.sets} sets x ${exercise.reps}, ${exercise.rest_seconds}s rest${exercise.note ? `. ${exercise.note}` : ""}`,
        10,
        "- ",
      );
    });
    y = addSpacer(pages, y, 4);
  });
  return y;
}

function addTips(pages: PdfLine[][], y: number, plan: NormalizedPlanForPdf) {
  y = addSectionTitle(pages, y, "Tips & Safety");
  y = addWrappedText(pages, y, "Recovery tips", 11);
  plan.recoveryTips.forEach((tip) => {
    y = addWrappedText(pages, y, tip, 10, "- ");
  });
  y = addWrappedText(pages, y, "Consistency tips", 11);
  ["Keep meal timing practical.", "Track energy, sleep, and training performance.", "Adjust with a qualified professional when health conditions are involved."].forEach((tip) => {
    y = addWrappedText(pages, y, tip, 10, "- ");
  });
  y = addWrappedText(pages, y, "Safety disclaimer", 11);
  const notes = plan.safetyNotes.length
    ? plan.safetyNotes
    : ["This plan is for general fitness guidance only and is not medical advice."];
  notes.forEach((note) => {
    y = addWrappedText(pages, y, note, 10, "- ");
  });
  return y;
}

export function buildPlanPdfPages(plan: AIPlan | Record<string, unknown>) {
  const normalized = normalizePlanForPdf(plan);
  const pages: PdfLine[][] = [[]];
  let y = margin;

  y = addWrappedText(pages, y, "BodyTune AI", 18);
  y = addWrappedText(pages, y, "Personalized AI Plan", 14);
  y = addKeyValueRows(pages, y, [
    ["Generated date", new Date(normalized.createdAt).toLocaleDateString()],
    ["Plan duration", `${normalized.durationDays} days`],
    ["Goal", normalized.goal],
    ["Diet preference", normalized.dietType],
    ["Budget", normalized.budget],
    ["Workout days/week", normalized.daysPerWeek],
  ]);

  y = addSectionTitle(pages, y, "User Input Summary");
  y = addKeyValueRows(pages, y, normalized.inputSummary);

  if (normalized.personalizationReasons.length) {
    y = addSectionTitle(pages, y, "Why This Plan Fits You");
    normalized.personalizationReasons.forEach((reason) => {
      y = addWrappedText(pages, y, reason, 10, "- ");
    });
  }

  y = addSectionTitle(pages, y, "Nutrition Summary");
  y = addKeyValueRows(pages, y, [
    ["Calories/day", normalized.macros.calories],
    ["Protein", `${normalized.macros.protein}g`],
    ["Carbs", `${normalized.macros.carbs}g`],
    ["Fats", `${normalized.macros.fats}g`],
    ["Hydration", `${normalized.hydrationLiters}L/day ${normalized.hydrationNote}`],
  ]);
  if (normalized.hydrationBreakdown) {
    y = addWrappedText(pages, y, `Hydration calculation: ${normalized.hydrationBreakdown}.`, 10);
  }
  y = addWrappedText(pages, y, "Vitamins/minerals guidance", 11);
  normalized.vitaminsMinerals.forEach((item) => {
    y = addWrappedText(pages, y, item, 10, "- ");
  });
  y = addWrappedText(pages, y, "Budget-friendly foods", 11);
  y = addWrappedText(pages, y, normalized.budgetFoods.join(", ") || "Not specified", 10);

  y = addMealPlan(pages, y, normalized);
  y = addWorkoutPlan(pages, y, normalized.workouts);
  y = addTips(pages, y, normalized);

  return pages.filter((page) => page.length > 0);
}

function lineHeight(fontSize: PdfFontSize) {
  return fontSize + 4;
}

function makeContent(pages: PdfLine[][]) {
  return pages.map((pageLines) => {
    let currentY = pageHeight - margin;
    const commands = ["BT", "0 0 0 rg"];
    pageLines.forEach((line) => {
      commands.push(`/F1 ${line.fontSize} Tf`);
      commands.push(`1 0 0 1 ${margin} ${currentY} Tm (${pdfEscape(line.text)}) Tj`);
      currentY -= lineHeight(line.fontSize);
    });
    commands.push("ET");
    return commands.join("\n");
  });
}

function createPdf(contents: string[]) {
  const objects: string[] = [];
  const pagesObjectId = 2;
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  const pageIds = contents.map((_, index) => 3 + index * 2);
  objects.push(
    `${pagesObjectId} 0 obj\n<< /Type /Pages /Kids [${pageIds
      .map((id) => `${id} 0 R`)
      .join(" ")}] /Count ${contents.length} >>\nendobj\n`,
  );

  contents.forEach((content, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${contents.length * 2 + 3} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`,
    );
  });

  objects.push(
    `${contents.length * 2 + 3} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`,
  );

  let output = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object) => {
    offsets.push(output.length);
    output += object;
  });
  const xrefOffset = output.length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  output += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return output;
}

export async function downloadPlanPdf(plan: AIPlan | Record<string, unknown>) {
  const pages = buildPlanPdfPages(plan);
  if (pages.length === 0) {
    throw new Error("This plan does not have enough data to export.");
  }
  const pdf = createPdf(makeContent(pages));
  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `bodytune-ai-personalized-plan-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
