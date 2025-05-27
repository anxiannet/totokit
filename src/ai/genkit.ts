import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// This file is imported by flow files, which are imported by dev.ts.
// dev.ts calls dotenv.config() *before* importing flows.
// So, process.env.GOOGLE_API_KEY should be populated here.

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  // This console.warn will appear in the terminal where 'genkit start' is running
  console.warn(
    "🔴 WARNING: GOOGLE_API_KEY was not found in process.env when initializing Genkit's GoogleAI plugin. " +
    "Ensure it is set in your .env or .env.local file and that dotenv.config() is called prior to Genkit initialization (e.g., in src/ai/dev.ts)."
  );
}

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: apiKey }), // Explicitly pass the API key
                                 // If apiKey is undefined here, and the plugin requires it, it will throw an error.
  ],
  model: 'googleai/gemini-2.0-flash',
});
