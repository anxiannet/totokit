
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
  // This console.warn will appear in server logs (local or deployed).
  console.warn(
    "🔴 CRITICAL WARNING: GOOGLE_API_KEY was not found in process.env when initializing Genkit's GoogleAI plugin. " +
    "For local development, ensure it is set in your .env.local file. " +
    "For deployed environments (e.g., Firebase App Hosting), ensure GOOGLE_API_KEY is configured as an environment variable for the server/service. " +
    "The AI features will not work without this key."
  );
}

export const ai = genkit({
  plugins: [
    // Pass apiKey even if undefined; googleAI plugin handles the error if it's truly needed and missing.
    googleAI({ apiKey: apiKey }),
  ],
  model: 'googleai/gemini-2.0-flash',
});
