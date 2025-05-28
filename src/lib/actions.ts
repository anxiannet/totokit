
"use server";

import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import type { WeightedCriterion, TotoCombination, HistoricalResult } from "./types";
import { OFFICIAL_PREDICTIONS_DRAW_ID } from "./types";
import { db, auth as firebaseClientAuthInstance } from "./firebase";
import {
  collection, addDoc, serverTimestamp, query, where,
  getDocs, limit, doc, setDoc, // Removed writeBatch, runTransaction as they are not directly used now for single doc updates
  getDoc, // Added getDoc
  updateDoc, // Added updateDoc for map field updates
  orderBy, Timestamp, FieldValue // Keep FieldValue if used by serverTimestamp implicitly
} from "firebase/firestore";
import { dynamicTools } from "./numberPickingAlgos";
import { calculateHitDetails } from "./totoUtils";
import type { HistoricalPerformanceDisplayData } from "@/components/toto/ToolDetailPageClient";


// --- Interfaces for new tool prediction data structure ---
interface PredictionDetail {
  targetDrawDate?: string;
  predictedNumbers: number[];
  savedAt: FieldValue; // serverTimestamp()
}

export interface ToolPredictionsDocument {
  toolId: string;
  toolName: string;
  predictionsByDraw: Record<string, PredictionDetail>; // Key is drawNumber (string)
  lastUpdatedAt: FieldValue;
  userId?: string; // UID of the admin who last updated this document
}

// Interface for data prepared by client, used in saveHistoricalToolPredictions
export interface HistoricalPredictionInputForTool {
  targetDrawNumber: string | number;
  targetDrawDate?: string;
  predictedNumbers: number[];
}


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
    console.error("[ACTION_ERROR] generateTotoPredictions:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred during prediction." };
  }
}


// Saves/Updates the prediction for the current official draw (e.g., "4082")
export async function saveCurrentDrawToolPrediction(
  toolId: string,
  toolName: string,
  predictedNumbers: number[],
  adminUserId: string | null
): Promise<{ success: boolean; message: string }> {
  const targetDrawNumber = OFFICIAL_PREDICTIONS_DRAW_ID;
  console.log(`[SAVE_CURRENT_DRAW_TOOL_PREDICTION] toolId: ${toolId}, toolName: ${toolName}, draw: ${targetDrawNumber}, adminUserId: ${adminUserId}`);
  if (!db) {
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }
  if (!adminUserId) {
    return { success: false, message: "Admin User ID is required to save tool prediction." };
  }

  const toolDocRef = doc(db, "toolPredictions", toolId);
  const drawKey = String(targetDrawNumber);

  try {
    const newPredictionDetail: PredictionDetail = {
      predictedNumbers,
      targetDrawDate: "PENDING_DRAW", // Placeholder for current/future draw
      savedAt: serverTimestamp(),
    };

    // Fetch the existing document to merge predictionsByDraw map correctly
    const docSnap = await getDoc(toolDocRef);
    let existingPredictionsByDraw: Record<string, PredictionDetail> = {};
    if (docSnap.exists()) {
      existingPredictionsByDraw = (docSnap.data() as ToolPredictionsDocument).predictionsByDraw || {};
    }
    
    const updatedPredictionsByDraw = {
      ...existingPredictionsByDraw,
      [drawKey]: newPredictionDetail,
    };

    const docDataToSet: ToolPredictionsDocument = {
      toolId: toolId,
      toolName: toolName,
      predictionsByDraw: updatedPredictionsByDraw,
      userId: adminUserId,
      lastUpdatedAt: serverTimestamp(),
    };

    await setDoc(toolDocRef, docDataToSet, { merge: true }); // mergeFields for specific fields if only updating map

    return { success: true, message: `工具 ${toolName} 对期号 ${targetDrawNumber} 的预测已保存/更新。` };
  } catch (error: any) {
    console.error(`[SAVE_CURRENT_DRAW_TOOL_PREDICTION_ERROR] Error for tool ${toolId}, draw ${targetDrawNumber}:`, error);
    return { success: false, message: `保存预测失败: ${error.message || "未知错误"}` };
  }
}

// Saves multiple historical back-test predictions for a single tool
export async function saveHistoricalToolPredictions(
  toolId: string,
  toolName: string,
  historicalPredictions: Array<HistoricalPredictionInputForTool>,
  adminUserId: string | null
): Promise<{ success: boolean; message: string; savedCount?: number }> {
  console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] toolId: ${toolId}, toolName: ${toolName}, count: ${historicalPredictions.length}, adminUserId: ${adminUserId}`);
  if (!db) {
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }
  if (!adminUserId) {
    return { success: false, message: "Admin User ID is required to save historical predictions." };
  }
  if (historicalPredictions.length === 0) {
    return { success: true, message: "没有需要保存的历史预测。", savedCount: 0 };
  }

  const toolDocRef = doc(db, "toolPredictions", toolId);

  try {
    const docSnap = await getDoc(toolDocRef);
    let existingPredictionsByDraw: Record<string, PredictionDetail> = {};
    if (docSnap.exists()) {
      existingPredictionsByDraw = (docSnap.data() as ToolPredictionsDocument).predictionsByDraw || {};
    }

    historicalPredictions.forEach(pred => {
      const drawKey = String(pred.targetDrawNumber);
      existingPredictionsByDraw[drawKey] = {
        predictedNumbers: pred.predictedNumbers,
        targetDrawDate: pred.targetDrawDate,
        savedAt: serverTimestamp(),
      };
    });
    
    const docDataToSet: ToolPredictionsDocument = {
        toolId: toolId,
        toolName: toolName,
        predictionsByDraw: existingPredictionsByDraw,
        userId: adminUserId,
        lastUpdatedAt: serverTimestamp(),
    };

    await setDoc(toolDocRef, docDataToSet, { merge: true });


    return { success: true, message: `工具 ${toolName} 的 ${historicalPredictions.length} 条历史预测已保存/更新。`, savedCount: historicalPredictions.length };
  } catch (error: any) {
    console.error(`[SAVE_HISTORICAL_TOOL_PREDICTIONS_ERROR] Error for tool ${toolId}:`, error);
    return { success: false, message: `批量保存历史预测失败: ${error.message || "未知错误"}` };
  }
}


// Fetches the prediction for a specific tool and target draw number.
export async function getPredictionForToolAndDraw(
  toolId: string,
  targetDrawNumber: string | number
): Promise<number[] | null> {
  if (!db) {
    console.error("[GET_PREDICTION_FOR_TOOL_DRAW_ERROR] Firestore 'db' instance is not initialized.");
    return null;
  }
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
    // console.log(`[GET_PREDICTION_FOR_TOOL_DRAW_INFO] No prediction found for tool ${toolId}, draw ${drawKey}.`);
    return null;
  } catch (error) {
    console.error(`[GET_PREDICTION_FOR_TOOL_DRAW_ERROR] Error fetching prediction for tool ${toolId}, draw ${drawKey}:`, error);
    return null;
  }
}

// Fetches all tools' predictions for a specific target draw number.
export async function getPredictionsForDraw(
  targetDrawNumber: string | number
): Promise<Record<string, number[]>> { // Returns map of toolId to predictedNumbers
  if (!db) {
    console.error("[GET_PREDICTIONS_FOR_DRAW_ERROR] Firestore 'db' instance is not initialized.");
    return {};
  }

  const predictionsMap: Record<string, number[]> = {};
  const toolPredictionsColRef = collection(db, "toolPredictions");
  const drawKey = String(targetDrawNumber);

  try {
    const querySnapshot = await getDocs(toolPredictionsColRef); // Fetch all documents in toolPredictions
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as ToolPredictionsDocument;
      if (data.toolId && data.predictionsByDraw && data.predictionsByDraw[drawKey]) {
        predictionsMap[data.toolId] = data.predictionsByDraw[drawKey].predictedNumbers;
      }
    });
    // console.log(`[GET_PREDICTIONS_FOR_DRAW_INFO] Processed predictions for draw ${drawKey}. Found in ${Object.keys(predictionsMap).length} tools.`);
    return predictionsMap;
  } catch (error) {
    console.error(`[GET_PREDICTIONS_FOR_DRAW_ERROR] Error fetching predictions for draw ${drawKey}:`, error);
    return {};
  }
}


export interface SmartPickResultInput {
  userId: string | null;
  idToken: string | null;
  drawId: string;
  combinations: TotoCombination[];
}

export async function saveSmartPickResult(
  data: SmartPickResultInput
): Promise<{ success: boolean; message?: string; docId?: string }> {
  const clientAuth = firebaseClientAuthInstance;
  const sdkUserUid = clientAuth.currentUser ? clientAuth.currentUser.uid : null;

  console.log(`[SAVE_SMART_PICK] Received request. Client-provided userId: ${data.userId}, Draw ID: ${data.drawId}, ID Token provided: ${!!data.idToken}`);
  console.log(`[SAVE_SMART_PICK] Firebase SDK auth.currentUser.uid inside action: ${sdkUserUid || "NULL"}`);


  if (!db) {
    console.error("[SAVE_SMART_PICK_ERROR] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }

  try {
    const transformedCombinations = data.combinations.map(combo => ({ numbers: combo }));

    const dataToSave = {
      userId: data.userId, // This should be the UID from the client, or null for guests
      drawId: data.drawId,
      combinations: transformedCombinations,
      createdAt: serverTimestamp(),
    };

    console.log("[SAVE_SMART_PICK] Attempting to save data to Firestore:", JSON.stringify(dataToSave, null, 2));
    const docRef = await addDoc(collection(db, "smartPickResults"), dataToSave);
    console.log(`[SAVE_SMART_PICK_SUCCESS] Smart pick result saved successfully with ID: ${docRef.id} for draw ${data.drawId}, user: ${data.userId || 'anonymous'}`);
    return { success: true, message: "智能选号结果已保存。", docId: docRef.id };
  } catch (error: any) {
    console.error("[SAVE_SMART_PICK_ERROR] Error saving smart pick result to Firestore:", error);
    let errorMessage = "保存智能选号结果失败: ";
     if (error.code === 'permission-denied' || error.code === 7 || error.code === 'PERMISSION_DENIED') {
      errorMessage += `Firestore权限不足。尝试保存的userId: ${data.userId}. 服务器端SDK识别的用户UID: ${sdkUserUid || '未认证/未知'}. 请确认Firestore安全规则已正确部署，并且客户端已重新登录以刷新权限。`;
    } else if (error.code === 'invalid-argument' && error.message.includes('Nested arrays are not supported')) {
      errorMessage += "数据结构错误，可能包含不支持的嵌套数组。这通常在保存组合时发生。";
    } else if (error instanceof Error) {
      errorMessage += error.message;
    } else {
      errorMessage += "未知错误";
    }
    return { success: false, message: errorMessage };
  }
}

export interface SyncRequestDataAdmin {
  jsonDataString: string;
  adminUserId: string | null;
}

export async function syncHistoricalResultsToFirestore(
  jsonDataString: string,
  adminUserId: string | null
): Promise<{ success: boolean; message: string; count?: number }> {
  console.log(`[SYNC_FIRESTORE] Attempting to sync historical results to Firestore. Admin User ID: ${adminUserId}`);
  if (!db) {
    console.error("[SYNC_FIRESTORE_ERROR] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }

  if (!adminUserId) {
    console.error("[SYNC_FIRESTORE_ERROR] Admin user ID not provided for sync. Sync aborted.");
    return { success: false, message: "管理员UID无效，无法同步。" };
  }
  console.log(`[SYNC_FIRESTORE_INFO] Admin user ID: ${adminUserId} initiated sync.`);


  try {
    const results: HistoricalResult[] = JSON.parse(jsonDataString);
    if (!Array.isArray(results)) {
      return { success: false, message: "无效的JSON数据格式，应为一个数组。" };
    }

    const batch = writeBatch(db);
    let count = 0;

    for (const result of results) {
      if (typeof result.drawNumber !== 'number' || !result.date || !Array.isArray(result.numbers)) {
        console.warn("[SYNC_FIRESTORE_WARN] Skipping invalid result object:", result);
        continue;
      }
      const resultDocRef = doc(db, "totoResults", String(result.drawNumber));
      const dataToSet = { ...result, userId: adminUserId }; // Add admin's UID
      batch.set(resultDocRef, dataToSet, { merge: true });
      count++;
    }

    await batch.commit();
    console.log(`[SYNC_FIRESTORE_SUCCESS] Successfully synced ${count} historical results to Firestore by admin ${adminUserId}.`);
    return { success: true, message: `成功同步 ${count} 条开奖结果到 Firestore。`, count };
  } catch (error) {
    console.error("[SYNC_FIRESTORE_ERROR] Error syncing historical results to Firestore:", error);
    let specificMessage = "同步到 Firestore 失败: ";
    if (error instanceof Error) {
      specificMessage += error.message;
      const firebaseError = error as any;
      if (firebaseError.code === 'permission-denied' || firebaseError.code === 'PERMISSION_DENIED' || firebaseError.code === 7) {
        specificMessage += ` (Firestore权限被拒绝。请确认管理员UID ${adminUserId} 正确，且Firestore规则允许此UID写入。可能需要管理员重新登录以刷新ID令牌。)`;
      }
    } else {
      specificMessage += "未知错误";
    }
    console.error(`[SYNC_FIRESTORE_ERROR_DETAILS] Specific error message to be returned: ${specificMessage}`);
    return { success: false, message: specificMessage };
  }
}

export async function updateCurrentDrawDisplayInfo(
  currentDrawDateTime: string,
  currentJackpot: string,
  adminUserId: string | null // Changed from plainTextInfo
): Promise<{ success: boolean; message?: string }> {
  if (!db) {
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }
  if (!adminUserId) {
    console.error("[UPDATE_DRAW_INFO_ERROR] Admin user ID not provided. Update aborted.");
    return { success: false, message: "管理员未登录，无法更新。" };
  }

  if (!currentDrawDateTime || !currentJackpot) {
    return { success: false, message: "开奖日期/时间或头奖金额不能为空。" };
  }

  try {
    const docRef = doc(db, "appSettings", "currentDrawInfo");
    await setDoc(docRef, {
      currentDrawDateTime,
      currentJackpot,
      userId: adminUserId, // Ensure this field is 'userId' to match rule
      updatedAt: serverTimestamp(),
    }, { merge: true });
    console.log(`[UPDATE_DRAW_INFO_SUCCESS] Current draw info updated by admin ${adminUserId}.`);
    return { success: true, message: "本期开奖信息已更新。" };
  } catch (error) {
    console.error("[UPDATE_DRAW_INFO_ERROR] Error updating current draw display info:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { success: false, message: `更新失败: ${errorMessage}` };
  }
}


export async function getCurrentDrawDisplayInfo(): Promise<{ currentDrawDateTime: string; currentJackpot: string } | null> {
  if (!db) {
    console.error("[GET_DRAW_INFO_ERROR] Firestore 'db' instance is not initialized.");
    return null;
  }
  try {
    const docRef = doc(db, "appSettings", "currentDrawInfo");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        currentDrawDateTime: data.currentDrawDateTime || "",
        currentJackpot: data.currentJackpot || "",
      };
    }
    return null;
  } catch (error) {
    console.error("[GET_DRAW_INFO_ERROR] Error fetching current draw display info:", error);
    return null;
  }
}

export interface UserFavoriteTool {
  userId: string;
  toolId: string;
  toolName?: string;
  favoritedAt: Timestamp;
}

export async function getUserFavoriteTools(userId: string): Promise<string[]> {
  if (!userId) return [];
  if (!db) {
    console.error("[GET_FAVORITES_ERROR] Firestore 'db' instance is not initialized.");
    return [];
  }
  try {
    const userFavDocRef = doc(db, "userToolFavorites", userId);
    const docSnap = await getDoc(userFavDocRef);
    if (docSnap.exists() && docSnap.data()?.favoriteToolIds) {
      return docSnap.data()?.favoriteToolIds as string[];
    }
    return [];
  } catch (error) {
    console.error("[GET_FAVORITES_ERROR] Error fetching user favorite tools:", error);
    return [];
  }
}

export async function toggleFavoriteTool(
  userId: string,
  toolId: string,
): Promise<{ success: boolean; favorited: boolean; message?: string }> {
  if (!userId) {
    return { success: false, favorited: false, message: "用户未登录。" };
  }
  if (!db) {
    console.error("[TOGGLE_FAVORITE_ERROR] Firestore 'db' instance is not initialized.");
    return { success: false, favorited: false, message: "数据库服务未初始化。" };
  }

  const userFavDocRef = doc(db, "userToolFavorites", userId);

  try {
    let isCurrentlyFavorited = false;
    // Firestore transaction to safely update the array
    await db.runTransaction(async (transaction) => {
      const userFavDoc = await transaction.get(userFavDocRef);
      let currentFavorites: string[] = [];
      if (userFavDoc.exists() && userFavDoc.data()?.favoriteToolIds) {
        currentFavorites = userFavDoc.data()?.favoriteToolIds as string[];
      }

      if (currentFavorites.includes(toolId)) {
        // Remove from favorites
        transaction.update(userFavDocRef, {
          favoriteToolIds: currentFavorites.filter(id => id !== toolId),
          updatedAt: serverTimestamp()
        });
        isCurrentlyFavorited = false;
      } else {
        // Add to favorites
        transaction.set(userFavDocRef, { // Use set with merge if doc might not exist
          favoriteToolIds: [...currentFavorites, toolId],
          updatedAt: serverTimestamp()
        }, { merge: true });
        isCurrentlyFavorited = true;
      }
    });
    return { success: true, favorited: isCurrentlyFavorited };
  } catch (error) {
    console.error("[TOGGLE_FAVORITE_ERROR] Error toggling favorite tool:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { success: false, favorited: false, message: `操作失败: ${errorMessage}` };
  }
}

export async function getUserSmartPickResults(userId: string, drawId: string): Promise<TotoCombination[] | null> {
  const clientAuth = firebaseClientAuthInstance;
  const sdkUserUid = clientAuth.currentUser ? clientAuth.currentUser.uid : null;

  if (!userId) {
    console.log("[GET_USER_SMART_PICKS_INFO] No userId provided.");
    return null;
  }
  if (!db) {
    console.error("[GET_USER_SMART_PICKS_ERROR] Firestore 'db' instance is not initialized.");
    return null;
  }

  console.log(`[GET_USER_SMART_PICKS_INFO] Fetching smart picks for userId: ${userId}, drawId: ${drawId}. Client SDK user: ${sdkUserUid || 'NULL'}`);
  try {
    const q = query(
      collection(db, "smartPickResults"),
      where("userId", "==", userId),
      where("drawId", "==", drawId),
      orderBy("createdAt", "desc"),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      console.log(`[GET_USER_SMART_PICKS_INFO] No smart pick results found for userId: ${userId}, drawId: ${drawId}`);
      return null;
    }

    const docData = querySnapshot.docs[0].data();
    if (docData.combinations && Array.isArray(docData.combinations)) {
      const combinations: TotoCombination[] = docData.combinations.map(
        (comboObj: any) => comboObj.numbers || []
      ).filter((combo: number[]) => combo.length > 0);
      console.log(`[GET_USER_SMART_PICKS_INFO] Found ${combinations.length} combinations for userId: ${userId}, drawId: ${drawId}`);
      return combinations;
    }
    console.log("[GET_USER_SMART_PICKS_WARN] Found document, but combinations format is unexpected or missing for userId: ${userId}, drawId: ${drawId}");
    return null;
  } catch (error) {
    console.error(`[GET_USER_SMART_PICKS_ERROR] Error fetching smart pick results for userId: ${userId}, drawId: ${drawId}:`, error);
    return null;
  }
}

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
        } as HistoricalResult);
      } else {
        console.warn("[GET_ALL_HISTORICAL_WARN] Skipping document with invalid data structure:", docSnap.id, data);
      }
    });
    console.log(`[GET_ALL_HISTORICAL_INFO] Fetched ${results.length} results from Firestore.`);
    return results;
  } catch (error) {
    console.error("[GET_ALL_HISTORICAL_ERROR] Error fetching historical results from Firestore:", error);
    return [];
  }
}

export async function calculateHistoricalPerformances(
  toolId: string,
  allHistoricalData: HistoricalResult[]
): Promise<HistoricalPerformanceDisplayData[]> {
  const tool = dynamicTools.find((t) => t.id === toolId);
  if (!tool) {
    console.error(`[CALCULATE_HISTORICAL_PERFORMANCES_ERROR] Tool with id ${toolId} not found.`);
    return [];
  }
  if (!allHistoricalData || allHistoricalData.length === 0) {
    console.log("[CALCULATE_HISTORICAL_PERFORMANCES_INFO] No historical data provided for analysis.");
    return [];
  }

  const performances: HistoricalPerformanceDisplayData[] = [];
  const recentTenHistoricalDrawsForAnalysis = allHistoricalData.slice(0, 10);

  for (const targetDraw of recentTenHistoricalDrawsForAnalysis) {
    const originalIndex = allHistoricalData.findIndex(d => d.drawNumber === targetDraw.drawNumber);
    if (originalIndex === -1) continue;

    const precedingDrawsStartIndex = originalIndex + 1;
    const precedingDrawsEndIndex = precedingDrawsStartIndex + 10;
    const precedingTenDraws = allHistoricalData.slice(precedingDrawsStartIndex, precedingDrawsEndIndex);

    let predictionBasisDraws: string | null = null;
    if (precedingTenDraws.length > 0) {
      const firstPreceding = precedingTenDraws[0];
      const lastPreceding = precedingTenDraws[precedingTenDraws.length - 1];
      if (firstPreceding && lastPreceding) {
        predictionBasisDraws = `基于期号: ${firstPreceding.drawNumber}${precedingTenDraws.length > 1 ? ` - ${lastPreceding.drawNumber}` : ''} (共${precedingTenDraws.length}期)`;
      }
    } else {
      predictionBasisDraws = "无足够前期数据";
    }

    let predictedNumbersForTargetDraw: number[] = [];
    if (precedingTenDraws.length > 0 || tool.algorithmFn.length === 0) { // Allow algos that don't need history
        predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
    }


    const hitDetails = calculateHitDetails(predictedNumbersForTargetDraw, targetDraw);
    const hitRate = targetDraw.numbers.length > 0 && predictedNumbersForTargetDraw.length > 0
      ? (hitDetails.mainHitCount / Math.min(predictedNumbersForTargetDraw.length, 6)) * 100
      : 0;
    const hasAnyHit = hitDetails.mainHitCount > 0 || hitDetails.matchedAdditionalNumberDetails.matched;

    performances.push({
      targetDraw,
      predictedNumbersForTargetDraw,
      hitDetails,
      hitRate,
      hasAnyHit,
      predictionBasisDraws,
    });
  }
  return performances;
}

// New server action to calculate prediction for a single tool
export async function calculateSingleToolPrediction(
  toolId: string,
  latestTenHistoricalData: HistoricalResult[]
): Promise<number[] | null> {
  console.log(`[CALCULATE_SINGLE_TOOL_PREDICTION] toolId: ${toolId}, historicalData length: ${latestTenHistoricalData.length}`);
  const tool = dynamicTools.find((t) => t.id === toolId);
  if (!tool) {
    console.error(`[CALCULATE_SINGLE_TOOL_PREDICTION_ERROR] Tool with id ${toolId} not found.`);
    return null;
  }
  
  // Allow algorithms that don't strictly need historical data (e.g., pure random)
  // They might have `algorithmFn(lastTenResults: HistoricalResult[] = [])`
  // Or, if an algorithm truly requires historical data and it's empty, it should handle returning [] itself.
  // For safety, we pass what we have.
  // if (!latestTenHistoricalData || latestTenHistoricalData.length === 0) {
  //    console.warn(`[CALCULATE_SINGLE_TOOL_PREDICTION_WARN] No historical data provided for tool ${toolId}.`);
  //    // Return empty array or a default prediction if preferred for this case
  //    return tool.algorithmFn([]); // Allow algorithm to handle empty input if designed to
  // }

  try {
    const predictedNumbers = tool.algorithmFn(latestTenHistoricalData);
    console.log(`[CALCULATE_SINGLE_TOOL_PREDICTION] Tool ${toolId} predicted:`, predictedNumbers);
    return predictedNumbers;
  } catch (error) {
    console.error(`[CALCULATE_SINGLE_TOOL_PREDICTION_ERROR] Error in algorithmFn for tool ${toolId}:`, error);
    return null;
  }
}
