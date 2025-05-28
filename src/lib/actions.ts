
"use server";

import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import type { WeightedCriterion, TotoCombination, HistoricalResult } from "./types";
import { OFFICIAL_PREDICTIONS_DRAW_ID } from "./types";
import { db, auth as firebaseClientAuthInstance } from "./firebase";
import {
  collection, addDoc, serverTimestamp, query, where,
  getDocs, limit, doc, setDoc, writeBatch,
  getDoc,
  updateDoc,
  orderBy, Timestamp, FieldValue
} from "firebase/firestore";
import { dynamicTools } from "./numberPickingAlgos"; // Ensure this path is correct and dynamicTools is exported
import { calculateHitDetails as utilCalculateHitDetails } from "./totoUtils"; // Renamed to avoid conflict
import type { HitDetails } from "./totoUtils"; // Ensure HitDetails is exported or defined

// --- Interfaces for Tool Prediction data structure ---
export interface PredictionDetail {
  targetDrawDate?: string;
  predictedNumbers: number[];
  savedAt: FieldValue;
}

export interface ToolPredictionsDocument {
  toolId: string;
  toolName: string;
  predictionsByDraw: Record<string, PredictionDetail>; // Key is targetDrawNumber (string)
  lastUpdatedAt: FieldValue;
  userId?: string; // UID of the admin who last updated this document
}

export interface ToolPredictionInput {
  toolId: string;
  toolName: string;
  targetDrawNumber: string | number;
  targetDrawDate?: string;
  predictedNumbers: TotoCombination;
  userId?: string;
}

// --- Smart Pick AI Results ---
export interface SmartPickResultInput {
  userId: string | null;
  idToken: string | null;
  drawId: string;
  combinations: TotoCombination[];
}

export async function saveSmartPickResult(
  data: SmartPickResultInput
): Promise<{ success: boolean; message?: string; docId?: string }> {
  const sdkUser = firebaseClientAuthInstance.currentUser;
  const sdkUserUid = sdkUser ? sdkUser.uid : null;

  console.log(`[SAVE_SMART_PICK] Input userId: ${data.userId}, Draw ID: ${data.drawId}`);
  console.log(`[SAVE_SMART_PICK] Firebase SDK auth.currentUser.uid inside action: ${sdkUserUid || "NULL"}`);

  if (!db) {
    console.error("[SAVE_SMART_PICK_ERROR] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }

  try {
    const transformedCombinations = data.combinations.map(combo => ({ numbers: combo }));
    const dataToSave = {
      userId: data.userId,
      drawId: data.drawId,
      combinations: transformedCombinations,
      createdAt: serverTimestamp(),
    };

    console.log("[SAVE_SMART_PICK] Attempting to save data to Firestore:", JSON.stringify(dataToSave, null, 2));
    const docRef = await addDoc(collection(db, "smartPickResults"), dataToSave);
    console.log(`[SAVE_SMART_PICK_SUCCESS] Smart pick result saved successfully with ID: ${docRef.id} for draw ${data.drawId}, user: ${data.userId || 'anonymous'}`);
    return { success: true, message: "智能选号结果已保存。", docId: docRef.id };
  } catch (error: any) {
    console.error(`[SAVE_SMART_PICK_ERROR] Error saving smart pick result to Firestore for userId: ${data.userId}:`, error);
    let errorMessage = "保存智能选号结果失败: ";
    if (error.code === 'permission-denied' || error.code === 7 || error.code === 'PERMISSION_DENIED') {
      errorMessage += `Firestore权限不足。尝试保存的userId: ${data.userId}. 服务器端SDK识别的用户UID: ${sdkUserUid || '未认证/未知'}. 请确认Firestore安全规则已正确部署，并且客户端已重新登录以刷新权限。`;
    } else if (error.code === 'invalid-argument' && error.message && error.message.includes('Nested arrays are not supported')) {
      errorMessage += "数据结构错误，可能包含不支持的嵌套数组。";
    } else if (error instanceof Error) {
      errorMessage += error.message;
    } else {
      errorMessage += "未知错误";
    }
    return { success: false, message: errorMessage };
  }
}

export async function getUserSmartPickResults(userId: string, drawId: string): Promise<TotoCombination[] | null> {
  if (!userId) return null;
  if (!db) return null;
  try {
    const q = query(
      collection(db, "smartPickResults"),
      where("userId", "==", userId),
      where("drawId", "==", drawId),
      orderBy("createdAt", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const docData = querySnapshot.docs[0].data();
    if (docData.combinations && Array.isArray(docData.combinations)) {
      return docData.combinations.map((comboObj: any) => comboObj.numbers || []).filter((combo: number[]) => combo.length > 0);
    }
    return null;
  } catch (error) {
    console.error("Error fetching smart pick results:", error);
    return null;
  }
}

// --- Historical TOTO Results Sync (Admin) ---
export async function syncHistoricalResultsToFirestore(
  jsonDataString: string,
  adminUserId: string | null
): Promise<{ success: boolean; message: string; count?: number }> {
  if (!db) {
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }
  if (!adminUserId) {
    return { success: false, message: "管理员UID无效，无法同步。" };
  }

  try {
    const results: HistoricalResult[] = JSON.parse(jsonDataString);
    if (!Array.isArray(results)) {
      return { success: false, message: "无效的JSON数据格式，应为一个数组。" };
    }
    const batch = writeBatch(db);
    let count = 0;
    for (const result of results) {
      if (typeof result.drawNumber !== 'number' || !result.date || !Array.isArray(result.numbers)) continue;
      const resultDocRef = doc(db, "totoResults", String(result.drawNumber));
      batch.set(resultDocRef, { ...result, userId: adminUserId }, { merge: true });
      count++;
    }
    await batch.commit();
    return { success: true, message: `成功同步 ${count} 条开奖结果到 Firestore。`, count };
  } catch (error: any) {
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
    console.error("[SYNC_FIRESTORE_ERROR_DETAILS]", specificMessage);
    return { success: false, message: specificMessage };
  }
}

// --- Current Draw Display Info (Admin & Client) ---
export interface CurrentDrawInfo {
  currentDrawDateTime: string;
  currentJackpot: string;
  userId?: string; // Admin UID
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
    return { success: false, message: "管理员未登录，无法更新。" };
  }
  if (!data.currentDrawDateTime || !data.currentJackpot) {
    return { success: false, message: "开奖日期/时间或头奖金额不能为空。" };
  }
  try {
    const docRef = doc(db, "appSettings", "currentDrawInfo");
    await setDoc(docRef, {
      currentDrawDateTime: data.currentDrawDateTime,
      currentJackpot: data.currentJackpot,
      userId: adminUserId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true, message: "本期开奖信息已更新。" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
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
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { success: false, favorited: false, message: `操作失败: ${errorMessage}` };
  }
}

// --- Fetching All Historical Results (for client-side use) ---
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
      }
    });
    return results;
  } catch (error) {
    console.error("Error fetching historical results from Firestore:", error);
    return [];
  }
}

// --- Tool Predictions Management ---
export async function saveCurrentDrawToolPrediction(
  data: ToolPredictionInput
): Promise<{ success: boolean; message: string }> {
  console.log("[SAVE_CURRENT_DRAW_TOOL_PREDICTION] Attempting to save:", JSON.stringify(data, null, 2));
  if (!db) return { success: false, message: "Firestore 'db' instance is not initialized." };
  if (!data.userId) return { success: false, message: "Admin User ID is required to save tool prediction." };

  const toolDocRef = doc(db, "toolPredictions", data.toolId);
  const drawKey = String(data.targetDrawNumber);
  try {
    const newPredictionDetail: PredictionDetail = {
      predictedNumbers: data.predictedNumbers,
      targetDrawDate: data.targetDrawDate || "PENDING_DRAW",
      savedAt: serverTimestamp(),
    };
    const docSnap = await getDoc(toolDocRef);
    let existingPredictionsByDraw: Record<string, PredictionDetail> = {};
    if (docSnap.exists()) {
      existingPredictionsByDraw = (docSnap.data() as ToolPredictionsDocument).predictionsByDraw || {};
    }
    existingPredictionsByDraw[drawKey] = newPredictionDetail;

    const docDataToSet: Partial<ToolPredictionsDocument> = {
      toolId: data.toolId,
      toolName: data.toolName,
      userId: data.userId,
      lastUpdatedAt: serverTimestamp(),
      predictionsByDraw: existingPredictionsByDraw
    };
    await setDoc(toolDocRef, docDataToSet, { merge: true });
    return { success: true, message: `工具 ${data.toolName} 对期号 ${data.targetDrawNumber} 的预测已保存/更新。` };
  } catch (error: any) {
    console.error(`[SAVE_CURRENT_DRAW_TOOL_PREDICTION_ERROR] for tool ${data.toolId}, draw ${data.targetDrawNumber}:`, error);
    return { success: false, message: `保存预测失败: ${error.message || "未知错误"}` };
  }
}

export async function saveHistoricalToolPredictions(
  toolId: string,
  toolName: string,
  historicalPredictions: ToolPredictionInput[], // Each item already contains full ToolPredictionInput structure
  adminUserId: string
): Promise<{ success: boolean; message: string; savedCount?: number }> {
  console.log(
    `[SAVE_HISTORICAL_TOOL_PREDICTIONS] toolId: ${toolId}, toolName: ${toolName}, ` +
    `count: ${historicalPredictions.length}, adminUserId: ${adminUserId}`
  );
  if (!db) return { success: false, message: "Firestore 'db' instance is not initialized." };
  if (!adminUserId) return { success: false, message: "Admin User ID is required." };
  if (historicalPredictions.length === 0) return { success: true, message: "没有需要保存的历史预测。", savedCount: 0 };

  const toolDocRef = doc(db, "toolPredictions", toolId);
  console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Document path: ${toolDocRef.path}`);

  try {
    const docSnap = await getDoc(toolDocRef);
    let existingPredictionsByDraw: Record<string, PredictionDetail> = {};
    if (docSnap.exists()) {
      const existingData = docSnap.data() as ToolPredictionsDocument;
      existingPredictionsByDraw = existingData.predictionsByDraw || {};
      console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Fetched existing document for tool ${toolId}. Found ${Object.keys(existingPredictionsByDraw).length} existing predictions.`);
    } else {
      console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] No existing document for tool ${toolId}. A new one will be created.`);
    }

    let actualSavedCount = 0;
    historicalPredictions.forEach(pred => {
      if (!pred.userId) {
        console.warn(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Skipping historical prediction for draw ${pred.targetDrawNumber} due to missing userId in pred object.`);
        return;
      }
      const drawKey = String(pred.targetDrawNumber);
      existingPredictionsByDraw[drawKey] = {
        predictedNumbers: pred.predictedNumbers,
        targetDrawDate: pred.targetDrawDate || "HISTORICAL_DRAW_DATE_MISSING",
        savedAt: serverTimestamp(),
      };
      actualSavedCount++;
    });
    
    console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Processed ${actualSavedCount} predictions to be saved/updated.`);

    const docDataToSet: ToolPredictionsDocument = {
      toolId: toolId,
      toolName: toolName,
      predictionsByDraw: existingPredictionsByDraw,
      userId: adminUserId, // The admin performing this bulk save
      lastUpdatedAt: serverTimestamp(),
    };
    
    console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Data to be set for tool ${toolId} (userId: ${docDataToSet.userId}, num_predictions_in_map: ${Object.keys(docDataToSet.predictionsByDraw).length}):`, 
      // Avoid logging the entire predictionsByDraw map if it's huge
      {...docDataToSet, predictionsByDraw: `Map with ${Object.keys(docDataToSet.predictionsByDraw).length} entries`}
    );

    await setDoc(toolDocRef, docDataToSet, { merge: true });
    console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Successfully saved/updated ${actualSavedCount} historical predictions for tool ${toolId}.`);
    return { success: true, message: `工具 ${toolName} 的 ${actualSavedCount} 条历史预测已保存/更新。`, savedCount: actualSavedCount };
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

// --- Tool Algorithm Calculations (Server Actions) ---
export interface HistoricalPerformanceDisplayData {
  targetDraw: HistoricalResult;
  predictedNumbersForTargetDraw: number[];
  hitDetails: HitDetails;
  hitRate: number;
  hasAnyHit: boolean;
  predictionBasisDraws: string | null;
}

export async function calculateHistoricalPerformances(
  toolId: string,
  allHistoricalData: HistoricalResult[]
): Promise<HistoricalPerformanceDisplayData[]> {
  const tool = dynamicTools.find((t) => t.id === toolId);
  if (!tool) return [];
  if (!allHistoricalData || allHistoricalData.length < 11) return [];

  const performances: HistoricalPerformanceDisplayData[] = [];
  for (let i = 0; i <= allHistoricalData.length - 11; i++) {
    const targetDraw = allHistoricalData[i];
    const precedingTenDraws = allHistoricalData.slice(i + 1, i + 1 + 10);
    if (precedingTenDraws.length < 10) continue;

    let predictionBasisDraws: string | null = null;
    const firstPreceding = precedingTenDraws[0];
    const lastPreceding = precedingTenDraws[precedingTenDraws.length - 1];
    if (firstPreceding && lastPreceding) {
      predictionBasisDraws = `基于期号: ${firstPreceding.drawNumber}${precedingTenDraws.length > 1 ? ` - ${lastPreceding.drawNumber}` : ''} (共${precedingTenDraws.length}期)`;
    }

    const predictedNumbersForTargetDraw = tool.algorithmFn(precedingTenDraws);
    const hitDetails = utilCalculateHitDetails(predictedNumbersForTargetDraw, targetDraw); // Use aliased import
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

export async function calculateSingleToolPrediction(
  toolId: string,
  latestTenHistoricalData: HistoricalResult[]
): Promise<number[] | null> {
  const tool = dynamicTools.find((t) => t.id === toolId);
  if (!tool) return null;
  try {
    return tool.algorithmFn(latestTenHistoricalData);
  } catch (error) {
    console.error(`Error in algorithmFn for tool ${toolId}:`, error);
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
    if (!result || !result.combinations) return { error: "AI did not return valid combinations." };
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
    return { error: error instanceof Error ? error.message : "An unknown error occurred during prediction." };
  }
}
