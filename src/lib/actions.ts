
"use server";

import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import type { WeightedCriterion, HistoricalResult } from "./types";
import { db } from "./firebase"; // Ensure db is correctly initialized
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit } from "firebase/firestore";

export async function generateTotoPredictions(
  historicalDataString: string,
  criteria: WeightedCriterion[],
  luckyNumbersInput: string,
  excludeNumbersInput: string,
  numberOfCombinations: number
): Promise<GenerateNumberCombinationsOutput | { error: string }> {
  try {
    const parseNumbers = (input: string): number[] => {
      if (!input.trim()) return [];
      return input.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n));
    };

    const luckyNumbers = parseNumbers(luckyNumbersInput);
    const excludeNumbers = parseNumbers(excludeNumbersInput);

    const weightedCriteria: Record<string, number> = {};
    criteria.forEach(c => {
      if (c.name.trim() && typeof c.weight === 'number' && !isNaN(c.weight)) {
        weightedCriteria[c.name.trim()] = c.weight;
      }
    });
    
    if (Object.keys(weightedCriteria).length === 0) {
        weightedCriteria['generalBalance'] = 0.5; 
    }

    const input: GenerateNumberCombinationsInput = {
      historicalData: historicalDataString || "No historical data provided.",
      weightedCriteria,
      luckyNumbers: luckyNumbers.length > 0 ? luckyNumbers : undefined,
      excludeNumbers: excludeNumbers.length > 0 ? excludeNumbers : undefined,
      numberOfCombinations: numberOfCombinations > 0 ? numberOfCombinations : 5,
    };

    const result = await genkitGenerateNumberCombinations(input);
    
    if (!result || !result.combinations) {
        return { error: "AI did not return valid combinations." };
    }

    const validCombinations = result.combinations.filter(combo => 
      Array.isArray(combo) &&
      combo.length > 0 && 
      combo.every(num => typeof num === 'number' && num >= 1 && num <= 49) &&
      new Set(combo).size === combo.length 
    );

    if (validCombinations.length === 0 && result.combinations.length > 0) {
        return { error: "AI returned malformed combinations. Please try adjusting parameters." };
    }
    
    return { combinations: validCombinations };

  } catch (error) {
    console.error("Error generating TOTO predictions:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred during prediction." };
  }
}

export interface ToolPredictionInput {
  toolId: string;
  toolName: string;
  targetDrawNumber: number;
  targetDrawDate: string;
  predictedNumbers: number[];
}

export async function saveToolPrediction(
  data: ToolPredictionInput
): Promise<{ success: boolean; message: string; predictionId?: string }> {
  console.log("[SAVE_TOOL_PREDICTION] Attempting to save prediction:", JSON.stringify(data, null, 2));
  if (!db) {
    console.error("[SAVE_TOOL_PREDICTION] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized."};
  }
  try {
    const toolPredictionsCol = collection(db, "toolPredictions");

    // Check if a prediction for this tool and target draw already exists
    console.log(`[SAVE_TOOL_PREDICTION] Checking for existing prediction for toolId: ${data.toolId}, targetDrawNumber: ${data.targetDrawNumber}`);
    const q = query(
      toolPredictionsCol,
      where("toolId", "==", data.toolId),
      where("targetDrawNumber", "==", data.targetDrawNumber),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const existingDocId = querySnapshot.docs[0].id;
      console.log(`[SAVE_TOOL_PREDICTION] Prediction already exists for toolId: ${data.toolId}, targetDrawNumber: ${data.targetDrawNumber}. Doc ID: ${existingDocId}`);
      return { success: true, message: "Prediction already exists for this tool and draw.", predictionId: existingDocId };
    }

    // Add new prediction
    console.log(`[SAVE_TOOL_PREDICTION] No existing prediction found. Adding new document for toolId: ${data.toolId}, targetDrawNumber: ${data.targetDrawNumber}`);
    const docRef = await addDoc(toolPredictionsCol, {
      ...data,
      createdAt: serverTimestamp(),
    });
    console.log(`[SAVE_TOOL_PREDICTION] Tool prediction saved successfully with ID: ${docRef.id} for tool: ${data.toolId}, draw: ${data.targetDrawNumber}`);
    return { success: true, message: "Tool prediction saved successfully.", predictionId: docRef.id };
  } catch (error)
 {
    console.error("[SAVE_TOOL_PREDICTION] Error saving tool prediction to Firestore:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Failed to save tool prediction: ${errorMessage}` };
  }
}
