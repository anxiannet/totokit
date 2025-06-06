
"use server";

import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { 
  HistoricalResult, 
  SmartPickResultInput, 
  ToolPredictionInput, 
  TotoCombination, 
  WeightedCriterion, 
  PredictionDetail, 
  ToolPredictionsDocument, 
  CurrentDrawInfo as CurrentDrawInfoType,
  HistoricalPerformanceDisplayData // Ensure this type is exported or defined if used by client
} from "./types";
import { TOTO_NUMBER_RANGE } from "./types";
import { auth as firebaseClientAuthInstance, db } from "./firebase";
import { dynamicTools } from "./numberPickingAlgos";
import { calculateHitDetails as utilCalculateHitDetails, type HitDetails } from "./totoUtils";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
  type Timestamp
} from "firebase/firestore";


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
  if (!adminUserId || adminUserId !== "mAvLawNGpGdKwPoHuMQyXlKpPNv1") { 
    console.error("[SYNC_HISTORICAL_FIRESTORE] Invalid or non-admin User ID for sync.");
    return { success: false, message: "需要有效的管理员权限 (UID不匹配)。" };
  }

  try {
    const results: Omit<HistoricalResult, 'userId'>[] = JSON.parse(jsonDataString);
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
      // Add adminUserId to each result document for the Firestore rule
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
        specificMessage += ` (Firestore权限被拒绝。管理员UID ${adminUserId}。请确认Firestore规则配置正确，并且此UID有权限写入。当前规则要求文档中的userId字段匹配此UID。)`;
      }
    } else {
      specificMessage += "未知错误";
    }
    console.error("[SYNC_HISTORICAL_FIRESTORE_ERROR_DETAILS]", specificMessage, error);
    return { success: false, message: specificMessage };
  }
}

// --- Current Draw Display Info (Admin & Client) ---
interface UpdateCurrentDrawInfoInput {
  currentDrawDateTime: string;
  currentJackpot: string;
  officialPredictionsDrawId: string;
}

export async function updateCurrentDrawDisplayInfo(
  data: UpdateCurrentDrawInfoInput,
  adminUserId: string | null
): Promise<{ success: boolean; message?: string }> {
  if (!db) {
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }
  if (!adminUserId || adminUserId !== "mAvLawNGpGdKwPoHuMQyXlKpPNv1") { 
    return { success: false, message: "需要有效的管理员权限 (UID不匹配)才能更新。" };
  }
  if (!data.currentDrawDateTime || !data.currentJackpot || !data.officialPredictionsDrawId) {
    return { success: false, message: "开奖日期/时间、头奖金额或官方预测期号不能为空。" };
  }
  try {
    const docRef = doc(db, "appSettings", "currentDrawInfo");
    await setDoc(docRef, {
      currentDrawDateTime: data.currentDrawDateTime,
      currentJackpot: data.currentJackpot,
      officialPredictionsDrawId: data.officialPredictionsDrawId,
      userId: adminUserId, 
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true, message: "应用设置（开奖信息和预测期号）已更新。" };
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    console.error("[UPDATE_DRAW_INFO_ERROR]", errorMessage, error);
    return { success: false, message: `更新失败: ${errorMessage}` };
  }
}

export async function getCurrentDrawDisplayInfo(): Promise<CurrentDrawInfoType | null> {
  if (!db) return null;
  try {
    const docRef = doc(db, "appSettings", "currentDrawInfo");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        currentDrawDateTime: data.currentDrawDateTime || "",
        currentJackpot: data.currentJackpot || "",
        officialPredictionsDrawId: data.officialPredictionsDrawId || "4082", // Default if not set
        userId: data.userId,
      };
    }
    // If doc doesn't exist, return defaults
    return {
        currentDrawDateTime: "周四, 2025年5月29日, 傍晚6点30分",
        currentJackpot: "$4,500,000",
        officialPredictionsDrawId: "4082",
    };
  } catch (error) {
    console.error("Error fetching current draw display info:", error);
    // Fallback to defaults on error as well
     return {
        currentDrawDateTime: "周四, 2025年5月29日, 傍晚6点30分",
        currentJackpot: "$4,500,000",
        officialPredictionsDrawId: "4082",
    };
  }
}

// --- User Favorite Tools ---
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

// --- Fetching All Historical Results ---
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
          userId: data.userId // Include userId if it exists
        } as HistoricalResult);
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
export async function saveCurrentDrawToolPrediction(
  toolId: string,
  toolName: string,
  targetDrawNumber: string | number,
  targetDrawDate: string, 
  predictedNumbers: number[],
  adminUserId: string | null
): Promise<{ success: boolean; message: string }> {
  console.log(`[SAVE_CURRENT_DRAW_TOOL_PREDICTION] Tool: ${toolId}, Draw: ${targetDrawNumber}, Admin: ${adminUserId}`);
  if (!db) return { success: false, message: "Firestore 'db' instance is not initialized." };
  if (!adminUserId || adminUserId !== "mAvLawNGpGdKwPoHuMQyXlKpPNv1") {
    return { success: false, message: "需要有效的管理员权限 (UID不匹配) 才能保存工具预测。" };
  }
  if (!toolId || !targetDrawNumber) return { success: false, message: "Tool ID and Target Draw Number are required." };

  const toolDocRef = doc(db, "toolPredictions", toolId);
  const drawKey = String(targetDrawNumber);

  try {
    const newPredictionDetail: PredictionDetail = {
      predictedNumbers: predictedNumbers,
      targetDrawDate: targetDrawDate, // Can be "PENDING_DRAW" or actual date
      savedAt: serverTimestamp(),
      userId: adminUserId,
    };

    const docSnap = await getDoc(toolDocRef);
    let currentPredictionsByDraw: Record<string, PredictionDetail> = {};
    if (docSnap.exists() && docSnap.data()?.predictionsByDraw) {
      currentPredictionsByDraw = docSnap.data()?.predictionsByDraw;
    }

    const updatedPredictionsByDraw = {
      ...currentPredictionsByDraw,
      [drawKey]: newPredictionDetail,
    };
    
    const docDataToSet: ToolPredictionsDocument = {
      toolId: toolId,
      toolName: toolName,
      predictionsByDraw: updatedPredictionsByDraw,
      userId: adminUserId,
      lastUpdatedAt: serverTimestamp(),
    };

    await setDoc(toolDocRef, docDataToSet, { merge: true });

    console.log(`[SAVE_CURRENT_DRAW_TOOL_PREDICTION_SUCCESS] Prediction for tool ${toolId}, draw ${drawKey} saved/updated.`);
    return { success: true, message: `工具 ${toolName} 对期号 ${drawKey} 的预测已保存/更新。` };
  } catch (error: any) {
    console.error(`[SAVE_CURRENT_DRAW_TOOL_PREDICTION_ERROR] for tool ${toolId}, draw ${drawKey}:`, error);
    return { success: false, message: `保存预测失败: ${error.message || "未知错误"}` };
  }
}

export async function saveHistoricalToolPredictions(
  toolId: string,
  toolName: string,
  historicalPredictions: Array<Omit<ToolPredictionInput, 'toolId' | 'toolName' | 'userId' >>,
  adminUserId: string | null
): Promise<{ success: boolean; message: string; savedCount?: number }> {
  console.log(
    `[SAVE_HISTORICAL_TOOL_PREDICTIONS] toolId: ${toolId}, toolName: ${toolName}, ` +
    `count: ${historicalPredictions.length}, adminUserId: ${adminUserId}`
  );

  if (!db) return { success: false, message: "Firestore 'db' instance is not initialized." };
  if (!adminUserId || adminUserId !== "mAvLawNGpGdKwPoHuMQyXlKpPNv1") {
    return { success: false, message: "需要有效的管理员权限 (UID不匹配) 才能保存历史预测。" };
  }
  if (historicalPredictions.length === 0) return { success: true, message: "没有需要保存的历史预测。", savedCount: 0 };

  const toolDocRef = doc(db, "toolPredictions", toolId);
  console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Document path: ${toolDocRef.path}`);

  try {
    const docSnap = await getDoc(toolDocRef);
    let currentPredictionsByDraw: Record<string, PredictionDetail> = {};

    if (docSnap.exists() && docSnap.data()?.predictionsByDraw) {
      currentPredictionsByDraw = docSnap.data()?.predictionsByDraw;
      console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Found existing doc for tool ${toolId} with ${Object.keys(currentPredictionsByDraw).length} predictions.`);
    } else {
      console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] No existing doc for tool ${toolId}, will create new one.`);
    }

    let newOrUpdatedPredictionDetails: Record<string, PredictionDetail> = {};
    historicalPredictions.forEach(pred => {
      if (!pred.targetDrawNumber) {
        console.warn("[SAVE_HISTORICAL_TOOL_PREDICTIONS_SKIP] Skipping prediction with no targetDrawNumber:", pred);
        return;
      }
      const drawKey = String(pred.targetDrawNumber);
      newOrUpdatedPredictionDetails[drawKey] = {
        predictedNumbers: pred.predictedNumbers,
        targetDrawDate: pred.targetDrawDate || "HISTORICAL_DRAW_DATE_MISSING",
        savedAt: serverTimestamp(),
        userId: adminUserId, // Assign adminUserId to each historical prediction entry
      };
    });

    if (Object.keys(newOrUpdatedPredictionDetails).length === 0) {
      console.log("[SAVE_HISTORICAL_TOOL_PREDICTIONS] No valid historical predictions to update/add after processing.");
      return { success: true, message: "没有有效预测可保存到历史记录。", savedCount: 0 };
    }
    
    const finalPredictionsByDraw = { ...currentPredictionsByDraw, ...newOrUpdatedPredictionDetails };
    
    const docDataToSet: ToolPredictionsDocument = {
        toolId: toolId,
        toolName: toolName,
        predictionsByDraw: finalPredictionsByDraw,
        userId: adminUserId, 
        lastUpdatedAt: serverTimestamp(),
    };
    const numNewOrUpdated = Object.keys(newOrUpdatedPredictionDetails).length;
    console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Preparing to set document for tool ${toolId}. Admin: ${adminUserId}. New/updated predictions: ${numNewOrUpdated}. Total predictions in map: ${Object.keys(finalPredictionsByDraw).length}. Doc userId: ${docDataToSet.userId}`);
    
    await setDoc(toolDocRef, docDataToSet, { merge: true }); 

    console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS_SUCCESS] Successfully saved/updated ${numNewOrUpdated} historical predictions for tool ${toolId}.`);
    return {
      success: true,
      message: `工具 ${toolName} 的 ${numNewOrUpdated} 条历史预测已保存/更新。`,
      savedCount: numNewOrUpdated
    };
  } catch (error: any) {
    console.error(`[SAVE_HISTORICAL_TOOL_PREDICTIONS_ERROR] Error for tool ${toolId}:`, error);
    const fullErrorMessage = error.message || "未知错误";
    const code = error.code || "UNKNOWN_CODE";
    return { success: false, message: `批量保存历史预测失败: ${code} - ${fullErrorMessage}` };
  }
}

export async function getPredictionForToolAndDraw(
  toolId: string,
  targetDrawNumber: string | number
): Promise<number[] | null> {
  if (!db) {
    console.warn(`[GET_PRED_TOOL_DRAW] Firestore DB not init. Tool: ${toolId}, Draw: ${targetDrawNumber}`);
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
    return null;
  } catch (error) {
    console.error(`Error fetching prediction for tool ${toolId}, draw ${drawKey}:`, error);
    return null;
  }
}

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
        if (Array.isArray(data.predictionsByDraw[drawKey].predictedNumbers)) {
          predictionsMap[data.toolId] = data.predictionsByDraw[drawKey].predictedNumbers;
        }
      }
    });
    return predictionsMap;
  } catch (error) {
    console.error(`Error fetching predictions for draw ${drawKey}:`, error);
    return {};
  }
}

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
      return data.predictionsByDraw || {}; 
    }
    console.log(`[GET_SAVED_HISTORICAL] No saved predictions document found for tool ${toolId}.`);
    return null;
  } catch (error: any) {
    console.error(`[GET_SAVED_HISTORICAL_ERROR] Error fetching saved historical predictions for tool ${toolId}:`, error);
    return null;
  }
}

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

  for (let i = 0; i <= allHistoricalData.length - 11; i++) { 
    const targetDraw = allHistoricalData[i]; 
    if (!targetDraw || !targetDraw.numbers || typeof targetDraw.additionalNumber === 'undefined') {
        console.warn(`[CALC_HIST_PERF_WARN] Skipping invalid targetDraw at index ${i}:`, targetDraw);
        continue;
    }
    const precedingTenDraws = allHistoricalData.slice(i + 1, i + 1 + 11); 
    if (precedingTenDraws.length < 10) {
      console.log(`[CALC_HIST_PERF] Not enough preceding data for targetDraw ${targetDraw.drawNumber}. Needed 10, got ${precedingTenDraws.length}. Skipping.`);
      continue;
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
      isSavedPrediction: false, 
    });
  }
  console.log(`[CALC_HIST_PERF] Finished. Generated ${performances.length} performance entries for tool ${toolId}.`);
  return performances;
}


export async function calculateSingleToolPrediction(
  toolId: string,
  latestTenHistoricalData: HistoricalResult[]
): Promise<number[] | null> {
  const tool = dynamicTools.find((t) => t.id === toolId);
  if (!tool) {
    console.error(`[CALC_SINGLE_PRED_ERROR] Tool not found: ${toolId}`);
    return null;
  }
  if (!latestTenHistoricalData || latestTenHistoricalData.length < 10) {
     console.warn(`[CALC_SINGLE_PRED_WARN] Not enough historical data provided for tool ${toolId} (need 10, got ${latestTenHistoricalData?.length || 0}). Cannot generate prediction.`);
     return []; 
  }
  
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
      return input.split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n >= TOTO_NUMBER_RANGE.min && n <= TOTO_NUMBER_RANGE.max);
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
      combo.every(num => typeof num === 'number' && num >= TOTO_NUMBER_RANGE.min && num <= TOTO_NUMBER_RANGE.max) &&
      new Set(combo).size === combo.length
    );

    if (validCombinations.length === 0 && result.combinations.length > 0) {
      return { error: "AI returned malformed combinations. Please try adjusting parameters." };
    }

    return { combinations: validCombinations as TotoCombination[] };
  } catch (error) {
    console.error("[GENERATE_TOTO_PREDICTIONS_ERROR] Error in Genkit call or processing:", error);
    let errorMessage = "An unknown error occurred during AI prediction.";
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
        errorMessage = error;
    }
    
    if (errorMessage.includes("API key not valid") || errorMessage.includes("PERMISSION_DENIED")) {
        errorMessage = "AI Prediction failed: API key is invalid or missing. Please check server configuration. Detail: " + errorMessage;
    } else if (errorMessage.includes("quota")) {
        errorMessage = "AI Prediction failed: API quota exceeded. Please check your API plan. Detail: " + errorMessage;
    }

    return { error: errorMessage };
  }
}

// --- Admin: Process current predictions and generate for next ---
export async function adminRecalculateAndSaveAllToolPredictions(
  adminUserId: string | null
): Promise<{ success: boolean; message: string; details?: string[] }> {
  console.log(`[ADMIN_PROCESS_AND_PREPARE_NEXT] Initiated by admin: ${adminUserId}`);
  if (!adminUserId || adminUserId !== "mAvLawNGpGdKwPoHuMQyXlKpPNv1") {
    return { success: false, message: "操作失败：需要有效的管理员权限。" };
  }

  const details: string[] = [];

  try {
    const appSettings = await getCurrentDrawDisplayInfo();
    if (!appSettings || !appSettings.officialPredictionsDrawId) {
      details.push("无法获取当前官方预测期号设置，操作中止。");
      return { success: false, message: "无法获取当前官方预测期号设置，操作中止。", details };
    }
    const currentProcessingDrawId = appSettings.officialPredictionsDrawId;
    details.push(`当前处理的官方预测期号: ${currentProcessingDrawId}`);

    const allFetchedHistoricalData = await getAllHistoricalResultsFromFirestore();
    if (!allFetchedHistoricalData || allFetchedHistoricalData.length === 0) {
      details.push("无法获取历史开奖结果，操作中止。");
      return { success: false, message: "无法获取历史开奖结果，操作中止。", details };
    }
    const latestActualDrawDate = allFetchedHistoricalData[0].date; 
    details.push(`最新的实际历史开奖日期: ${latestActualDrawDate}`);

    for (const tool of dynamicTools) {
      let toolMessage = `${tool.name}: `;
      let toolSuccess = true;

      const toolDocRef = doc(db, "toolPredictions", tool.id);
      const docSnap = await getDoc(toolDocRef);
      let currentToolDocData: ToolPredictionsDocument;

      if (docSnap.exists()) {
        currentToolDocData = docSnap.data() as ToolPredictionsDocument;
      } else {
        currentToolDocData = {
          toolId: tool.id,
          toolName: tool.name,
          predictionsByDraw: {},
          userId: adminUserId, // Will be set as admin performing this overall operation
          lastUpdatedAt: serverTimestamp(),
        };
      }
      
      // 1. Update date of current OFFICIAL_PREDICTIONS_DRAW_ID
      const currentOfficialDrawKey = String(currentProcessingDrawId);
      if (currentToolDocData.predictionsByDraw[currentOfficialDrawKey]) {
        currentToolDocData.predictionsByDraw[currentOfficialDrawKey].targetDrawDate = latestActualDrawDate;
        currentToolDocData.predictionsByDraw[currentOfficialDrawKey].savedAt = serverTimestamp();
        currentToolDocData.predictionsByDraw[currentOfficialDrawKey].userId = adminUserId;
        toolMessage += `期号 ${currentOfficialDrawKey} 日期已更新为 ${latestActualDrawDate}. `;
      } else {
        toolMessage += `期号 ${currentOfficialDrawKey} 的预测不存在，无法更新日期. `;
      }

      // 2. Generate new "PENDING_DRAW" prediction for the next draw ID
      const nextPendingDrawIdNumber = Number(currentProcessingDrawId) + 1;
      const nextPendingDrawIdKey = String(nextPendingDrawIdNumber);
      const latestTenHistoricalDraws = allFetchedHistoricalData.slice(0, 10);

      if (latestTenHistoricalDraws.length < 10) {
        toolMessage += `无法为下一期 ${nextPendingDrawIdKey} 生成预测 (历史数据不足10期). `;
        toolSuccess = false;
      } else {
        const newPredictedNumbers = await calculateSingleToolPrediction(tool.id, latestTenHistoricalDraws);
        if (newPredictedNumbers !== null) {
          currentToolDocData.predictionsByDraw[nextPendingDrawIdKey] = {
            predictedNumbers: newPredictedNumbers,
            targetDrawDate: "PENDING_DRAW",
            savedAt: serverTimestamp(),
            userId: adminUserId,
          };
          toolMessage += `已为下一期 ${nextPendingDrawIdKey} 生成新预测. `;
        } else {
          toolMessage += `为下一期 ${nextPendingDrawIdKey} 生成预测失败 (算法返回null). `;
          toolSuccess = false;
        }
      }
      
      currentToolDocData.lastUpdatedAt = serverTimestamp();
      currentToolDocData.userId = adminUserId; // Ensure admin ID is on the main doc

      try {
        await setDoc(toolDocRef, currentToolDocData, { merge: true });
        if (!toolSuccess) toolMessage += " (部分操作可能未完成).";
      } catch(saveError: any) {
        toolMessage += `保存工具 ${tool.id} 文档失败: ${saveError.message}. `;
        toolSuccess = false;
      }
      details.push(`${toolSuccess ? "✅" : "❌"} ${toolMessage}`);
    }

    // 3. Update appSettings with the new officialPredictionsDrawId
    const nextOfficialDrawIdForApp = String(Number(currentProcessingDrawId) + 1);
    await updateCurrentDrawDisplayInfo({
      currentDrawDateTime: appSettings.currentDrawDateTime, // Keep existing date/jackpot
      currentJackpot: appSettings.currentJackpot,
      officialPredictionsDrawId: nextOfficialDrawIdForApp
    }, adminUserId);
    details.push(`应用设置中的官方预测期号已更新为: ${nextOfficialDrawIdForApp}`);


    const overallSuccess = !details.some(d => d.startsWith("❌"));
    return {
      success: overallSuccess,
      message: overallSuccess ? "所有工具的当期预测日期已更新，下一期预测已生成，并且应用设置中的官方预测期号已更新。" : "部分工具操作失败，请查看详情。",
      details,
    };

  } catch (error: any) {
    console.error("[ADMIN_PROCESS_AND_PREPARE_NEXT_ERROR] Global error:", error);
    details.push(`全局错误: ${error.message || "未知错误"}`);
    return { success: false, message: "处理预测过程中发生严重错误。", details };
  }
}
