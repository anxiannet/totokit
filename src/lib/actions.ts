
"use server";

import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import type { WeightedCriterion, TotoCombination, HistoricalResult, ToolPredictionInput, PredictionDetail, ToolPredictionsDocument, HistoricalPerformanceDisplayData } from "./types";
import { OFFICIAL_PREDICTIONS_DRAW_ID } from "./types";
import { db, auth as firebaseClientAuthInstance } from "./firebase"; // Renamed authInstance to firebaseClientAuthInstance for clarity
import {
  collection,
  getDocs, limit, doc, setDoc,
  getDoc,
  updateDoc,
  orderBy, Timestamp, FieldValue, writeBatch
} from "firebase/firestore";
import { dynamicTools } from "./numberPickingAlgos";
import { calculateHitDetails as utilCalculateHitDetails, type HitDetails } from "./totoUtils";


// --- Historical TOTO Results Sync (Admin) ---
export async function syncHistoricalResultsToFirestore(
  jsonDataString: string,
  adminUserId: string | null
): Promise<{ success: boolean; message: string; count?: number }> {
  console.log(`[SYNC_HISTORICAL_FIRESTORE] Attempting sync. AdminUID: ${adminUserId}`);
  if (!db) {
    console.error("[SYNC_HISTORICAL_FIRESTORE] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }
  if (!adminUserId) {
    console.error("[SYNC_HISTORICAL_FIRESTORE] Admin User ID is required for sync.");
    return { success: false, message: "管理员UID无效，无法同步。需要管理员登录并验证。" };
  }

  try {
    const results: HistoricalResult[] = JSON.parse(jsonDataString);
    if (!Array.isArray(results)) {
      return { success: false, message: "无效的JSON数据格式，应为一个数组。" };
    }
    console.log(`[SYNC_HISTORICAL_FIRESTORE] Parsed ${results.length} results from JSON string.`);
    const batch = writeBatch(db);
    let count = 0;
    for (const result of results) {
      if (typeof result.drawNumber !== 'number' || !result.date || !Array.isArray(result.numbers)) {
        console.warn("[SYNC_HISTORICAL_FIRESTORE_SKIP] Skipping invalid result:", result);
        continue;
      }
      const resultDocRef = doc(db, "totoResults", String(result.drawNumber));
      // Add adminUserId to the document being written to satisfy Firestore rules
      batch.set(resultDocRef, { ...result, userId: adminUserId }, { merge: true });
      count++;
    }
    await batch.commit();
    console.log(`[SYNC_HISTORICAL_FIRESTORE_SUCCESS] Synced ${count} results by admin ${adminUserId}.`);
    return { success: true, message: `成功同步 ${count} 条开奖结果到 Firestore。`, count };
  } catch (error: any) {
    let specificMessage = "同步到 Firestore 失败: ";
    if (error instanceof Error) {
      specificMessage += error.message;
      const firebaseError = error as any;
      if (firebaseError.code === 'permission-denied' || firebaseError.code === 'PERMISSION_DENIED' || firebaseError.code === 7) {
        specificMessage += ` (Firestore权限被拒绝。管理员UID ${adminUserId}。请确认管理员声明已在客户端和服务端生效，且Firestore规则允许此UID写入。)`;
      }
    } else {
      specificMessage += "未知错误";
    }
    console.error("[SYNC_HISTORICAL_FIRESTORE_ERROR_DETAILS]", specificMessage, error);
    return { success: false, message: specificMessage };
  }
}

// --- Current Draw Display Info (Admin & Client) ---
export interface CurrentDrawInfo {
  currentDrawDateTime: string;
  currentJackpot: string;
  userId?: string;
  updatedAt?: FieldValue;
}

export async function updateCurrentDrawDisplayInfo(
  data: { currentDrawDateTime: string; currentJackpot: string },
  adminUserId: string | null
): Promise<{ success: boolean; message?: string }> {
  if (!db) {
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }
  if (!adminUserId) {
    return { success: false, message: "管理员未登录或UID无效，无法更新。" };
  }
  if (!data.currentDrawDateTime || !data.currentJackpot) {
    return { success: false, message: "开奖日期/时间或头奖金额不能为空。" };
  }
  try {
    const docRef = doc(db, "appSettings", "currentDrawInfo");
    await setDoc(docRef, {
      currentDrawDateTime: data.currentDrawDateTime,
      currentJackpot: data.currentJackpot,
      userId: adminUserId, // Changed from updatedBy to userId for consistency with rules
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true, message: "本期开奖信息已更新。" };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error("[UPDATE_DRAW_INFO_ERROR]", errorMessage, error);
    return { success: false, message: `更新失败: ${errorMessage}` };
  }
}

export async function getCurrentDrawDisplayInfo(): Promise<CurrentDrawInfo | null> {
  if (!db) return null;
  try {
    const docRef = doc(db, "appSettings", "currentDrawInfo");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        currentDrawDateTime: data.currentDrawDateTime || "",
        currentJackpot: data.currentJackpot || "",
        userId: data.userId, // Include userId if present
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching current draw display info:", error);
    return null;
  }
}

// --- User Favorite Tools ---
export interface UserFavoriteTool {
  userId: string;
  toolId: string;
  toolName?: string;
  favoritedAt: Timestamp;
}

export async function getUserFavoriteTools(userId: string): Promise<string[]> {
  if (!userId || !db) return [];
  try {
    const userFavDocRef = doc(db, "userToolFavorites", userId);
    const docSnap = await getDoc(userFavDocRef);
    if (docSnap.exists() && docSnap.data()?.favoriteToolIds) {
      return docSnap.data()?.favoriteToolIds as string[];
    }
    return [];
  } catch (error) {
    console.error("Error fetching user favorite tools:", error);
    return [];
  }
}

export async function toggleFavoriteTool(
  userId: string,
  toolId: string,
): Promise<{ success: boolean; favorited: boolean; message?: string }> {
  if (!userId || !db) return { success: false, favorited: false, message: "用户未登录或数据库服务未初始化。" };

  const userFavDocRef = doc(db, "userToolFavorites", userId);

  try {
    let isCurrentlyFavorited = false;
    await db.runTransaction(async (transaction) => {
      const userFavDoc = await transaction.get(userFavDocRef);
      let currentFavorites: string[] = [];
      if (userFavDoc.exists() && userFavDoc.data()?.favoriteToolIds) {
        currentFavorites = userFavDoc.data()?.favoriteToolIds as string[];
      }

      if (currentFavorites.includes(toolId)) {
        transaction.update(userFavDocRef, {
          favoriteToolIds: currentFavorites.filter(id => id !== toolId),
          updatedAt: serverTimestamp()
        });
        isCurrentlyFavorited = false;
      } else {
        transaction.set(userFavDocRef, {
          favoriteToolIds: [...currentFavorites, toolId],
          updatedAt: serverTimestamp()
        }, { merge: true });
        isCurrentlyFavorited = true;
      }
    });
    return { success: true, favorited: isCurrentlyFavorited };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error(`Error toggling favorite for tool ${toolId}, user ${userId}:`, error);
    return { success: false, favorited: false, message: `操作失败: ${errorMessage}` };
  }
}

// --- Fetching All Historical Results (for client-side use in components) ---
export async function getAllHistoricalResultsFromFirestore(): Promise<HistoricalResult[]> {
  if (!db) {
    console.error("[GET_ALL_HISTORICAL_ERROR] Firestore 'db' instance is not initialized.");
    return [];
  }
  try {
    const resultsCol = collection(db, "totoResults");
    const q = query(resultsCol, orderBy("drawNumber", "desc"));
    const querySnapshot = await getDocs(q);
    const results: HistoricalResult[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Basic validation for core fields
      if (
        typeof data.drawNumber === 'number' &&
        typeof data.date === 'string' &&
        Array.isArray(data.numbers) &&
        typeof data.additionalNumber === 'number'
      ) {
        results.push({
          drawNumber: data.drawNumber,
          date: data.date,
          numbers: data.numbers,
          additionalNumber: data.additionalNumber,
          // userId: data.userId, // Include userId if present, useful for debugging who saved it
        } as HistoricalResult); // Casting, assuming data structure matches
      } else {
        console.warn("[GET_ALL_HISTORICAL_WARN] Skipping document with invalid structure:", docSnap.id, data);
      }
    });
    return results;
  } catch (error) {
    console.error("Error fetching historical results from Firestore:", error);
    return [];
  }
}


// --- Tool Predictions Management (One document per tool) ---

// Save/Update a single prediction for a tool and a specific draw (e.g., OFFICIAL_PREDICTIONS_DRAW_ID)
export async function saveCurrentDrawToolPrediction(
  data: ToolPredictionInput
): Promise<{ success: boolean; message: string }> {
  console.log("[SAVE_CURRENT_DRAW_TOOL_PREDICTION] Attempting to save:", JSON.stringify(data, null, 2));
  if (!db) return { success: false, message: "Firestore 'db' instance is not initialized." };
  if (!data.userId) return { success: false, message: "Admin User ID is required to save tool prediction." };
  if (!data.toolId || !data.targetDrawNumber) return { success: false, message: "Tool ID and Target Draw Number are required." };

  const toolDocRef = doc(db, "toolPredictions", data.toolId);
  const drawKey = String(data.targetDrawNumber);

  try {
    const newPredictionDetail: PredictionDetail = {
      predictedNumbers: data.predictedNumbers,
      targetDrawDate: data.targetDrawDate || "PENDING_DRAW", // Default if not provided
      savedAt: serverTimestamp(),
      userId: data.userId, // Admin who saved this specific prediction
    };

    // Using updateDoc with dot notation for nested map update
    // This requires the document toolPredictions/{toolId} to exist.
    // If it might not exist, we'd need a get() then set() or a transaction.
    // For simplicity, assuming the admin workflow might create the doc if it's the first time.
    // More robust: get doc, if not exists, set with initial structure, then update.
    // Or use set with merge:true but carefully construct the payload.

    const docSnap = await getDoc(toolDocRef);
    const updatePayload: Record<string, any> = {
      toolName: data.toolName, // Keep toolName at the top level
      userId: data.userId, // Admin who last updated this tool's document
      lastUpdatedAt: serverTimestamp(),
      [`predictionsByDraw.${drawKey}`]: newPredictionDetail // Dot notation to update specific map entry
    };


    if (docSnap.exists()) {
      await updateDoc(toolDocRef, updatePayload);
    } else {
      // Document doesn't exist, create it with the first prediction
      const initialDocData: ToolPredictionsDocument = {
        toolId: data.toolId,
        toolName: data.toolName,
        userId: data.userId,
        lastUpdatedAt: serverTimestamp(),
        predictionsByDraw: {
          [drawKey]: newPredictionDetail
        }
      };
      await setDoc(toolDocRef, initialDocData);
    }

    console.log(`[SAVE_CURRENT_DRAW_TOOL_PREDICTION_SUCCESS] Prediction for tool ${data.toolId}, draw ${drawKey} saved/updated.`);
    return { success: true, message: `工具 ${data.toolName} 对期号 ${drawKey} 的预测已保存/更新。` };
  } catch (error: any) {
    console.error(`[SAVE_CURRENT_DRAW_TOOL_PREDICTION_ERROR] for tool ${data.toolId}, draw ${drawKey}:`, error);
    return { success: false, message: `保存预测失败: ${error.message || "未知错误"}` };
  }
}


// Save/Update multiple historical predictions within a tool's document
export async function saveHistoricalToolPredictions(
  toolId: string,
  toolName: string,
  historicalPredictions: ToolPredictionInput[],
  adminUserId?: string
): Promise<{ success: boolean; message: string; savedCount?: number }> {
  console.log(
    `[SAVE_HISTORICAL_TOOL_PREDICTIONS] toolId: ${toolId}, toolName: ${toolName}, ` +
    `count: ${historicalPredictions.length}, adminUserId: ${adminUserId}`
  );

  if (!db) return { success: false, message: "Firestore 'db' instance is not initialized." };
  if (!adminUserId) return { success: false, message: "Admin User ID is required for saving historical predictions." };
  if (historicalPredictions.length === 0) return { success: true, message: "没有需要保存的历史预测。", savedCount: 0 };

  const toolDocRef = doc(db, "toolPredictions", toolId);
  console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Document path: ${toolDocRef.path}`);

  try {
    const docSnap = await getDoc(toolDocRef);
    let predictionsMapUpdates: Record<string, PredictionDetail> = {};
    let currentPredictionsByDraw: Record<string, PredictionDetail> = {};

    if (docSnap.exists() && docSnap.data()?.predictionsByDraw) {
      currentPredictionsByDraw = docSnap.data()?.predictionsByDraw;
    }
     console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Found existing doc: ${docSnap.exists()}, with ${Object.keys(currentPredictionsByDraw).length} predictions.`);


    historicalPredictions.forEach(pred => {
      if (!pred.targetDrawNumber) {
        console.warn("[SAVE_HISTORICAL_TOOL_PREDICTIONS] Skipping prediction with no targetDrawNumber:", pred);
        return;
      }
      const drawKey = String(pred.targetDrawNumber);
      predictionsMapUpdates[drawKey] = {
        predictedNumbers: pred.predictedNumbers,
        targetDrawDate: pred.targetDrawDate || "HISTORICAL_DRAW_DATE_MISSING",
        savedAt: serverTimestamp(),
        userId: pred.userId || adminUserId,
      };
    });

    if (Object.keys(predictionsMapUpdates).length === 0) {
      console.log("[SAVE_HISTORICAL_TOOL_PREDICTIONS] No valid historical predictions to update/add.");
      return { success: true, message: "没有有效预测可保存到历史记录。", savedCount: 0 };
    }
    
    const finalPredictionsByDraw = { ...currentPredictionsByDraw, ...predictionsMapUpdates };
    
    const docDataToSet: ToolPredictionsDocument = {
        toolId: toolId,
        toolName: toolName,
        predictionsByDraw: finalPredictionsByDraw,
        userId: adminUserId, // Admin who performed this bulk update
        lastUpdatedAt: serverTimestamp(),
    };
    console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Preparing to set document with ${Object.keys(finalPredictionsByDraw).length} total predictions in map. Admin: ${adminUserId}`);


    await setDoc(toolDocRef, docDataToSet, { merge: true }); // Using merge:true to be safe if creating new

    const savedCount = Object.keys(predictionsMapUpdates).length; // Number of predictions processed in this batch
    console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Successfully saved/updated ${savedCount} historical predictions for tool ${toolId}. Total predictions in map: ${Object.keys(finalPredictionsByDraw).length}.`);
    return {
      success: true,
      message: `工具 ${toolName} 的 ${savedCount} 条历史预测已保存/更新。`,
      savedCount: savedCount
    };
  } catch (error: any)
 {
    console.error(`[SAVE_HISTORICAL_TOOL_PREDICTIONS_ERROR] Error for tool ${toolId}:`, error);
    const fullErrorMessage = error.message || "未知错误";
    const code = error.code || "UNKNOWN_CODE";
    return { success: false, message: `批量保存历史预测失败: ${code} - ${fullErrorMessage}` };
  }
}


// Fetches predictions for a specific tool and target draw number.
export async function getPredictionForToolAndDraw(
  toolId: string,
  targetDrawNumber: string | number
): Promise<number[] | null> {
  if (!db) return null;
  const toolDocRef = doc(db, "toolPredictions", toolId);
  const drawKey = String(targetDrawNumber);
  try {
    const docSnap = await getDoc(toolDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as ToolPredictionsDocument;
      if (data.predictionsByDraw && data.predictionsByDraw[drawKey]) {
        return data.predictionsByDraw[drawKey].predictedNumbers;
      }
    }
    return null;
  } catch (error) {
    console.error(`Error fetching prediction for tool ${toolId}, draw ${drawKey}:`, error);
    return null;
  }
}

// Fetches all predictions from all tools for a specific target draw number.
export async function getPredictionsForDraw(
  targetDrawNumber: string | number
): Promise<Record<string, number[]>> {
  if (!db) return {};
  const predictionsMap: Record<string, number[]> = {};
  const toolPredictionsColRef = collection(db, "toolPredictions");
  const drawKey = String(targetDrawNumber);

  try {
    const querySnapshot = await getDocs(toolPredictionsColRef);
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as ToolPredictionsDocument;
      if (data.toolId && data.predictionsByDraw && data.predictionsByDraw[drawKey]) {
        predictionsMap[data.toolId] = data.predictionsByDraw[drawKey].predictedNumbers;
      }
    });
    return predictionsMap;
  } catch (error) {
    console.error(`Error fetching predictions for draw ${drawKey}:`, error);
    return {};
  }
}

// Fetches all saved historical predictions for a given tool.
export async function getSavedHistoricalPredictionsForTool(
  toolId: string
): Promise<Record<string, PredictionDetail> | null> {
  if (!db) {
    console.error(`[GET_SAVED_HISTORICAL] Firestore 'db' not initialized for tool ${toolId}.`);
    return null;
  }
  const toolDocRef = doc(db, "toolPredictions", toolId);
  try {
    const docSnap = await getDoc(toolDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as ToolPredictionsDocument;
      console.log(`[GET_SAVED_HISTORICAL] Found saved predictions for tool ${toolId}:`, Object.keys(data.predictionsByDraw || {}).length, "entries.");
      return data.predictionsByDraw || {}; // Return the map or an empty object if null
    }
    console.log(`[GET_SAVED_HISTORICAL] No saved predictions document found for tool ${toolId}.`);
    return null;
  } catch (error: any) {
    console.error(`[GET_SAVED_HISTORICAL_ERROR] Error fetching saved historical predictions for tool ${toolId}:`, error);
    return null;
  }
}


// --- Tool Algorithm Calculations (Server Actions) ---

// Calculates historical performance for a single tool based on all historical data
export async function calculateHistoricalPerformances(
  toolId: string,
  allHistoricalData: HistoricalResult[]
): Promise<HistoricalPerformanceDisplayData[]> {
  console.log(`[CALC_HIST_PERF] Calculating for toolId: ${toolId} with ${allHistoricalData.length} historical draws.`);
  const tool = dynamicTools.find((t) => t.id === toolId);
  if (!tool) {
    console.error(`[CALC_HIST_PERF_ERROR] Tool not found: ${toolId}`);
    return [];
  }

  const performances: HistoricalPerformanceDisplayData[] = [];

  for (let i = 0; i < allHistoricalData.length; i++) {
    const targetDraw = allHistoricalData[i];
    // Ensure targetDraw and its numbers are valid
    if (!targetDraw || !targetDraw.numbers || typeof targetDraw.additionalNumber === 'undefined') {
        console.warn(`[CALC_HIST_PERF_WARN] Skipping invalid targetDraw at index ${i}:`, targetDraw);
        continue;
    }

    // Preceding 10 draws are from index i+1 to i+10
    const precedingTenDraws = allHistoricalData.slice(i + 1, i + 1 + 10);

    if (precedingTenDraws.length < 10) {
      // Not enough preceding data for a prediction based on 10 draws for this targetDraw.
      // This means we can't back-test the very oldest 9 draws in the dataset.
      console.log(`[CALC_HIST_PERF] Not enough preceding data for targetDraw ${targetDraw.drawNumber}. Needed 10, got ${precedingTenDraws.length}.`);
      continue; // Skip this targetDraw
    }

    let predictionBasisDraws: string | null = null;
    const firstPreceding = precedingTenDraws[0];
    const lastPreceding = precedingTenDraws[precedingTenDraws.length - 1];

    if (firstPreceding && lastPreceding) {
        predictionBasisDraws = `基于期号: ${firstPreceding.drawNumber}${precedingTenDraws.length > 1 ? ` - ${lastPreceding.drawNumber}`: ""} (共${precedingTenDraws.length}期)`;
    } else if (firstPreceding) {
        predictionBasisDraws = `基于期号: ${firstPreceding.drawNumber} (共1期)`;
    }


    const predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
    const hitDetails = utilCalculateHitDetails(predictedNumbersForTargetDraw, targetDraw);

    const hitRate = predictedNumbersForTargetDraw.length > 0
      ? (hitDetails.mainHitCount / predictedNumbersForTargetDraw.length) * 100
      : 0;

    const hasAnyHit = hitDetails.mainHitCount > 0 || (hitDetails.matchedAdditionalNumberDetails?.matched ?? false);

    performances.push({
      targetDraw,
      predictedNumbersForTargetDraw,
      hitDetails,
      hitRate: parseFloat(hitRate.toFixed(1)),
      hasAnyHit,
      predictionBasisDraws,
      isSavedPrediction: false, // This is a calculated performance, not directly from DB in this context
    });
  }
  console.log(`[CALC_HIST_PERF] Finished. Generated ${performances.length} performance entries for tool ${toolId}.`);
  return performances;
}

// Calculates prediction for a single tool based on the latest 10 historical data points
export async function calculateSingleToolPrediction(
  toolId: string,
  latestTenHistoricalData: HistoricalResult[]
): Promise<number[] | null> {
  const tool = dynamicTools.find((t) => t.id === toolId);
  if (!tool) {
    console.error(`[CALC_SINGLE_PRED_ERROR] Tool not found: ${toolId}`);
    return null;
  }
  if (!latestTenHistoricalData || latestTenHistoricalData.length === 0) {
     console.warn(`[CALC_SINGLE_PRED_WARN] No historical data provided for tool ${toolId}. Cannot generate prediction.`);
     return []; // Return empty array as per tool algo expectations
  }
  // Tools expect up to 10 draws, so if fewer are provided, they should handle it.
  // No specific warning here if less than 10, as algos are designed for flexibility.

  try {
    return tool.algorithmFn(latestTenHistoricalData);
  } catch (error) {
    console.error(`[CALC_SINGLE_PRED_ERROR] Error in algorithmFn for tool ${toolId}:`, error);
    return null;
  }
}


// --- Genkit AI Prediction (Main page "Smart Pick") ---
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


    return { combinations: validCombinations as TotoCombination[] };
  } catch (error) {
    console.error("Error in generateTotoPredictions Genkit call:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred during prediction." };
  }
}
