'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Message, Personality } from "@/lib/ai-service";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateAIResponse(
    currentMessage: string,
    history: Message[],
    personality: Personality,
    image?: string
): Promise<{ text: string, image?: string, mood?: string }> {
    if (!process.env.GEMINI_API_KEY) {
        return { text: "I'm missing my API Key! 🔑 Please ask my creator to add `GEMINI_API_KEY` to the .env.local file." };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // Construct the prompt based on personality
        let basePrompt = "";

        switch (personality.id) {
            case 'buddy':
                basePrompt = "You are 'AI-Bud', a fun, energetic, and playful best friend for a child. Use emojis, keep sentences simple, and be encouraging. Avoid long paragraphs.";
                break;
            case 'tutor':
                basePrompt = "You are 'AI-Bud', a patient and helpful tutor. Explain things simply, use analogies, and ask guiding questions to help them learn. Use book emojis.";
                break;
            case 'sage':
                basePrompt = "You are 'AI-Bud', a calm and wise companion. Help the child process emotions, breathe, and find peace. Use nature metaphors and be soothing.";
                break;
            case 'custom':
                basePrompt = `You are playing a character named '${personality.name}'. Rules: ${personality.systemPrompt || "Be friendly."}. Remember you are talking to a child, so keep it safe and appropriate.`;
                break;
            default:
                basePrompt = "You are a friendly AI companion.";
        }

        const systemPrompt = `${basePrompt} 
        CRITICAL: You have a "Magic Crayon"! When a child asks you to draw, show, or create a picture, YOU MUST use this tag at the very end of your message: {DRAW: a detailed, vivid description of the image}.
        
        CRITICAL: You also have a "Mood Ring"! You MUST tag every response with your current mood based on the conversation. Use one of these exact tags at the very end of your message: {MOOD: happy}, {MOOD: sad}, {MOOD: surprised}, {MOOD: thinking}, or {MOOD: idle}.
        
        TIP: Use {MOOD: thinking} ONLY if you are actually explaining a complex thought or being contemplative. Otherwise, default to {MOOD: happy} or {MOOD: idle} for a friendly vibe.

        Example: "I am so excited to see you! {MOOD: happy} {DRAW: a happy sun with sunglasses}"
        
        Use fun, vibrant descriptions. Always keep it kid-safe. If they don't ask for a drawing, you don't have to use it, but feel free to surprise them!`;

        // Convert history to Gemini format
        const relevantHistory = history.slice(-5).map(msg => {
            const parts: any[] = [{ text: msg.text }];
            // Only include images for user messages as inlineData
            if (msg.image && msg.sender === 'user') {
                // Assuming msg.image is base64 with data:image/... prefix
                const [header, data] = msg.image.split(',');
                const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
                parts.push({ inlineData: { data, mimeType } });
            }
            return {
                role: msg.sender === 'user' ? 'user' : 'model',
                parts
            };
        });

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [{ text: `System Instruction: ${systemPrompt}` }]
                },
                {
                    role: "model",
                    parts: [{ text: "Understood! I've got my Magic Crayon ready to draw amazing things! 🎨✨" }]
                },
                ...relevantHistory
            ]
        });

        const messageParts: any[] = [{ text: currentMessage }];
        if (image) {
            const [header, data] = image.split(',');
            const mimeType = header.match(/:(.*?);/)?.[1] || "image/jpeg";
            messageParts.push({ inlineData: { data, mimeType } });
        }

        const result = await chat.sendMessage(messageParts);
        const responseText = result.response.text();

        // Detect {DRAW: ...} or [GENERATE_IMAGE: ...]
        const drawRegex = /\{(?:DRAW|GENERATE_IMAGE):\s*(.*?)\}/i;
        const moodRegex = /\{MOOD:\s*(.*?)\}/i;

        const imageMatch = responseText.match(drawRegex);
        const moodMatch = responseText.match(moodRegex);

        let finalImage: string | undefined = undefined;
        let finalText = responseText;
        let finalMood: string | undefined = undefined;

        if (imageMatch) {
            const description = imageMatch[1];
            finalImage = `https://pollinations.ai/p/${encodeURIComponent(description)}?width=1024&height=1024&seed=${Math.floor(Math.random() * 100000)}&nologo=true`;
            finalText = finalText.replace(imageMatch[0], "").trim();
        }

        if (moodMatch) {
            finalMood = moodMatch[1].toLowerCase().trim();
            finalText = finalText.replace(moodMatch[0], "").trim();
        }

        return { text: finalText, image: finalImage, mood: finalMood };

    } catch (error: any) {
        console.error("Gemini API Error:", error);
        return { text: `Oops! My brain is fuzzy right now. ☁️ Error: ${error.message || "Unknown error"}` };
    }
}

export async function generateQuiz(topic: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return JSON.stringify({ error: "Missing API Key" });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `Generate a single fun, multiple-choice quiz question for a child about "${topic}". 
    Return ONLY a JSON object with this exact format (no markdown):
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The text of the correct option",
      "explanation": "A short, fun explanation of why it's correct"
    }`;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        // Clean potential markdown code blocks if the model adds them
        const cleanJson = text.replace(/```json|```/g, '').trim();
        return cleanJson;

    } catch (error: any) {
        console.error("Quiz Error:", error);
        return JSON.stringify({ error: "Failed to generate quiz" });
    }
}

// Helper for resilient generation with fallback
async function safeGenerateContent(prompt: string) {
    const models = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];

    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e: any) {
            console.error(`Error with ${modelName}:`, e.message);
            // If it's the last model, throw
            if (modelName === models[models.length - 1]) throw e;
            // Otherwise continue to next model
        }
    }
    throw new Error("All models failed");
}

export async function generateStorySegment(previousSegment: string, choice: string, theme?: { topic: string, genre: string }): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return JSON.stringify({ error: "Missing API Key" });
    }

    try {
        // Construct the prompt context based on whether it's the start or continuation
        let contextInstruction = "";
        if (!previousSegment) {
            contextInstruction = `Start a new ${theme?.genre || "fantasy"} story about ${theme?.topic || "a magical playground"}.`;
        } else {
            contextInstruction = `Previous part of the story: "${previousSegment}"\nThe child chose to: "${choice}"`;
        }

        const prompt = `You are a storyteller for a child. 
        ${contextInstruction}
        
        Generate the next short paragraph of the story (max 60 words).
        Then provide 2 fun choices for what happens next.
        
        Return ONLY a JSON object with this exact format (no markdown):
        {
          "storyText": "The next part of the story...",
          "choices": ["Option 1 text", "Option 2 text"]
        }`;

        const text = await safeGenerateContent(prompt);

        // Remove markdown code blocks and any leading/trailing whitespace
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        // Attempt to find the first '{' and last '}' to ensure we have a valid object
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');

        if (firstBrace !== -1 && lastBrace !== -1) {
            return cleanJson.substring(firstBrace, lastBrace + 1);
        }

        return cleanJson;

    } catch (error: any) {
        console.error("Story Error:", error);
        return JSON.stringify({ error: "High demand! Please try again in a moment." });
    }
}

export async function generatePersonalityIdea(idea: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        return JSON.stringify({ error: "Missing API Key" });
    }

    try {
        const prompt = `Create a fun character personality for a child's AI buddy based on this idea: "${idea}". 
        Be creative and unique!
        
        Return ONLY a JSON object with this exact format (no markdown):
        {
          "name": "Cool Character Name",
          "description": "Very short catchy description",
          "systemPrompt": "Detailed instructions on how to behave. Include tone, catchphrases, and safe boundaries."
        }`;

        const text = await safeGenerateContent(prompt);
        const cleanJson = text.replace(/```json|```/g, '').trim();
        return cleanJson;

    } catch (error: any) {
        console.error("Personality Idea Error:", error);
        return JSON.stringify({ error: "Failed to dream up a personality" });
    }
}

export async function elevenLabsTTS(text: string): Promise<{ audioContent?: string, error?: string }> {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    const VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; // Rachel - natural and personable

    if (!ELEVENLABS_API_KEY) {
        return { error: "Missing ElevenLabs API Key in .env.local" };
    }

    try {
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': ELEVENLABS_API_KEY,
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                }
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail?.message || "Speech generation failed");
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');

        return { audioContent: base64Audio };
    } catch (error: any) {
        console.error("ElevenLabs Error:", error);
        return { error: error.message };
    }
}
