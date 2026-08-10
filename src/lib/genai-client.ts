import { GoogleGenAI } from "@google/genai";

// Shared client for anything hitting the Gemini API — meal parsing
// (gemini.ts), embeddings, and the diet advisor's answer generation
// (rag.ts) all go through this one lazily-created instance.
let client: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set.");
    }
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}
