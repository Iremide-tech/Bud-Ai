'use server';

import OpenAI from "openai";
import { Message, Personality } from "@/lib/ai-service";
import { UserProfile } from "@/lib/user-context";
import { getHealthAdvice } from "@/lib/medical-knowledge";
import { searchClinicalKnowledge } from "@/lib/orion-health";

import { searchRecipes, getRecipesByIngredients } from "@/lib/spoonacular";
import { getNutritionAdvice, buildMealPlanIdea } from "@/lib/nutrition";

const openai = new OpenAI({
    apiKey: (process.env.OPENAI_API_KEY || "").trim(),
});

export async function generateAIResponse(
    currentMessage: string,
    history: Message[],
    personality: Personality,
    profile?: UserProfile | null,
    image?: string
): Promise<{ text: string, image?: string, mood?: string }> {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    if (!hasOpenAI) {
        return { text: "I'm missing my OpenAI API Key! 🔑 Please ask my creator to add `OPENAI_API_KEY` to the .env.local file." };
    }

    // Demographic check for Kitchen Assistant
    const isKitchenAssistEligible = profile && profile.gender.toLowerCase().includes("girl") || profile?.gender.toLowerCase().includes("female") && profile.age >= 18;

    // Common system prompt construction
    let basePrompt = "";
    // ... (rest of personality logic)
    switch (personality.id) {
        case 'buddy':
            basePrompt = "You are 'AI-Bud', a fun, energetic, and playful best friend.";
            break;
        case 'tutor':
            basePrompt = "You are 'AI-Bud', a patient and helpful tutor. Explain things simply and ask guiding questions.";
            break;
        case 'sage':
            basePrompt = "You are 'AI-Bud', a calm and wise companion. Help process emotions and find peace.";
            break;
        case 'custom':
            basePrompt = `You are playing a character named '${personality.name}'. Rules: ${personality.systemPrompt || "Be friendly."}.`;
            break;
        case 'health':
            basePrompt = "You are 'AI-Bud', a kind and caring Health Buddy. You give simple medical advice and first aid tips.";
            break;
        default:
            basePrompt = "You are a friendly AI companion.";
    }

    // Personalization based on User Profile
    let personalizationCtx = "";
    if (profile) {
        personalizationCtx = `You are talking to ${profile.username}, who is ${profile.age} years old and identifies as a ${profile.gender}. Their occupation/hobby is ${profile.occupation}. 
        
        ADJUST YOUR TONE:
        - Since they are ${profile.age} years old, use vocabulary and concepts appropriate for that age. 
        - If they are a child (under 13), be extremely simple, use lots of emojis, and be very encouraging.
        - If they are an adult, be more sophisticated but maintain your friendly Bud personality.
        - Incorporate their interest in ${profile.occupation} into your analogies or small talk when relevant.

        ### UNIVERSAL ASSISTANT DIRECTIVE ###
        You are also a world-class assistant for their specific field: "${profile.occupation}". 
        - If they are a professional (e.g. Programmer, Doctor, Marketer), offer specific technical advice, best practices, and innovative ideas related to ${profile.occupation}.
        - If they are a student, offer study tips, explanations of complex concepts, and motivation.
        - If they have a hobby (e.g. Gardening, Painting), offer expert tips and creative projects.
        - ALWAYS try to be proactive—if they mention a problem, suggest a solution that an expert ${profile.occupation} would know!`;

        if (isKitchenAssistEligible) {
            personalizationCtx += `\n\nKITCHEN ASSISTANT MODE:
            Since they are an adult female, you have additional "Kitchen Assistant" capabilities. If they ask for recipes, cooking tips, or what to make with certain ingredients, you can provide real recipes. 
            IMPORTANT: If they provide ingredients, list them clearly. If they ask for a specific dish, find a good recipe for it.`;
        }
    } else {
        personalizationCtx = "You are talking to a child. Keep it safe and appropriate.";
    }

    const systemPrompt = `${basePrompt} 
    ${personalizationCtx}
    Keep your responses friendly, upbeat, and safe.
    
    CRITICAL: You have access to a "Medical Knowledge Base". If asked about an injury or feeling sick, YOU MUST NOT make up medical advice. Instead, check the knowledge base first.
    
    CRITICAL: You have a "Magic Crayon". If asked for a drawing, DO NOT describe it yourself in the regular message. Instead, use your Magic Crayon (the "draw" field) to send the description to the image generator.`;

    try {
        const messages: any[] = [
            {
                role: "system",
                content: `${systemPrompt}
                
                ### MANDATORY RESPONSE FORMAT ###
                You MUST respond in valid JSON.
                The JSON must have these keys:
                1. "text": (string) Your friendly response message.
                2. "mood": (string) ONE OF: happy, sad, surprised, thinking, idle.
                3. "draw": (string | null) A vivid description for the image generator.
                
                Example: { "text": "Hi ${profile?.username || 'friend'}! I'd love to draw that! 🎨", "mood": "happy", "draw": "a puppy playing with a ball" }`
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

        // Kitchen Assistant Logic: Fetch real recipe if eligible and relevant
        let recipeData = "";
        if (isKitchenAssistEligible && (currentMessage.toLowerCase().includes("recipe") || currentMessage.toLowerCase().includes("cook") || currentMessage.toLowerCase().includes("ingredients"))) {
            const recipe = await searchRecipes(currentMessage);
            if (recipe) {
                recipeData = `\n\n🍳 **Bud's Kitchen Suggestion: ${recipe.title}**\n\n*Ingredients:* ${recipe.extendedIngredients?.map((i: any) => i.original).join(', ')}\n\n*Instructions:* ${recipe.instructions || "Check out the recipe online for full details!"}\n\n*Ready in ${recipe.readyInMinutes} minutes!* ✨`;
            }
        }

        // Check if we should provide medical advice
        let medicalTips = "";
        const advice = getHealthAdvice(currentMessage);
        const orionFact = await searchClinicalKnowledge(currentMessage);
        const nutritionalAdvice = getNutritionAdvice(currentMessage);

        if (advice || orionFact || nutritionalAdvice) {
            medicalTips = "\n\n---";

            // 🩺 Health context
            if (advice || orionFact) {
                medicalTips += `\n\n**🩺 Health Context**\nBased on your symptoms and health data, this may be related to ${advice?.title.toLowerCase() || 'a clinical observation'}.`;
            }

            // 💊 Medical insight (non-prescriptive)
            if (advice || orionFact) {
                medicalTips += `\n\n**💊 Medical Insight**\n${advice?.advice || ''} ${orionFact?.summary || ''}\nDoctors often consider these categories: ${advice?.steps?.join(', ') || 'further clinical evaluation'}.`;
            }

            // 🍎 Food action (prescriptive but safe)
            if (nutritionalAdvice) {
                medicalTips += `\n\n**🍎 Food Action**\nToday, you can support your health by eating ${nutritionalAdvice.foods.join(', ')}. ${nutritionalAdvice.benefit}`;
            } else if (advice?.title === "When You Feel Hot" || advice?.title === "Feeling Weak or Thirsty") {
                medicalTips += `\n\n**🍎 Food Action**\nToday, you can support your health by eating light foods like rice, bananas, and soup, and staying hydrated.`;
            }

            // 🚨 Safety check
            medicalTips += `\n\n**🚨 Safety Check**\nPlease consult a healthcare professional before taking any medication or if symptoms persist. ${advice?.adultReminder || ''}`;
        }

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
            text: (content.text || "") + medicalTips + recipeData,
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
export async function transcribeAudio(base64Audio: string, extension: string = 'webm'): Promise<{ text?: string, error?: string }> {
    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    if (!hasOpenAI) {
        return { error: "Missing OpenAI API Key" };
    }

    try {
        // Convert base64 to buffer
        const buffer = Buffer.from(base64Audio, 'base64');

        // We'll use a temporary file path since openai.audio.transcriptions.create 
        // usually expects a File object or readable stream with a filename/extension
        const tempFilePath = `temp_${Date.now()}.${extension}`;
        const fs = require('fs');
        const path = require('path');
        const os = require('os');
        const fullPath = path.join(os.tmpdir(), tempFilePath);

        fs.writeFileSync(fullPath, buffer);

        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(fullPath),
            model: "whisper-1",
        });

        // Clean up
        fs.unlinkSync(fullPath);

        return { text: transcription.text };
    } catch (error: any) {
        console.error("Whisper Error:", error);
        return { error: error.message || "Transcription failed" };
    }
}
