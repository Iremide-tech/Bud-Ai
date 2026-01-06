'use server';

import OpenAI from "openai";
import { Message, Personality } from "@/lib/ai-service";

const openai = new OpenAI({
    apiKey: (process.env.OPENAI_API_KEY || "").trim(),
});

export async function generateAIResponse(
    currentMessage: string,
    history: Message[],
    personality: Personality,
    image?: string
): Promise<{ text: string, image?: string, mood?: string }> {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    if (!hasOpenAI) {
        return { text: "I'm missing my OpenAI API Key! 🔑 Please ask my creator to add `OPENAI_API_KEY` to the .env.local file." };
    }

    // Common system prompt construction
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
    Keep your responses friendly, upbeat, and kid-safe.
    
    CRITICAL: You have a "Magic Crayon". If the child asks for a drawing or to "see" something, YOU MUST NOT describe it yourself in the regular message. Instead, use your Magic Crayon (the "draw" field or tag) to send the description to the image generator.`;

    try {
        const messages: any[] = [
            {
                role: "system",
                content: `${systemPrompt}
                
                ### MANDATORY RESPONSE FORMAT ###
                You are a backend service that MUST respond in valid JSON.
                The JSON must have these keys:
                1. "text": (string) Your friendly, kid-safe response message. NEVER describe the drawing here.
                2. "mood": (string) ONE OF: happy, sad, surprised, thinking, idle.
                3. "draw": (string | null) A vivid, detailed description for the image generator.
                
                Example: { "text": "I'd love to draw that for you! 🎨", "mood": "happy", "draw": "a giant sparkly moon in a purple sky with stars" }`
            },
            ...history.slice(-5).map(msg => ({
                role: msg.sender === 'user' ? 'user' : 'assistant',
                content: msg.image ? [
                    { type: "text", text: msg.text },
                    { type: "image_url", image_url: { url: msg.image } }
                ] : msg.text
            })),
            {
                role: "user",
                content: image ? [
                    { type: "text", text: currentMessage },
                    { type: "image_url", image_url: { url: image } }
                ] : currentMessage
            }
        ];

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages,
            response_format: { type: "json_object" },
            max_tokens: 500,
        });

        const content = JSON.parse(response.choices[0].message.content || "{}");
        const rawDraw = content.draw || content.drawing || null;

        let imageUrl: string | undefined = undefined;
        if (rawDraw) {
            // Clean the prompt for the URL
            const cleanPrompt = rawDraw.replace(/\s+/g, ' ').trim().replace(/[^a-zA-Z0-9\s]/g, '');
            const urlPrompt = cleanPrompt.replace(/\s+/g, '_');
            imageUrl = `https://image.pollinations.ai/prompt/${urlPrompt}?seed=${Math.floor(Math.random() * 100000)}&nologo=true`;
        }

        console.log("OpenAI Debug:", { rawDraw, imageUrl });

        return {
            text: content.text || "",
            mood: content.mood?.toLowerCase() || "idle",
            image: imageUrl
        };

    } catch (openaiError: any) {
        console.error("OpenAI API Error:", openaiError);
        return { text: `Oops! OpenAI failed. ☁️ Error: ${openaiError.message || "Unknown error"}` };
    }
}


export async function generateQuiz(topic: string): Promise<string> {
    const prompt = `You are AI-Bud, a fun and energetic buddy for a child. Generate exactly 3 super fun and exciting multiple-choice quiz questions for a child about "${topic}". 
    
    CRITICAL: Ensure all 3 questions are UNIQUE and cover different aspects of the topic. Do not repeat facts or ask similar questions in the same batch.
    
    Make the questions engaging, use simple words, and include emojis in the question text.
    Return ONLY a JSON object with this exact format (no markdown):
    {
      "questions": [
        {
          "question": "The question text with emojis! 🌟",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "The text of the correct option",
          "explanation": "A short, fun, and encouraging explanation of why it's correct! ✨"
        }
      ]
    }`;

    try {
        const text = await safeGenerateContent(prompt);
        // Clean potential markdown code blocks if the model adds them
        const cleanJson = text.replace(/```json|```/g, '').trim();
        return cleanJson;

    } catch (error: any) {
        console.error("Quiz Error:", error);
        return JSON.stringify({ error: "Failed to generate quiz" });
    }
}

async function safeGenerateContent(prompt: string) {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    if (!hasOpenAI) {
        throw new Error("Missing OpenAI API Key");
    }

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 1000,
        });
        return response.choices[0].message.content || "";
    } catch (e: any) {
        console.error("OpenAI safeGenerateContent Error:", e.message);
        throw new Error(`OpenAI failed: ${e.message}`);
    }
}

export async function generateStorySegment(previousSegment: string, choice: string, theme?: { topic: string, genre: string }): Promise<string> {
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
