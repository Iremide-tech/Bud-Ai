/**
 * Medical Knowledge Utility for AI-Bud
 * Provides child-friendly first aid and health advice.
 */

export interface HealthAdvice {
    title: string;
    advice: string;
    steps?: string[];
    adultReminder: string;
}

const KNOWLEDGE_BASE: Record<string, HealthAdvice> = {
    "scraped_knee": {
        title: "Fixing a Scraped Knee",
        advice: "Ouch! Don't worry, a scrape is just your body's way of building a new protective layer.",
        steps: [
            "Wash your hands first so they are super clean!",
            "Gently clean the scrape with some cool water.",
            "Ask a grown-up to help you put on a colorful bandage!",
            "Give it a little 'air time' once it starts to look better."
        ],
        adultReminder: "Always ask a grown-up to check any cut or scrape to make sure it's clean."
    },
    "washing_hands": {
        title: "Why We Wash Hands",
        advice: "Washing hands keeps those tiny invisible 'germ monsters' away so you don't get sick!",
        steps: [
            "Use warm water and soap.",
            "Scrub your hands for 20 seconds (sing 'Happy Birthday' twice!).",
            "Don't forget between your fingers and under your nails.",
            "Dry them off with a clean towel."
        ],
        adultReminder: "Ask a grown-up to show you the best way to scrub those germs away!"
    },
    "healthy_eating": {
        title: "Fuel for Your Superpowers",
        advice: "Eating colorful fruits and veggies gives you energy to run, jump, and think!",
        steps: [
            "Try to eat as many colors of the rainbow as you can (red apples, orange carrots, green broccoli!).",
            "Drink plenty of water to keep your brain hydrated.",
            "Eat breakfast every day to start your engines."
        ],
        adultReminder: "Talk to a grown-up about trying a new healthy snack today!"
    },
    "sleep": {
        title: "Magic Rest Time",
        advice: "When you sleep, your body and brain do their best work fixing things and remembering what you learned.",
        steps: [
            "Try to go to bed at the same time every night.",
            "Read a book or listen to a story to help your mind relax.",
            "Keep your room dark and cozy."
        ],
        adultReminder: "A grown-up can help you set up a perfect dreamland schedule."
    },
    "fever": {
        title: "When You Feel Hot",
        advice: "A fever is just your body working hard to fight off germs, like a little internal heating system.",
        steps: [
            "Drink lots of cool water or juice.",
            "Rest in your favorite comfy spot.",
            "Wear light clothes so you don't get too hot."
        ],
        adultReminder: "If you feel very hot, tell a grown-up right away so they can help you feel better."
    }
};

export function getHealthAdvice(query: string): HealthAdvice | null {
    const lowercaseQuery = query.toLowerCase();

    // Simple keyword matching
    if (lowercaseQuery.includes("scrape") || lowercaseQuery.includes("knee") || lowercaseQuery.includes("cut")) {
        return KNOWLEDGE_BASE["scraped_knee"];
    }
    if (lowercaseQuery.includes("wash") || lowercaseQuery.includes("hand") || lowercaseQuery.includes("germ")) {
        return KNOWLEDGE_BASE["washing_hands"];
    }
    if (lowercaseQuery.includes("eat") || lowercaseQuery.includes("food") || lowercaseQuery.includes("vegetable") || lowercaseQuery.includes("fruit")) {
        return KNOWLEDGE_BASE["healthy_eating"];
    }
    if (lowercaseQuery.includes("sleep") || lowercaseQuery.includes("bed") || lowercaseQuery.includes("tired")) {
        return KNOWLEDGE_BASE["sleep"];
    }
    if (lowercaseQuery.includes("fever") || lowercaseQuery.includes("hot") || lowercaseQuery.includes("sick")) {
        return KNOWLEDGE_BASE["fever"];
    }

    return null;
}

export function getAllTopics(): string[] {
    return Object.keys(KNOWLEDGE_BASE);
}
