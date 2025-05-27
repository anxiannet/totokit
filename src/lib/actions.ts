
"use server";

import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import type { WeightedCriterion, HistoricalResult } from "./types";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, writeBatch, setDoc, arrayUnion, arrayRemove, getDoc, updateDoc, runTransaction } from "firebase/firestore";

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

    console.log(`[SAVE_TOOL_PREDICTION] No existing prediction found. Adding new document for toolId: ${data.toolId}, targetDrawNumber: ${data.targetDrawNumber}`);
    const docRef = await addDoc(toolPredictionsCol, {
      ...data,
      createdAt: serverTimestamp(),
    });
    console.log(`[SAVE_TOOL_PREDICTION] Tool prediction saved successfully with ID: ${docRef.id} for tool: ${data.toolId}, draw: ${data.targetDrawNumber}`);
    return { success: true, message: "Tool prediction saved successfully.", predictionId: docRef.id };
  } catch (error) {
    console.error("[SAVE_TOOL_PREDICTION] Error saving tool prediction to Firestore:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Failed to save tool prediction: ${errorMessage}` };
  }
}

export async function syncHistoricalResultsToFirestore(
  jsonDataString: string
): Promise<{ success: boolean; message: string; count?: number }> {
  if (!db) {
    console.error("[SYNC_FIRESTORE] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized."};
  }
  try {
    const results: HistoricalResult[] = JSON.parse(jsonDataString);
    if (!Array.isArray(results)) {
      return { success: false, message: "Invalid JSON data format. Expected an array." };
    }

    const batch = writeBatch(db);
    let count = 0;

    for (const result of results) {
      if (typeof result.drawNumber !== 'number' || !result.date || !Array.isArray(result.numbers)) {
        console.warn("[SYNC_FIRESTORE] Skipping invalid result object:", result);
        continue;
      }
      const resultDocRef = doc(db, "totoResults", String(result.drawNumber));
      batch.set(resultDocRef, result, { merge: true });
      count++;
    }

    await batch.commit();
    console.log(`[SYNC_FIRESTORE] Successfully synced ${count} historical results to Firestore.`);
    return { success: true, message: `成功同步 ${count} 条开奖结果到 Firestore。`, count };
  } catch (error) {
    console.error("[SYNC_FIRESTORE] Error syncing historical results to Firestore:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `同步到 Firestore 失败: ${errorMessage}` };
  }
}

export async function getUserFavoriteTools(userId: string): Promise<string[]> {
  if (!db) {
    console.error("[GET_USER_FAVORITES] Firestore 'db' instance is not initialized.");
    throw new Error("Database not initialized");
  }
  if (!userId) {
    console.warn("[GET_USER_FAVORITES] No userId provided.");
    return [];
  }
  try {
    const userFavoritesRef = doc(db, "userToolFavorites", userId);
    const docSnap = await getDoc(userFavoritesRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return data.favoriteToolIds || [];
    }
    return [];
  } catch (error) {
    console.error("Error fetching user favorite tools:", error);
    throw error; // Re-throw to be caught by React Query
  }
}

export async function toggleFavoriteTool(
  userId: string,
  toolId: string
): Promise<{ success: boolean; favorited: boolean; message?: string }> {
  if (!db) {
    return { success: false, favorited: false, message: "Database not initialized" };
  }
  if (!userId) {
    return { success: false, favorited: false, message: "User not authenticated" };
  }

  const userFavoritesRef = doc(db, "userToolFavorites", userId);

  try {
    let currentFavoritedStatus = false;
    await runTransaction(db, async (transaction) => {
      const sfDoc = await transaction.get(userFavoritesRef);
      let favoriteToolIds: string[] = [];
      if (!sfDoc.exists()) {
        // Document doesn't exist, create it and add the toolId
        transaction.set(userFavoritesRef, { favoriteToolIds: [toolId] });
        currentFavoritedStatus = true;
      } else {
        favoriteToolIds = sfDoc.data().favoriteToolIds || [];
        if (favoriteToolIds.includes(toolId)) {
          // Tool is already favorited, remove it
          transaction.update(userFavoritesRef, {
            favoriteToolIds: arrayRemove(toolId),
          });
          currentFavoritedStatus = false;
        } else {
          // Tool is not favorited, add it
          transaction.update(userFavoritesRef, {
            favoriteToolIds: arrayUnion(toolId),
          });
          currentFavoritedStatus = true;
        }
      }
    });
    return { success: true, favorited: currentFavoritedStatus };
  } catch (error) {
    console.error("Error toggling favorite tool:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, favorited: false, message: `操作失败: ${errorMessage}` };
  }
}
