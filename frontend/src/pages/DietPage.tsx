import { motion } from "framer-motion";
import {
  AlertTriangle,
  Apple,
  Camera,
  CheckCircle2,
  Flame,
  ImagePlus,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Utensils,
  X,
} from "lucide-react";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { pageReveal, useGsapEntrance } from "@/shared/animations/gsapAnimations";
import { Badge } from "@/shared/ui/Badge";
import { GlassCard } from "@/shared/ui/GlassCard";
import { PageHeader } from "@/shared/ui/PageHeader";
import { PremiumButton } from "@/shared/ui/PremiumButton";
import { Progress } from "@/shared/ui/Progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/Tabs";
import {
  buildDetectedSuggestions,
  loadImageElement,
} from "@/features/nutrition/services/foodDetection";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { nutritionService } from "@/features/nutrition/services/nutritionService";
import type {
  CustomEstimateForm,
  CustomFoodCreate,
  CustomFoodEstimate,
  DetectedFoodSuggestion,
  DietLog,
  DietSummary,
  FoodItem,
  MealPhotoUploadResponse,
  MealType,
} from "@/features/nutrition/types";
import type { MobileNet } from "@tensorflow-models/mobilenet";

const mealTypes: Array<{ label: string; value: MealType }> = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
];

const popularFoodNames = [
  "apple",
  "banana",
  "rice",
  "roti",
  "egg",
  "paneer",
  "chicken breast",
  "dal",
  "curd",
  "milk",
  "oats",
  "salad",
];

const emptySummary: DietSummary = {
  meal_groups: {
    breakfast: [],
    dinner: [],
    lunch: [],
    snack: [],
  },
  total_calories: 0,
  total_carbs_g: 0,
  total_fats_g: 0,
  total_protein_g: 0,
};

const emptyCustomEstimate: CustomEstimateForm = {
  calories_per_serving: "",
  carbs_g: "",
  fats_g: "",
  name: "",
  protein_g: "",
  serving_unit: "1 serving",
};

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatConfidence(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getMealLabel(mealType: MealType) {
  return mealTypes.find((meal) => meal.value === mealType)?.label ?? mealType;
}

function mergeFoodsById(foods: FoodItem[]) {
  return [...new Map(foods.map((food) => [food.id, food])).values()];
}

function getParsedEstimate(form: CustomEstimateForm): CustomFoodEstimate | null {
  const estimate = {
    calories_per_serving: Number(form.calories_per_serving),
    carbs_g: Number(form.carbs_g),
    fats_g: Number(form.fats_g),
    name: form.name.trim(),
    protein_g: Number(form.protein_g),
    serving_unit: form.serving_unit.trim(),
  };

  if (
    !estimate.name ||
    !estimate.serving_unit ||
    !Number.isFinite(estimate.calories_per_serving) ||
    !Number.isFinite(estimate.protein_g) ||
    !Number.isFinite(estimate.carbs_g) ||
    !Number.isFinite(estimate.fats_g) ||
    estimate.calories_per_serving < 0 ||
    estimate.protein_g < 0 ||
    estimate.carbs_g < 0 ||
    estimate.fats_g < 0
  ) {
    return null;
  }

  return estimate;
}

function multiplyNutrition(
  source: {
    calories_per_serving: number;
    carbs_g: number;
    fats_g: number;
    protein_g: number;
  } | null,
  quantity: number,
) {
  if (!source || !Number.isFinite(quantity) || quantity <= 0) {
    return {
      calories: 0,
      carbs_g: 0,
      fats_g: 0,
      protein_g: 0,
    };
  }

  return {
    calories: source.calories_per_serving * quantity,
    carbs_g: source.carbs_g * quantity,
    fats_g: source.fats_g * quantity,
    protein_g: source.protein_g * quantity,
  };
}

function NutritionTile({
  accent,
  label,
  unit,
  value,
}: {
  accent: "aqua" | "ember" | "volt" | "white";
  label: string;
  unit: string;
  value: number;
}) {
  const accentClassName = {
    aqua: "text-aqua-400",
    ember: "text-primary",
    volt: "text-volt-400",
    white: "text-white",
  }[accent];

  return (
    <div className="rounded-2xl border border-white/10 bg-carbon-950/42 p-4 shadow-inner-glass">
      <p className="text-xs font-medium text-white/45">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold ${accentClassName}`}>
        {formatNumber(value)}
        <span className="ml-1 text-sm font-medium text-white/45">{unit}</span>
      </p>
    </div>
  );
}

function FoodResultButton({
  food,
  isSelected,
  onSelect,
}: {
  food: FoodItem;
  isSelected: boolean;
  onSelect: (food: FoodItem) => void;
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={`focus-ring w-full rounded-2xl border p-3 text-left transition ${
        isSelected
          ? "selected-card"
          : "border-white/10 bg-carbon-950/35 hover:border-primary/25 hover:bg-white/[0.055]"
      }`}
      onClick={() => onSelect(food)}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize text-white">{food.name}</p>
          <p className="mt-1 text-xs text-white/45">{food.serving_unit}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isSelected ? (
            <Badge variant="selected">
              <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
              Selected
            </Badge>
          ) : null}
          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
            {formatNumber(food.calories_per_serving)} kcal
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] font-semibold text-white/58">
        <span>{formatNumber(food.protein_g)}g protein</span>
        <span>{formatNumber(food.carbs_g)}g carbs</span>
        <span>{formatNumber(food.fats_g)}g fats</span>
      </div>
    </button>
  );
}

export default function DietPage() {
  const scopeRef = useGsapEntrance<HTMLDivElement>((scope) => pageReveal(scope), []);
  const auth = useAuth();
  const userId = auth.user?.id;
  const [allFoods, setAllFoods] = useState<FoodItem[]>([]);
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [detectedSuggestions, setDetectedSuggestions] = useState<
    DetectedFoodSuggestion[]
  >([]);
  const [logs, setLogs] = useState<DietLog[]>([]);
  const [summary, setSummary] = useState<DietSummary>(emptySummary);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [mealType, setMealType] = useState<MealType>("breakfast");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadedPhoto, setUploadedPhoto] =
    useState<MealPhotoUploadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDeleteLogId, setPendingDeleteLogId] = useState<number | null>(null);
  const [deletingLogId, setDeletingLogId] = useState<number | null>(null);
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);
  const [suggestionMessage, setSuggestionMessage] = useState<string | null>(null);
  const [isCustomEstimateOpen, setIsCustomEstimateOpen] = useState(false);
  const [customEstimate, setCustomEstimate] =
    useState<CustomEstimateForm>(emptyCustomEstimate);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const classifierModelRef = useRef<MobileNet | null>(null);
  const classifierLoadRef = useRef<Promise<MobileNet> | null>(null);
  const suggestionRunIdRef = useRef(0);

  const detectedFoods = useMemo(
    () => detectedSuggestions.map((suggestion) => suggestion.food),
    [detectedSuggestions],
  );
  const foodById = useMemo(
    () =>
      new Map(
        mergeFoodsById([...allFoods, ...searchResults, ...detectedFoods]).map(
          (food) => [food.id, food],
        ),
      ),
    [allFoods, detectedFoods, searchResults],
  );
  const selectedFood = selectedFoodId
    ? foodById.get(Number(selectedFoodId)) ?? null
    : null;
  const parsedQuantity = Number(quantity);
  const hasValidQuantity = Number.isFinite(parsedQuantity) && parsedQuantity > 0;
  const parsedCustomEstimate = getParsedEstimate(customEstimate);
  const activeCustomEstimate =
    !selectedFood && isCustomEstimateOpen ? parsedCustomEstimate : null;
  const nutritionPreview = multiplyNutrition(
    selectedFood ?? activeCustomEstimate,
    parsedQuantity,
  );
  const popularFoods = useMemo(() => {
    const foodByName = new Map(allFoods.map((food) => [food.name, food]));
    const mappedFoods = popularFoodNames
      .map((name) => foodByName.get(name))
      .filter((food): food is FoodItem => Boolean(food));

    return mappedFoods.length > 0 ? mappedFoods : allFoods.slice(0, 12);
  }, [allFoods]);
  const visibleFoods = searchQuery.trim() ? searchResults : popularFoods;
  const canUseCustomFallback =
    searchQuery.trim().length > 0 && !isSearching && searchResults.length === 0;
  const chartData = [
    { name: "Protein", value: summary.total_protein_g },
    { name: "Carbs", value: summary.total_carbs_g },
    { name: "Fats", value: summary.total_fats_g },
  ];
  const dailyCalorieGoal = 2200;
  const caloriesRemaining = Math.max(
    0,
    dailyCalorieGoal - summary.total_calories,
  );
  const calorieProgress = Math.min(
    100,
    (summary.total_calories / dailyCalorieGoal) * 100,
  );
  const macroTargets = {
    carbs_g: 240,
    fats_g: 70,
    protein_g: 120,
  };

  async function getImageClassifier() {
    if (classifierModelRef.current) {
      return classifierModelRef.current;
    }

    if (!classifierLoadRef.current) {
      classifierLoadRef.current = Promise.all([
        import("@tensorflow/tfjs"),
        import("@tensorflow-models/mobilenet"),
      ]).then(([, mobilenetModel]) =>
        mobilenetModel.load({ alpha: 0.5, version: 2 }),
      );
    }

    const model = await classifierLoadRef.current;
    classifierModelRef.current = model;
    return model;
  }

  const loadDietData = useCallback(async () => {
    if (!userId) {
      setErrorMessage("Sign in again to load nutrition data.");
      return;
    }

    const { foods: foodData, logs: logData, summary: summaryData } =
      await nutritionService.getDietData(userId);

    setAllFoods(foodData);
    setSearchResults(foodData.slice(0, 12));
    setLogs(logData);
    setSummary(summaryData);
  }, [userId]);

  async function ensureUploadedPhoto() {
    if (!selectedFile) {
      return null;
    }
    if (!userId) {
      setErrorMessage("Sign in again to upload a meal photo.");
      return null;
    }

    if (uploadedPhoto) {
      return uploadedPhoto.photo_id;
    }

    setIsUploading(true);
    try {
      const response = await nutritionService.uploadPhoto(
        userId,
        mealType,
        selectedFile,
      );
      const responseSuggestedFoods = Array.isArray(response.suggested_foods)
        ? response.suggested_foods
        : [];
      setUploadedPhoto({
        ...response,
        suggested_foods: responseSuggestedFoods,
      });
      return response.photo_id;
    } finally {
      setIsUploading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    loadDietData()
      .catch(() => {
        if (isMounted) {
          setErrorMessage(
            "Could not load nutrition data. Confirm backend is running and your profile exists.",
          );
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [loadDietData]);

  useEffect(() => {
    if (!previewUrl) {
      return undefined;
    }

    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      setSearchResults(popularFoods);
      setIsSearching(false);
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setIsSearching(true);
      nutritionService
        .searchFoods(trimmedQuery)
        .then((foodData) => setSearchResults(foodData))
        .catch(() => setErrorMessage("Could not search foods right now."))
        .finally(() => setIsSearching(false));
    }, 250);

    return () => window.clearTimeout(timeoutId);
  }, [popularFoods, searchQuery]);

  useEffect(() => {
    if (!selectedFile || !previewUrl || allFoods.length === 0) {
      setDetectedSuggestions([]);
      setSuggestionMessage(null);
      setIsSuggestionLoading(false);
      return undefined;
    }

    const runId = suggestionRunIdRef.current + 1;
    suggestionRunIdRef.current = runId;
    const imagePreviewUrl = previewUrl;
    let isActive = true;

    async function analyzeSelectedImage() {
      setIsSuggestionLoading(true);
      setSuggestionMessage(null);
      setDetectedSuggestions([]);

      try {
        const model = await getImageClassifier();
        if (!isActive || suggestionRunIdRef.current !== runId) {
          return;
        }

        const image = await loadImageElement(imagePreviewUrl);
        const predictions = await model.classify(image, 8);
        if (!isActive || suggestionRunIdRef.current !== runId) {
          return;
        }

        const suggestions = buildDetectedSuggestions(predictions, allFoods);
        setDetectedSuggestions(suggestions);
      } catch {
        if (!isActive || suggestionRunIdRef.current !== runId) {
          return;
        }

        classifierLoadRef.current = null;
        classifierModelRef.current = null;
        setSuggestionMessage("Image suggestions unavailable. Use manual search.");
      } finally {
        if (isActive && suggestionRunIdRef.current === runId) {
          setIsSuggestionLoading(false);
        }
      }
    }

    void analyzeSelectedImage();

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allFoods, previewUrl, selectedFile]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setUploadedPhoto(null);
    setDetectedSuggestions([]);
    setSuggestionMessage(null);
    setSuccessMessage(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please choose an image file.");
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }

    setErrorMessage(null);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function selectFood(food: FoodItem) {
    setSelectedFoodId(String(food.id));
    setIsCustomEstimateOpen(false);
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function clearSelectedFood() {
    setSelectedFoodId("");
    setSuccessMessage(null);
  }

  function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
    setSearchQuery(event.target.value);
    setSelectedFoodId("");
    setIsCustomEstimateOpen(false);
    setSuccessMessage(null);
  }

  function openCustomEstimate() {
    setSelectedFoodId("");
    setIsCustomEstimateOpen(true);
    setCustomEstimate({
      ...emptyCustomEstimate,
      name: searchQuery.trim(),
    });
  }

  async function handleUploadPhoto() {
    if (!selectedFile) {
      setErrorMessage("Choose a food photo before uploading.");
      return;
    }

    setErrorMessage(null);
    try {
      await ensureUploadedPhoto();
      setSuccessMessage("Photo attached to this meal.");
    } catch {
      setErrorMessage("Could not upload image. Use a valid image under the upload limit.");
    }
  }

  async function handleAddFood(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) {
      setErrorMessage("Sign in again to add food.");
      return;
    }

    if (!hasValidQuantity) {
      setErrorMessage("Enter a quantity greater than 0.");
      return;
    }

    if (!selectedFood && !activeCustomEstimate) {
      setErrorMessage("Select a food or enter a custom food before adding.");
      return;
    }

    setIsAdding(true);
    setErrorMessage(null);
    try {
      const photoId = await ensureUploadedPhoto();

      if (selectedFood) {
        await nutritionService.addFoodLog(userId, {
          food_item_id: selectedFood.id,
          meal_type: mealType,
          photo_id: photoId,
          quantity: parsedQuantity,
        });
        await loadDietData();
        setSuccessMessage(`${selectedFood.name} added to ${getMealLabel(mealType)}.`);
      } else if (activeCustomEstimate) {
        const customFood: CustomFoodCreate = {
          aliases: [activeCustomEstimate.name],
          calories_per_serving: activeCustomEstimate.calories_per_serving,
          carbs_g: activeCustomEstimate.carbs_g,
          fats_g: activeCustomEstimate.fats_g,
          name: activeCustomEstimate.name,
          protein_g: activeCustomEstimate.protein_g,
          serving_unit: activeCustomEstimate.serving_unit,
        };
        await nutritionService.addCustomFoodLog(userId, {
          custom_food: customFood,
          meal_type: mealType,
          photo_id: photoId,
          quantity: parsedQuantity,
        });
        await loadDietData();
        setSuccessMessage(
          `${activeCustomEstimate.name} added as a custom food.`,
        );
      }

      setQuantity("1");
    } catch {
      setErrorMessage("Could not add food log. Check the backend, selected food, and quantity.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleDeleteLog(log: DietLog) {
    if (!userId) {
      setErrorMessage("Sign in again to remove food logs.");
      return;
    }

    if (pendingDeleteLogId !== log.id) {
      setPendingDeleteLogId(log.id);
      setErrorMessage(null);
      setSuccessMessage(null);
      return;
    }

    setDeletingLogId(log.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await nutritionService.deleteLog(log.id, userId);
      await loadDietData();
      setPendingDeleteLogId(null);
      setSuccessMessage("Food log removed.");
    } catch {
      setErrorMessage("Could not remove food log. Confirm backend is running.");
    } finally {
      setDeletingLogId(null);
    }
  }

  return (
    <div className="app-page" ref={scopeRef}>
      <PageHeader
        description="Search foods, confirm servings, and keep your meal diary organized by day."
        eyebrow="Nutrition Diary"
        title="Food diary and macro tracker"
      />

      <GlassCard className="orange-glow-card p-5 sm:p-6" data-gsap="fade-up">
        <div className="grid gap-6 xl:grid-cols-[0.72fr_1fr] xl:items-center">
          <div>
            <Badge>Today</Badge>
            <h2 className="mt-3 font-display text-3xl font-bold text-white">
              {caloriesRemaining} calories remaining
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatNumber(summary.total_calories)} consumed of {dailyCalorieGoal} daily goal.
            </p>
            <Progress
              className="mt-5 h-3"
              indicatorClassName="bg-primary"
              value={calorieProgress}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                color: "bg-volt-400",
                label: "Protein",
                target: macroTargets.protein_g,
                value: summary.total_protein_g,
              },
              {
                color: "bg-primary",
                label: "Carbs",
                target: macroTargets.carbs_g,
                value: summary.total_carbs_g,
              },
              {
                color: "bg-primary",
                label: "Fats",
                target: macroTargets.fats_g,
                value: summary.total_fats_g,
              },
            ].map((macro) => (
              <div
                className="rounded-2xl border border-border bg-carbon-950/42 p-4"
                key={macro.label}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-white">{macro.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatNumber(macro.value)}g / {macro.target}g
                  </p>
                </div>
                <Progress
                  className="mt-3 h-2"
                  indicatorClassName={macro.color}
                  value={(macro.value / macro.target) * 100}
                />
              </div>
            ))}
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <GlassCard className="bento-card order-2 p-5" data-gsap="slide-right">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ImagePlus aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Optional meal photo</h2>
              <p className="text-sm text-white/48">
                Secondary context for meals; logging works without a photo.
              </p>
            </div>
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-carbon-950/70">
            {previewUrl ? (
              <img
                alt="Uploaded food preview"
                className="aspect-video w-full object-cover"
                src={previewUrl}
              />
            ) : (
              <div className="flex aspect-video flex-col items-center justify-center p-8 text-center">
                <Camera aria-hidden="true" className="h-10 w-10 text-white/35" />
                <p className="mt-3 text-sm text-white/52">
                  Upload a meal image to keep the log visually anchored.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <label className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.055] px-4 text-sm font-semibold text-white/72 transition hover:border-primary/30 hover:bg-white/[0.08] focus-within:ring-2 focus-within:ring-primary">
              <input
                accept="image/*"
                className="sr-only"
                onChange={handleFileChange}
                type="file"
              />
              Choose image
            </label>
            <PremiumButton
              className="sm:w-auto"
              disabled={!selectedFile || isUploading}
              icon={isUploading ? LoaderCircle : ImagePlus}
              onClick={handleUploadPhoto}
            >
              {uploadedPhoto ? "Photo saved" : isUploading ? "Saving" : "Save photo"}
            </PremiumButton>
          </div>

          {selectedFile ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.045] p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">
                  Photo is optional. Nutrition is calculated from selected food name and serving quantity.
                </p>
                {isSuggestionLoading ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin text-primary"
                  />
                ) : null}
              </div>

              {suggestionMessage ? (
                <p className="mt-3 text-sm leading-6 text-white/58">
                  {suggestionMessage}
                </p>
              ) : null}

              {detectedSuggestions.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {detectedSuggestions.map((suggestion) => {
                    const isSelected = selectedFoodId === String(suggestion.food.id);
                    return (
                      <button
                        aria-pressed={isSelected}
                        className={`focus-ring rounded-full border px-3 py-2 text-xs font-semibold capitalize transition ${
                          isSelected
                            ? "selected-chip text-white"
                            : "border-primary/25 bg-primary/10 text-white hover:bg-primary/15"
                        }`}
                        key={suggestion.food.id}
                        onClick={() => selectFood(suggestion.food)}
                        type="button"
                      >
                        <span>{suggestion.food.name}</span>
                        <span className="ml-1 text-white/62">
                          {formatConfidence(suggestion.confidence)}
                        </span>
                        {isSelected ? (
                          <CheckCircle2
                            aria-hidden="true"
                            className="ml-1 inline h-3 w-3 text-volt-400"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-white/42">
            Confirm food name and serving quantity for nutrition calculation.
            Nutrition values are estimates based on standard serving sizes.
          </p>
        </GlassCard>

        <GlassCard className="bento-card order-1 p-5" data-gsap="slide-left">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Utensils aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Add food</h2>
              <p className="text-sm text-white/48">
                Search foods, adjust quantity, and confirm the macro preview.
              </p>
            </div>
          </div>

          <form className="mt-5 space-y-4" onSubmit={handleAddFood}>
            <label className="block">
              <span className="text-sm font-medium text-white/62">Food name</span>
              <span className="mt-2 flex items-center gap-2 rounded-2xl border border-border bg-carbon-950/55 px-3">
                <Search aria-hidden="true" className="h-4 w-4 text-white/35" />
                <input
                  className="min-h-11 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/32"
                  onChange={handleSearchChange}
                  placeholder="Search apple, banana, roti, dahi, chicken..."
                  value={searchQuery}
                />
                {isSearching ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin text-primary"
                  />
                ) : null}
              </span>
            </label>

            <div className="rounded-2xl border border-border bg-carbon-950/35 p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">
                  {searchQuery.trim() ? "Matches" : "Popular foods"}
                </p>
                <span className="text-xs text-white/38">
                  {visibleFoods.length} shown
                </span>
              </div>

              <div className="no-scrollbar mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
                {visibleFoods.length > 0 ? (
                  visibleFoods.map((food) => (
                    <FoodResultButton
                      food={food}
                      isSelected={selectedFoodId === String(food.id)}
                      key={food.id}
                      onSelect={selectFood}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 text-white/58">
                    No matching foods found in the database.
                  </div>
                )}
              </div>

              {canUseCustomFallback ? (
                <button
                  className="mt-3 min-h-10 rounded-xl border border-primary/25 bg-primary/10 px-3 text-sm font-semibold text-white transition hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  onClick={openCustomEstimate}
                  type="button"
                >
                  Add custom food
                </button>
              ) : null}
            </div>

            {selectedFood ? (
              <div className="selected-card rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge variant="selected">
                      <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
                      Selected food
                    </Badge>
                    <p className="mt-1 font-semibold capitalize text-primary">
                      {selectedFood.name}
                    </p>
                    <p className="mt-1 text-xs text-white/52">
                      {selectedFood.serving_unit}
                    </p>
                  </div>
                  <button
                    aria-label="Clear selected food"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/55 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={clearSelectedFood}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : null}

            {isCustomEstimateOpen ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Custom food
                    </p>
                    <p className="mt-1 text-xs leading-5 text-white/58">
                      Saved to the food database when the catalog does not have
                      the food yet.
                    </p>
                  </div>
                  <button
                    aria-label="Close custom food"
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 text-white/55 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    onClick={() => setIsCustomEstimateOpen(false)}
                    type="button"
                  >
                    <X aria-hidden="true" className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Food name", "name", "Paneer roll"],
                    ["Serving unit", "serving_unit", "1 serving"],
                    ["Calories", "calories_per_serving", "320"],
                    ["Protein g", "protein_g", "18"],
                    ["Carbs g", "carbs_g", "35"],
                    ["Fats g", "fats_g", "12"],
                  ].map(([label, key, placeholder]) => (
                    <label className="block" key={key}>
                      <span className="text-xs font-medium text-white/58">
                        {label}
                      </span>
                      <input
                        className="mt-1 min-h-10 w-full rounded-xl border border-white/10 bg-carbon-950/50 px-3 text-sm text-white outline-none placeholder:text-white/28 focus:ring-2 focus:ring-primary"
                        min={key === "name" || key === "serving_unit" ? undefined : "0"}
                        onChange={(event) =>
                          setCustomEstimate((currentEstimate) => ({
                            ...currentEstimate,
                            [key]: event.target.value,
                          }))
                        }
                        placeholder={placeholder}
                        step="0.1"
                        type={
                          key === "name" || key === "serving_unit"
                            ? "text"
                            : "number"
                        }
                        value={
                          customEstimate[key as keyof CustomEstimateForm]
                        }
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-white/62">
                  Quantity
                </span>
                <input
                  className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-white/[0.045] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-primary"
                  min="0.1"
                  onChange={(event) => setQuantity(event.target.value)}
                  step="0.1"
                  type="number"
                  value={quantity}
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-white/62">
                  Meal type
                </span>
                <select
                  className="focus-ring mt-2 min-h-11 w-full rounded-xl border border-primary/35 bg-[linear-gradient(135deg,rgb(var(--theme-primary-rgb)/0.12),rgba(9,9,9,0.92))] px-3 text-sm font-semibold text-white orange-glow"
                  onChange={(event) => setMealType(event.target.value as MealType)}
                  value={mealType}
                >
                  {mealTypes.map((meal) => (
                    <option key={meal.value} value={meal.value}>
                      {meal.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <NutritionTile
                accent="ember"
                label="Calories"
                unit="kcal"
                value={nutritionPreview.calories}
              />
              <NutritionTile
                accent="volt"
                label="Protein"
                unit="g"
                value={nutritionPreview.protein_g}
              />
              <NutritionTile
                accent="aqua"
                label="Carbs"
                unit="g"
                value={nutritionPreview.carbs_g}
              />
              <NutritionTile
                accent="white"
                label="Fats"
                unit="g"
                value={nutritionPreview.fats_g}
              />
            </div>

            <PremiumButton
              disabled={
                (!selectedFood && !activeCustomEstimate) ||
                !hasValidQuantity ||
                isAdding ||
                isUploading
              }
              icon={isAdding || isUploading ? LoaderCircle : Plus}
              type="submit"
            >
              {isAdding || isUploading
                ? "Adding food"
                : selectedFood
                  ? `Add ${selectedFood.name} to ${getMealLabel(mealType)}`
                  : activeCustomEstimate
                    ? `Add ${activeCustomEstimate.name} to ${getMealLabel(mealType)}`
                    : "Add food"}
            </PremiumButton>
          </form>

          {successMessage ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 flex items-start gap-3 rounded-2xl border border-volt-400/20 bg-volt-400/10 p-3 text-sm leading-6 text-white/72"
              initial={{ opacity: 0, y: 6 }}
            >
              <CheckCircle2
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0 text-volt-400"
              />
              <span>{successMessage}</span>
            </motion.div>
          ) : null}

          {errorMessage ? (
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-ember-400/20 bg-ember-400/10 p-3 text-sm leading-6 text-ember-400">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 h-4 w-4 shrink-0"
              />
              <span>{errorMessage}</span>
            </div>
          ) : null}
        </GlassCard>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <GlassCard className="bento-card p-5" data-gsap="card">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-white">Daily summary</h2>
              <p className="mt-1 text-sm text-white/48">
                Totals from confirmed food logs.
              </p>
            </div>
            <Flame aria-hidden="true" className="h-5 w-5 text-primary" />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <NutritionTile
              accent="ember"
              label="Calories"
              unit="kcal"
              value={summary.total_calories}
            />
            <NutritionTile
              accent="volt"
              label="Protein"
              unit="g"
              value={summary.total_protein_g}
            />
            <NutritionTile
              accent="aqua"
              label="Carbs"
              unit="g"
              value={summary.total_carbs_g}
            />
            <NutritionTile
              accent="white"
              label="Fats"
              unit="g"
              value={summary.total_fats_g}
            />
          </div>

          <div className="mt-5 h-56 rounded-2xl border border-white/10 bg-white/[0.035] p-3">
            <ResponsiveContainer height="100%" width="100%">
              <BarChart data={chartData}>
                <XAxis
                  axisLine={false}
                  dataKey="name"
                  tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: "#090909",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 8,
                    color: "#fff",
                  }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="bento-card p-5" data-gsap="card">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Apple aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-white">Meal log</h2>
              <p className="text-sm text-white/48">
                Foods grouped by meal type.
              </p>
            </div>
          </div>

          <Tabs className="mt-5" defaultValue="diary">
            <TabsList className="no-scrollbar max-w-full overflow-x-auto">
              <TabsTrigger value="diary">Food diary</TabsTrigger>
              <TabsTrigger value="macros">Macro chart</TabsTrigger>
            </TabsList>
            <TabsContent className="space-y-4" value="diary">
            {isLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-6 text-center text-sm text-white/52">
                Loading nutrition logs...
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.045] p-6 text-center text-sm leading-6 text-white/52">
                No food logs yet. Upload a photo, select a food, confirm the
                serving quantity, and add it to your meal.
              </div>
            ) : (
                mealTypes.map((meal) => {
                const mealLogs = summary.meal_groups[meal.value] ?? [];
                return (
                  <section key={meal.value}>
                    <h3 className="text-sm font-semibold text-white">
                      {meal.label}
                    </h3>
                    <div className="mt-2 space-y-2">
                      {mealLogs.length === 0 ? (
                        <p className="rounded-xl border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white/42">
                          No {meal.label.toLowerCase()} logs.
                        </p>
                      ) : (
                        mealLogs.map((log) => {
                          const food = foodById.get(log.food_item_id);
                          const isConfirmingDelete = pendingDeleteLogId === log.id;
                          const isDeleting = deletingLogId === log.id;

                          return (
                            <div
                              className="grid gap-3 rounded-2xl border border-border bg-carbon-950/42 p-3 sm:grid-cols-[1fr_auto]"
                              key={log.id}
                            >
                              <div>
                                <p className="font-semibold capitalize text-white">
                                  {food?.name ?? `Food #${log.food_item_id}`}
                                </p>
                                <p className="mt-1 text-xs text-white/45">
                                  {formatNumber(log.quantity)} x{" "}
                                  {food?.serving_unit ?? "serving"}
                                </p>
                              </div>
                              <div className="flex flex-col gap-3 sm:items-end">
                                <div className="flex flex-wrap gap-2 text-xs text-white/58 sm:justify-end">
                                  <span>{formatNumber(log.calories)} kcal</span>
                                  <span>
                                    {formatNumber(log.protein_g)}g protein
                                  </span>
                                  <span>{formatNumber(log.carbs_g)}g carbs</span>
                                  <span>{formatNumber(log.fats_g)}g fats</span>
                                </div>
                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                  {isConfirmingDelete ? (
                                    <button
                                      className="min-h-9 rounded-xl border border-white/10 px-3 text-xs font-semibold text-white/55 transition hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                      disabled={isDeleting}
                                      onClick={() => setPendingDeleteLogId(null)}
                                      type="button"
                                    >
                                      Cancel
                                    </button>
                                  ) : null}
                                  <button
                                    aria-label={`Remove ${
                                      food?.name ?? `food log ${log.id}`
                                    }`}
                                    className={`inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember-400 ${
                                      isConfirmingDelete
                                        ? "border-ember-400/35 bg-ember-400/10 text-ember-400 hover:bg-ember-400/15"
                                        : "border-white/10 text-white/48 hover:bg-white/[0.08] hover:text-white"
                                    }`}
                                    disabled={deletingLogId !== null}
                                    onClick={() => void handleDeleteLog(log)}
                                    type="button"
                                  >
                                    {isDeleting ? (
                                      <LoaderCircle
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5 animate-spin"
                                      />
                                    ) : (
                                      <Trash2
                                        aria-hidden="true"
                                        className="h-3.5 w-3.5"
                                      />
                                    )}
                                    {isConfirmingDelete ? "Confirm remove" : "Remove"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                );
              })
            )}
            </TabsContent>
            <TabsContent value="macros">
              <div className="h-64 rounded-2xl border border-border bg-carbon-950/35 p-3">
                <ResponsiveContainer height="100%" width="100%">
                  <BarChart data={chartData}>
                    <XAxis
                      axisLine={false}
                      dataKey="name"
                      tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        background: "#090909",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        color: "#fff",
                      }}
                      cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>
          </Tabs>
        </GlassCard>
      </div>
    </div>
  );
}
