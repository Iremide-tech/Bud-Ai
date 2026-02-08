/**
 * Nutrition Utility for AI-Bud
 * Provides food suggestions and meal planning advice.
 */

export interface NutritionAdvice {
    title: string;
    advice: string;
    foods: string[];
    benefit: string;
}

const NUTRITION_KNOWLEDGE: Record<string, NutritionAdvice> = {
    "hypertension": {
        title: "Heart-Healthy Choices",
        advice: "To help manage your blood pressure, reducing sodium and increasing potassium is key.",
        foods: ["Bananas", "Spinach", "Avocado", "Sweet Potatoes", "Beans"],
        benefit: "Potassium helps your body relax blood vessels and get rid of extra sodium."
    },
    "general_weakness": {
        title: "Energy Boosting Foods",
        advice: "When you feel weak, your body might need quick but stable energy sources.",
        foods: ["Quinoa", "Oats", "Greek Yogurt", "Berries", "Nuts"],
        benefit: "These provide a mix of complex carbs and protein to keep your energy steady."
    },
    "dehydration": {
        title: "Hydrating Foods",
        advice: "You can eat your water too! These foods are mostly water.",
        foods: ["Cucumber", "Watermelon", "Strawberries", "Celery", "Lettuce"],
        benefit: "They help keep you hydrated and provide important vitamins."
    }
};

export function getNutritionAdvice(query: string): NutritionAdvice | null {
    const lowercaseQuery = query.toLowerCase();

    if (lowercaseQuery.includes("blood pressure") || lowercaseQuery.includes("hypertension") || lowercaseQuery.includes("salt") || lowercaseQuery.includes("sodium")) {
        return NUTRITION_KNOWLEDGE["hypertension"];
    }
    if (lowercaseQuery.includes("weak") || lowercaseQuery.includes("tired") || lowercaseQuery.includes("energy")) {
        return NUTRITION_KNOWLEDGE["general_weakness"];
    }
    if (lowercaseQuery.includes("dehydrated") || lowercaseQuery.includes("thirsty") || lowercaseQuery.includes("water")) {
        return NUTRITION_KNOWLEDGE["dehydration"];
    }

    return null;
}

export function buildMealPlanIdea(query: string): string {
    const advice = getNutritionAdvice(query);
    if (!advice) return "A balanced meal with protein, healthy fats, and colorful veggies is always a great start!";

    return `For ${advice.title.toLowerCase()}, you could try a meal with ${advice.foods.slice(0, 3).join(', ')}. ${advice.benefit}`;
}
