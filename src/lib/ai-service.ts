import { generateAIResponse } from "@/app/actions";
import { UserProfile } from "./user-context";

export type Message = {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    image?: string; // Base64 or URL
    timestamp: Date;
};

export type PersonalityType = 'buddy' | 'tutor' | 'sage' | 'custom' | 'health';

export type Personality = {
    id: PersonalityType;
    name: string;
    description: string;
    systemPrompt?: string; // Only for custom
};

// Default presets
export const PRESETS: Record<string, Personality> = {
    buddy: { id: 'buddy', name: 'Buddy', description: 'Fun & Playful' },
    tutor: { id: 'tutor', name: 'Tutor', description: 'Helpful & Smart' },
    sage: { id: 'sage', name: 'Sage', description: 'Calm & Wise' },
    health: { id: 'health', name: 'Health Buddy', description: 'Kind & Caring Nurse' }
};

let currentPersonality: Personality = PRESETS.buddy;

export const AIService = {
    setPersonality(p: Personality) {
        currentPersonality = p;
    },

    getPersonality(): Personality {
        return currentPersonality;
    },

    async sendMessage(text: string, history: Message[], profile?: UserProfile | null, image?: string): Promise<{ text: string, image?: string, mood?: string }> {
        return await generateAIResponse(text, history, currentPersonality, profile, image);
    }
};
