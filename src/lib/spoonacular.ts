const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com/recipes';

export async function searchRecipes(query: string) {
    if (!API_KEY) {
        console.warn("Missing SPOONACULAR_API_KEY");
        return null;
    }

    try {
        const response = await fetch(`${BASE_URL}/complexSearch?query=${encodeURIComponent(query)}&apiKey=${API_KEY}&number=1&addRecipeInformation=true`);
        if (!response.ok) throw new Error("Spoonacular API error");
        const data = await response.json();
        return data.results?.[0] || null;
    } catch (error) {
        console.error("Spoonacular Search Error:", error);
        return null;
    }
}

export async function getRecipesByIngredients(ingredients: string) {
    if (!API_KEY) return null;

    try {
        const response = await fetch(`${BASE_URL}/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&apiKey=${API_KEY}&number=1`);
        if (!response.ok) throw new Error("Spoonacular API error");
        const data = await response.json();

        if (data.length > 0) {
            // Fetch full info for the first recipe
            const recipeId = data[0].id;
            const infoResponse = await fetch(`${BASE_URL}/${recipeId}/information?apiKey=${API_KEY}`);
            return await infoResponse.json();
        }
        return null;
    } catch (error) {
        console.error("Spoonacular Ingredient Search Error:", error);
        return null;
    }
}
