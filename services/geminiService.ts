import { GoogleGenAI, Type } from "@google/genai";
import { SrtBlock, TranslationResponseItem } from '../types';

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_NAME = 'gemini-2.5-flash';

export const translateChunk = async (blocks: SrtBlock[]): Promise<TranslationResponseItem[]> => {
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }

  // Prepare payload: only send ID and Text to save tokens and reduce confusion
  const inputPayload = blocks.map(b => ({ id: b.id, text: b.text }));

  const prompt = `
    You are a professional translator specializing in subtitles. 
    Translate the following subtitle lines from their original language (likely English) to **Khmer**.
    
    Rules:
    1. Maintain the tone and context of the original text.
    2. Keep the translation concise enough to fit as a subtitle.
    3. Do NOT translate proper nouns if they are commonly used in English, unless there is a standard Khmer equivalent.
    4. Return the result strictly as a JSON array containing objects with 'id' and 'text' (the translated text).
    5. Do NOT alter the 'id'.
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }, { text: JSON.stringify(inputPayload) }]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              text: { type: Type.STRING }
            },
            required: ["id", "text"]
          }
        }
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini");
    }

    const parsedResponse = JSON.parse(responseText) as TranslationResponseItem[];
    
    // Sort by ID to ensure order match (though usually preserved)
    return parsedResponse.sort((a, b) => a.id - b.id);

  } catch (error) {
    console.error("Gemini Translation Error:", error);
    throw error;
  }
};
