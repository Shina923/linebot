import { GoogleGenAI } from "@google/genai";
import { PROMPTS } from "./content";

let ai: GoogleGenAI | undefined;

export async function askGemini(query: string): Promise<string> {
  ai ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const res = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    contents: query,
    config: {
      systemInstruction: PROMPTS.system,
      temperature: 0.7,
    },
  });
  return res.text?.trim() || PROMPTS.emptyReply;
}
