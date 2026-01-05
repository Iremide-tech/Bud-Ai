'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { Message, Personality } from "@/lib/ai-service";

const genAI = new GoogleGenerativeAI((process.env.GEMINI_API_KEY || "").trim());
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
    const hasGemini = !!process.env.GEMINI_API_KEY;
    let lastError = "";

    console.log("API Key Status:", { hasOpenAI, hasGemini });

    if (!hasOpenAI && !hasGemini) {
        return { text: "I'm missing my API Keys! 🔑 Please ask my creator to add `OPENAI_API_KEY` or `GEMINI_API_KEY` to the .env.local file." };
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

    // Strategy 1: Attempt OpenAI
    if (hasOpenAI) {
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
            if (!hasGemini) {
                return { text: `Oops! OpenAI failed. ☁️ Error: ${openaiError.message || "Unknown error"}` };
            }
            // Fallback continues...
            console.log("Falling back to Gemini...");
            lastError = `OpenAI: ${openaiError.message || "Unknown error"}`;
        }
    }

    // Strategy 2: Fallback to Gemini
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const geminiSystemPrompt = `${systemPrompt}
        
        TECHNICAL PROTOCOL:
        1. Always end your message with {MOOD: happy | sad | surprised | thinking | idle}.
        2. If drawing requested, append {DRAW: your vivid description} AFTER the mood tag.
        
        Example: "I'd love to! {MOOD: happy} {DRAW: a big blue whale jumping over a rainbow}"`;

        const relevantHistory = history.slice(-5).map(msg => {
            const parts: any[] = [{ text: msg.text }];
            if (msg.image && msg.sender === 'user') {
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
                    parts: [{ text: `System Instruction: ${geminiSystemPrompt}` }]
                },
                {
                    role: "model",
                    parts: [{ text: "Understood! I'll use my Magic Crayon to send descriptions to the generator! 🎨✨ {MOOD: idle}" }]
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
        const processed = processRawResponse(responseText);
        return {
            ...processed,
            text: processed.text
        };

    } catch (geminiError: any) {
        console.error("Gemini API Error:", geminiError);
        const geminiErrMsg = geminiError.message || "Quota exceeded";
        return {
            text: `Oops! My brains are taking a nap. ☁️\n\n${lastError ? lastError + "\n" : ""}Gemini: ${geminiErrMsg}\n\nTIP: If you just added the key, try restarting the terminal (npm run dev).`
        };
    }
}

// Internal helper for extracting mood and draw tags
function processRawResponse(responseText: string) {
    // Better regex: handles multiple lines and ensures it doesn't cross over other tags
    const drawRegex = /\{(?:DRAW|GENERATE_IMAGE):\s*([\s\S]*?)\}/i;
    const moodRegex = /\{MOOD:\s*([\s\S]*?)\}/i;

    const imageMatch = responseText.match(drawRegex);
    const moodMatch = responseText.match(moodRegex);

    let finalImage: string | undefined = undefined;
    let finalText = responseText;
    let finalMood: string | undefined = undefined;

    if (imageMatch) {
        // Clean description: remove newlines and extra spaces
        const description = imageMatch[1].replace(/\s+/g, ' ').trim().replace(/[^a-zA-Z0-9\s]/g, '');
        if (description) {
            const urlPrompt = description.replace(/\s+/g, '_');
            finalImage = `https://image.pollinations.ai/prompt/${urlPrompt}?seed=${Math.floor(Math.random() * 100000)}&nologo=true`;
        }
        finalText = finalText.replace(imageMatch[0], "").trim();
    }

    if (moodMatch) {
        finalMood = moodMatch[1].replace(/\s+/g, ' ').trim().toLowerCase();
        finalText = finalText.replace(moodMatch[0], "").trim();
    }

    return { text: finalText, image: finalImage, mood: finalMood };
}

export async function generateQuiz(topic: string): Promise<string> {
    const prompt = `Generate a single fun, multiple-choice quiz question for a child about "${topic}". 
    Return ONLY a JSON object with this exact format (no markdown):
    {
      "question": "The question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The text of the correct option",
      "explanation": "A short, fun explanation of why it's correct"
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

// Helper for resilient generation with fallback
async function safeGenerateContent(prompt: string) {
    // Strategy 1: OpenAI
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    if (hasOpenAI) {
        try {
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 1000,
            });
            return response.choices[0].message.content || "";
        } catch (e: any) {
            console.error("OpenAI safeGenerateContent Error:", e.message);
        }
    }

    // Strategy 2: Gemini
    const models = ["gemini-1.5-flash-latest", "gemini-pro-latest", "gemini-flash-latest"];
    for (const modelName of models) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (e: any) {
            console.error(`Error with ${modelName}:`, e.message);
            if (modelName === models[models.length - 1]) throw e;
        }
    }
    throw new Error("All models failed");
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
