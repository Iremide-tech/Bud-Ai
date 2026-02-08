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
    },
    "dehydration": {
        title: "Feeling Weak or Thirsty",
        advice: "Your body is like a plant that needs water to stay strong! Feeling weak often means you need to refuel with fluids.",
        steps: [
            "Drink water slowly, little by little.",
            "Try a drink with electrolytes like a sports drink.",
            "Rest in a cool place."
        ],
        adultReminder: "Severe weakness should be checked by a doctor to ensure everything is okay."
    },
    "vital_signs": {
        title: "Checking Your Vitals",
        advice: "Vitals are like your body's dashboard. A normal heart rate for adults is usually 60-100 bpm.",
        steps: [
            "Identify if your heart rate is much higher or lower than usual.",
            "Track your temperature – anything over 100.4°F (38°C) is a fever.",
            "Check if you feel dizzy or short of breath."
        ],
        adultReminder: "If vitals are abnormal (e.g., HR > 100 at rest), professional follow-up is recommended."
    },
    "medications": {
        title: "Medicine Classes",
        advice: "Doctors use different types of medicines for different jobs, like antibiotics for bacteria.",
        steps: [
            "Antibiotics: Used for bacterial infections.",
            "Antipyretics: Used to lower fevers.",
            "Analgesics: Used for pain relief."
        ],
        adultReminder: "A healthcare professional determines the exact drug and dose. Never take medicine without consultation."
    }
};

export function getHealthAdvice(query: string): HealthAdvice | null {
    const lowercaseQuery = query.toLowerCase();

    // Vitals check
    if (lowercaseQuery.includes("bpm") || lowercaseQuery.includes("heart rate") || lowercaseQuery.includes("bp") || lowercaseQuery.includes("blood pressure")) {
        return KNOWLEDGE_BASE["vital_signs"];
    }

    // Medication check
    if (lowercaseQuery.includes("medication") || lowercaseQuery.includes("drug") || lowercaseQuery.includes("antibiotic")) {
        return KNOWLEDGE_BASE["medications"];
    }

    // Symptom check
    if (lowercaseQuery.includes("weak") || lowercaseQuery.includes("dehydrated") || lowercaseQuery.includes("thirsty")) {
        return KNOWLEDGE_BASE["dehydration"];
    }

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
