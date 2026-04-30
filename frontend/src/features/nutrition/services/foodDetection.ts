import type {
  DetectedFoodSuggestion,
  ModelPrediction,
} from "@/features/nutrition/types";
import type { FoodItem } from "@/shared/types";

export const detectionSuggestionConfidence = 0.2;

const foodLabelRules: Array<{ foodName: string; keywords: string[] }> = [
  { foodName: "apple", keywords: ["apple", "granny smith"] },
  { foodName: "banana", keywords: ["banana"] },
  { foodName: "orange", keywords: ["orange", "mandarin"] },
  { foodName: "mango", keywords: ["mango"] },
  { foodName: "pineapple", keywords: ["pineapple"] },
  { foodName: "strawberry", keywords: ["strawberry"] },
  { foodName: "egg", keywords: ["egg", "omelet", "omelette"] },
  { foodName: "rice", keywords: ["rice"] },
  { foodName: "bread", keywords: ["bread", "toast"] },
  { foodName: "milk", keywords: ["milk"] },
  { foodName: "chicken breast", keywords: ["chicken"] },
  { foodName: "fish", keywords: ["fish", "seafood"] },
  { foodName: "salad", keywords: ["salad", "greens", "vegetable"] },
  { foodName: "potato", keywords: ["potato"] },
  { foodName: "pizza", keywords: ["pizza"] },
  { foodName: "burger", keywords: ["burger", "cheeseburger", "hamburger"] },
  { foodName: "pasta", keywords: ["pasta", "spaghetti", "macaroni"] },
  { foodName: "noodles", keywords: ["noodle", "ramen"] },
];

function mapLabelToFoodName(label: string) {
  const normalizedLabel = label.toLowerCase();
  return foodLabelRules.find((rule) =>
    rule.keywords.some((keyword) => normalizedLabel.includes(keyword)),
  )?.foodName;
}

export function buildDetectedSuggestions(
  predictions: ModelPrediction[],
  foods: FoodItem[],
) {
  const foodByName = new Map(foods.map((food) => [food.name.toLowerCase(), food]));
  const bestSuggestionByFoodId = new Map<number, DetectedFoodSuggestion>();

  for (const prediction of predictions) {
    if (prediction.probability < detectionSuggestionConfidence) {
      continue;
    }

    const foodName = mapLabelToFoodName(prediction.className);
    if (!foodName) {
      continue;
    }

    const food = foodByName.get(foodName);
    if (!food) {
      continue;
    }

    const currentSuggestion = bestSuggestionByFoodId.get(food.id);
    if (!currentSuggestion || prediction.probability > currentSuggestion.confidence) {
      bestSuggestionByFoodId.set(food.id, {
        confidence: prediction.probability,
        food,
      });
    }
  }

  return [...bestSuggestionByFoodId.values()]
    .sort((first, second) => second.confidence - first.confidence)
    .slice(0, 4);
}

export function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load selected image"));
    image.src = src;
  });
}
