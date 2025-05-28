
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
import { dynamicTools } from "./numberPickingAlgos";
import { calculateHitDetails as utilCalculateHitDetails, type HitDetails } from "./totoUtils";

// --- Interfaces for Tool Prediction data structure ---
export interface PredictionDetail {
  targetDrawDate?: string; // YYYY-MM-DD
  predictedNumbers: number[];
  savedAt: FieldValue; // Or Timestamp if read
  userId?: string; // Admin UID who saved this
}

export interface ToolPredictionsDocument {
  toolId: string;
  toolName: string;
  predictionsByDraw: Record<string, PredictionDetail>; // Key is targetDrawNumber (string)
  lastUpdatedAt: FieldValue; // Or Timestamp if read
  userId?: string; // UID of the admin who last updated this document
}

export interface ToolPredictionInput {
  toolId: string;
  toolName: string;
  targetDrawNumber: string | number;
  targetDrawDate?: string; // YYYY-MM-DD
  predictedNumbers: TotoCombination;
  userId?: string; // Admin UID
}

export interface HistoricalPerformanceDisplayData {
  targetDraw: HistoricalResult;
  predictedNumbersForTargetDraw: number[];
  hitDetails: HitDetails;
  hitRate: number;
  hasAnyHit: boolean;
  predictionBasisDraws: string | null;
  isSavedPrediction: boolean; // Flag to indicate if this performance is based on a saved prediction
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
    // Transform combinations: from TotoCombination[] (number[][]) to Array<{ numbers: number[] }>
    const transformedCombinations = data.combinations.map(combo => ({ numbers: combo }));

    const dataToSave = {
      userId: data.userId, // This is what request.resource.data.userId in rules refers to
      drawId: data.drawId,
      combinations: transformedCombinations, // Storing the transformed array
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
  console.log(`[GET_USER_SMART_PICK] Fetching for userId: ${userId}, drawId: ${drawId}`);
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
      console.log(`[GET_USER_SMART_PICK] No saved smart picks found for userId: ${userId}, drawId: ${drawId}`);
      return null;
    }
    const docData = querySnapshot.docs[0].data();
    if (docData.combinations && Array.isArray(docData.combinations)) {
      // Transform back from Array<{ numbers: number[] }> to TotoCombination[] (number[][])
      const retrievedCombinations = docData.combinations
        .map((comboObj: any) => comboObj.numbers || [])
        .filter((combo: number[]) => combo.length > 0);
      console.log(`[GET_USER_SMART_PICK] Found ${retrievedCombinations.length} saved combinations.`);
      return retrievedCombinations;
    }
    console.log(`[GET_USER_SMART_PICK] Document found but combinations field is invalid or missing.`);
    return null;
  } catch (error) {
    console.error(`[GET_USER_SMART_PICK_ERROR] Error fetching smart pick results for userId: ${userId}, drawId: ${drawId}:`, error);
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
    return { success: false, message: "管理员UID无效，无法同步。需要管理员登录并验证。" };
  }

  try {
    const results: HistoricalResult[] = JSON.parse(jsonDataString);
    if (!Array.isArray(results)) {
      return { success: false, message: "无效的JSON数据格式，应为一个数组。" };
    }
    const batch = writeBatch(db);
    let count = 0;
    for (const result of results) {
      if (typeof result.drawNumber !== 'number' || !result.date || !Array.isArray(result.numbers)) {
        console.warn("[SYNC_FIRESTORE_SKIP] Skipping invalid result:", result);
        continue;
      }
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
        specificMessage += ` (Firestore权限被拒绝。请确认管理员UID ${adminUserId} 正确，声明已生效（可能需重新登录），且Firestore规则允许此UID写入。)`;
      }
    } else {
      specificMessage += "未知错误";
    }
    console.error("[SYNC_FIRESTORE_ERROR_DETAILS]", specificMessage, error);
    return { success: false, message: specificMessage };
  }
}

// --- Current Draw Display Info (Admin & Client) ---
export interface CurrentDrawInfo {
  currentDrawDateTime: string;
  currentJackpot: string;
  userId?: string; // Admin UID who updated
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
      userId: adminUserId, // Ensure this matches the field name in your Firestore rules if applicable
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
        // No need to return userId or updatedAt to client display typically
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
  toolName?: string; // Optional: Denormalize tool name for easier display
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
  // toolName?: string // Could add toolName if you want to store it in the favorites doc
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
        // Unfavorite
        transaction.update(userFavDocRef, {
          favoriteToolIds: currentFavorites.filter(id => id !== toolId),
          updatedAt: serverTimestamp()
        });
        isCurrentlyFavorited = false;
      } else {
        // Favorite
        transaction.set(userFavDocRef, {
          favoriteToolIds: [...currentFavorites, toolId],
          updatedAt: serverTimestamp()
        }, { merge: true }); // Use merge:true to create if not exists or update
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
    const q = query(resultsCol, orderBy("drawNumber", "desc")); // Order by drawNumber descending
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
          // userId is an admin-only field, not needed by client for display
        } as HistoricalResult); // Cast, assuming data structure matches
      }
    });
    return results;
  } catch (error) {
    console.error("Error fetching historical results from Firestore:", error);
    return [];
  }
}


// --- Tool Predictions Management (Single document per tool) ---

// Save/Update a single prediction (typically for the OFFICIAL_PREDICTIONS_DRAW_ID) within a tool's document
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
      userId: data.userId,
    };

    // Using updateDoc to specifically set a field within the map
    // This will create the document if it doesn't exist, or merge if it does (due to how maps work with set if doc doesn't exist)
    // More robust: check if doc exists, then decide set or update
    const docSnap = await getDoc(toolDocRef);
    if (docSnap.exists()) {
      await updateDoc(toolDocRef, {
        toolName: data.toolName, // Update toolName in case it changed
        userId: data.userId,     // Update the main document's userId
        lastUpdatedAt: serverTimestamp(),
        [`predictionsByDraw.${drawKey}`]: newPredictionDetail // Update specific draw prediction
      });
    } else {
      const docDataToSet: ToolPredictionsDocument = {
        toolId: data.toolId,
        toolName: data.toolName,
        userId: data.userId,
        lastUpdatedAt: serverTimestamp(),
        predictionsByDraw: {
          [drawKey]: newPredictionDetail
        }
      };
      await setDoc(toolDocRef, docDataToSet);
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
  historicalPredictions: ToolPredictionInput[], // Array of predictions to save
  adminUserId: string
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
    let newPredictionsMapUpdates: Record<string, PredictionDetail> = {};

    historicalPredictions.forEach(pred => {
      if (!pred.userId) { // Should always be adminUserId here
        console.warn(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Skipping historical prediction for draw ${pred.targetDrawNumber} due to missing userId in pred object during preparation.`);
        return;
      }
      const drawKey = String(pred.targetDrawNumber);
      newPredictionsMapUpdates[`predictionsByDraw.${drawKey}`] = { // Use dot notation for field paths
        predictedNumbers: pred.predictedNumbers,
        targetDrawDate: pred.targetDrawDate || "HISTORICAL_DRAW_DATE_MISSING",
        savedAt: serverTimestamp(),
        userId: pred.userId, // This is the adminUserId
      };
    });

    if (Object.keys(newPredictionsMapUpdates).length === 0) {
      return { success: true, message: "没有有效预测可保存。", savedCount: 0 };
    }

    if (docSnap.exists()) {
      await updateDoc(toolDocRef, {
        toolName: toolName, // Update toolName in case it changed
        userId: adminUserId, // Update the main document's userId
        lastUpdatedAt: serverTimestamp(),
        ...newPredictionsMapUpdates // Spread the map updates
      });
    } else {
      // If doc doesn't exist, create it with all predictions
      const initialPredictionsByDraw: Record<string, PredictionDetail> = {};
      historicalPredictions.forEach(pred => {
        const drawKey = String(pred.targetDrawNumber);
        initialPredictionsByDraw[drawKey] = {
          predictedNumbers: pred.predictedNumbers,
          targetDrawDate: pred.targetDrawDate || "HISTORICAL_DRAW_DATE_MISSING",
          savedAt: serverTimestamp(),
          userId: pred.userId!,
        };
      });
       const docDataToSet: ToolPredictionsDocument = {
        toolId: toolId,
        toolName: toolName,
        predictionsByDraw: initialPredictionsByDraw,
        userId: adminUserId,
        lastUpdatedAt: serverTimestamp(),
      };
      await setDoc(toolDocRef, docDataToSet);
    }

    console.log(`[SAVE_HISTORICAL_TOOL_PREDICTIONS] Successfully saved/updated ${Object.keys(newPredictionsMapUpdates).length} historical predictions for tool ${toolId}.`);
    return {
      success: true,
      message: `工具 ${toolName} 的 ${Object.keys(newPredictionsMapUpdates).length} 条历史预测已保存/更新。`,
      savedCount: Object.keys(newPredictionsMapUpdates).length
    };
  } catch (error: any) {
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

// Fetches predictions from all tools for a specific target draw number.
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
      return data.predictionsByDraw || {}; // Return the map or an empty object if map is undefined
    }
    console.log(`[GET_SAVED_HISTORICAL] No saved predictions document found for tool ${toolId}.`);
    return null; // No document for this tool
  } catch (error) {
    console.error(`[GET_SAVED_HISTORICAL_ERROR] Error fetching saved historical predictions for tool ${toolId}:`, error);
    return null;
  }
}


// --- Tool Algorithm Calculations (Server Actions) ---

// Calculates historical performance for a single tool based on all historical data
export async function calculateHistoricalPerformances(
  toolId: string,
  allHistoricalData: HistoricalResult[] // Full list of actual past results
): Promise<HistoricalPerformanceDisplayData[]> {
  const tool = dynamicTools.find((t) => t.id === toolId);
  if (!tool) return [];
  // Require at least 11 results: 10 for prediction base, 1 as target
  if (!allHistoricalData || allHistoricalData.length < 11) return [];

  const performances: HistoricalPerformanceDisplayData[] = [];

  // Iterate from the 10th result (index 9) up to the most recent (index 0)
  // This means targetDraw is allHistoricalData[i]
  // And precedingTenDraws are allHistoricalData[i+1] to allHistoricalData[i+10]
  for (let i = 0; i <= allHistoricalData.length - 11; i++) {
    const targetDraw = allHistoricalData[i]; // Current draw to predict for
    const precedingTenDraws = allHistoricalData.slice(i + 1, i + 1 + 10);

    if (precedingTenDraws.length < 10) {
      // Should not happen with the loop condition, but as a safeguard
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
    const hitRate = targetDraw.numbers.length > 0 && predictedNumbersForTargetDraw.length > 0
      ? (hitDetails.mainHitCount / Math.min(predictedNumbersForTargetDraw.length, 6)) * 100
      : 0;
    const hasAnyHit = hitDetails.mainHitCount > 0 || (hitDetails.matchedAdditionalNumberDetails?.matched ?? false);


    performances.push({
      targetDraw,
      predictedNumbersForTargetDraw,
      hitDetails,
      hitRate: parseFloat(hitRate.toFixed(1)),
      hasAnyHit,
      predictionBasisDraws,
      isSavedPrediction: false, // This is a newly calculated performance
    });
  }
  // `performances` will be naturally sorted from most recent target draw to oldest,
  // because `allHistoricalData` is sorted descending by drawNumber.
  return performances;
}

// Calculates prediction for a single tool based on the latest 10 historical data points
export async function calculateSingleToolPrediction(
  toolId: string,
  latestTenHistoricalData: HistoricalResult[] // Should be exactly 10 latest results
): Promise<number[] | null> {
  const tool = dynamicTools.find((t) => t.id === toolId);
  if (!tool) {
    console.error(`[CALC_SINGLE_PRED_ERROR] Tool not found: ${toolId}`);
    return null;
  }
  if (!latestTenHistoricalData || latestTenHistoricalData.length === 0) {
     console.warn(`[CALC_SINGLE_PRED_WARN] No historical data provided for tool ${toolId}. Cannot generate prediction.`);
     return []; // Return empty array if no data
  }
  if (latestTenHistoricalData.length < 10) {
     console.warn(`[CALC_SINGLE_PRED_WARN] Less than 10 historical draws provided for tool ${toolId} (${latestTenHistoricalData.length} draws). Prediction might be less accurate or based on partial data.`);
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

    // Validate AI output
    const validCombinations = result.combinations.filter(combo =>
      Array.isArray(combo) &&
      combo.length > 0 && // Ensure combinations are not empty
      combo.every(num => typeof num === 'number' && num >= 1 && num <= 49) &&
      new Set(combo).size === combo.length // Ensure no duplicates within a combination
    );

    if (validCombinations.length === 0 && result.combinations.length > 0) {
      // AI returned combinations, but none were valid after filtering
      return { error: "AI returned malformed combinations. Please try adjusting parameters." };
    }


    return { combinations: validCombinations as TotoCombination[] };
  } catch (error) {
    console.error("Error in generateTotoPredictions Genkit call:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred during prediction." };
  }
}
