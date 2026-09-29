import { GoogleGenAI } from "@google/genai";
import { PROMPTS, SETTINGS } from "./content";

let ai: GoogleGenAI | undefined;

export async function askGemini(query: string): Promise<string> {
  ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: SETTINGS.model,
    contents: query,
    config: {
      systemInstruction: PROMPTS.system,
      temperature: SETTINGS.temperature,
    },
  });
  return res.text?.trim() || PROMPTS.emptyReply;
}
