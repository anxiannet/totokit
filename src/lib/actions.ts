
"use server";

import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import type { WeightedCriterion, HistoricalResult, TotoCombination } from "./types";
import { db, auth as firebaseClientAuthInstance } from "./firebase";
import {
  collection, addDoc, serverTimestamp, query, where,
  getDocs, limit, doc, writeBatch, runTransaction,
  arrayUnion, arrayRemove, getDoc, setDoc, orderBy, Timestamp
} from "firebase/firestore";


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
    console.error("[SAVE_TOOL_PREDICTION_ERROR] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }
  try {
    const toolPredictionsCol = collection(db, "toolPredictions");

    const q = query(
      toolPredictionsCol,
      where("toolId", "==", data.toolId),
      where("targetDrawNumber", "==", data.targetDrawNumber),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const existingDocId = querySnapshot.docs[0].id;
      console.log(`[SAVE_TOOL_PREDICTION_INFO] Prediction already exists for toolId: ${data.toolId}, targetDrawNumber: ${data.targetDrawNumber}. Doc ID: ${existingDocId}`);
      return { success: true, message: "Prediction already exists for this tool and draw.", predictionId: existingDocId };
    }

    const docRef = await addDoc(toolPredictionsCol, {
      ...data,
      createdAt: serverTimestamp(),
    });
    console.log(`[SAVE_TOOL_PREDICTION_SUCCESS] Tool prediction saved successfully with ID: ${docRef.id} for tool: ${data.toolId}, draw: ${data.targetDrawNumber}`);
    return { success: true, message: "Tool prediction saved successfully.", predictionId: docRef.id };
  } catch (error) {
    console.error("[SAVE_TOOL_PREDICTION_ERROR] Error saving tool prediction to Firestore:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { success: false, message: `Failed to save tool prediction: ${errorMessage}` };
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
  console.log(`[SAVE_SMART_PICK] Received request. User ID from client: ${data.userId}, Draw ID: ${data.drawId}, ID Token present: ${!!data.idToken}`);
  const clientAuthUid = firebaseClientAuthInstance.currentUser ? firebaseClientAuthInstance.currentUser.uid : null;
  console.log(`[SAVE_SMART_PICK] Firebase SDK auth.currentUser.uid inside action: ${clientAuthUid || 'NULL'}`);


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
    console.error("[SAVE_SMART_PICK_ERROR] Error saving smart pick result to Firestore:", error);
    let errorMessage = "保存智能选号结果失败: ";
     if (error.code === 'permission-denied' || error.code === 7 || error.code === 'PERMISSION_DENIED') {
      errorMessage += `Firestore权限不足。尝试保存的userId: ${data.userId}. 服务器端SDK识别的用户UID: ${clientAuthUid}. 请确认Firestore安全规则已正确部署，并且客户端已重新登录以刷新权限。`;
    } else if (error instanceof Error) {
      errorMessage += error.message;
    } else {
      errorMessage += "未知错误";
    }
    return { success: false, message: errorMessage };
  }
}


export async function syncHistoricalResultsToFirestore(
  jsonDataString: string,
  adminUserId: string | null
): Promise<{ success: boolean; message: string; count?: number }> {
  console.log("[SYNC_FIRESTORE] Attempting to sync historical results to Firestore.");
  if (!db) {
    console.error("[SYNC_FIRESTORE_ERROR] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }

  if (!adminUserId) {
    console.error("[SYNC_FIRESTORE_ERROR] Admin user ID not provided for sync. Sync aborted.");
    return { success: false, message: "管理员未登录或UID无效，无法同步。" };
  }
  console.log(`[SYNC_FIRESTORE_INFO] Admin user ID: ${adminUserId} initiated sync.`);

  try {
    const results: HistoricalResult[] = JSON.parse(jsonDataString);
    if (!Array.isArray(results)) {
      return { success: false, message: "Invalid JSON data format. Expected an array." };
    }

    const batch = writeBatch(db);
    let count = 0;

    for (const result of results) {
      if (typeof result.drawNumber !== 'number' || !result.date || !Array.isArray(result.numbers)) {
        console.warn("[SYNC_FIRESTORE_WARN] Skipping invalid result object:", result);
        continue;
      }
      const resultDocRef = doc(db, "totoResults", String(result.drawNumber));
      const dataToSet = { ...result, userId: adminUserId };
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
        specificMessage += " (Firestore权限被拒绝。请确认管理员声明已在客户端和服务端生效（可能需要重新登录以刷新ID令牌），且Firestore规则配置正确并已部署。) ";
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
  adminUserId: string | null
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
      userId: adminUserId, 
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
  favoritedAt: typeof Timestamp;
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
    await runTransaction(db, async (transaction) => {
      const userFavDoc = await transaction.get(userFavDocRef);
      let currentFavorites: string[] = [];
      if (userFavDoc.exists() && userFavDoc.data()?.favoriteToolIds) {
        currentFavorites = userFavDoc.data()?.favoriteToolIds as string[];
      }

      if (currentFavorites.includes(toolId)) {
        transaction.set(userFavDocRef, {
          favoriteToolIds: arrayRemove(toolId),
          updatedAt: serverTimestamp()
        }, { merge: true });
        isCurrentlyFavorited = false;
      } else {
        transaction.set(userFavDocRef, {
          favoriteToolIds: arrayUnion(toolId),
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
  if (!userId) {
    console.log("[GET_USER_SMART_PICKS_INFO] No userId provided.");
    return null;
  }
  if (!db) {
    console.error("[GET_USER_SMART_PICKS_ERROR] Firestore 'db' instance is not initialized.");
    return null;
  }

  console.log(`[GET_USER_SMART_PICKS_INFO] Fetching smart picks for userId: ${userId}, drawId: ${drawId}`);
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
      console.log(`[GET_USER_SMART_PICKS_INFO] Found ${combinations.length} combinations.`);
      return combinations;
    }
    console.log("[GET_USER_SMART_PICKS_WARN] Found document, but combinations format is unexpected or missing.");
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

// --- Official Tool Predictions Actions ---
const OFFICIAL_PREDICTIONS_DRAW_ID = "4082"; // Define the draw ID for which official predictions are made

export interface OfficialToolPredictionData {
  toolId: string;
  toolName: string;
  predictedNumbers: number[];
  drawId: string; 
  generatedBy: string; // Admin UID
  generatedAt: Timestamp;
}

export async function saveOfficialToolPrediction(
  toolId: string,
  toolName: string,
  predictedNumbers: number[],
  adminUserId: string | null
): Promise<{ success: boolean; message?: string }> {
  if (!db) {
    return { success: false, message: "数据库服务未初始化。" };
  }
  if (!adminUserId) {
    return { success: false, message: "管理员未登录，无法保存官方预测。" };
  }
  if (!toolId || !predictedNumbers || predictedNumbers.length === 0) {
    return { success: false, message: "工具ID或预测号码不能为空。" };
  }

  // Document ID will be toolId_drawId for easier querying if needed for other draws later
  const docId = `${toolId}_${OFFICIAL_PREDICTIONS_DRAW_ID}`;
  const predictionDocRef = doc(db, "officialToolPredictions", docId);

  const dataToSave: OfficialToolPredictionData = {
    toolId,
    toolName, // Save toolName for easier display if needed
    predictedNumbers,
    drawId: OFFICIAL_PREDICTIONS_DRAW_ID,
    generatedBy: adminUserId,
    generatedAt: Timestamp.now(),
  };

  try {
    // Using setDoc with merge:true will create the document if it doesn't exist,
    // or update it if it does. This is suitable for "latest official prediction".
    await setDoc(predictionDocRef, dataToSave, { merge: true });
    console.log(`[SAVE_OFFICIAL_PREDICTION_SUCCESS] Official prediction for tool ${toolId} (Draw ${OFFICIAL_PREDICTIONS_DRAW_ID}) saved/updated by admin ${adminUserId}.`);
    return { success: true, message: "官方预测已保存/更新。" };
  } catch (error: any) {
    console.error("[SAVE_OFFICIAL_PREDICTION_ERROR] Error saving official tool prediction:", error);
    let errorMessage = "保存官方预测失败: ";
     if (error.code === 'permission-denied' || error.code === 7 || error.code === 'PERMISSION_DENIED') {
      errorMessage += `Firestore权限不足。请确认管理员声明已正确设置并已重新登录。`;
    } else if (error instanceof Error) {
      errorMessage += error.message;
    } else {
      errorMessage += "未知错误";
    }
    return { success: false, message: errorMessage };
  }
}

export async function getOfficialToolPrediction(
  toolId: string
): Promise<number[] | null> {
  if (!db) {
    console.error("[GET_OFFICIAL_PREDICTION_ERROR] Firestore 'db' instance is not initialized.");
    return null;
  }
  const docId = `${toolId}_${OFFICIAL_PREDICTIONS_DRAW_ID}`;
  const predictionDocRef = doc(db, "officialToolPredictions", docId);

  try {
    const docSnap = await getDoc(predictionDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as OfficialToolPredictionData; // Cast to the defined type
      return data.predictedNumbers || null;
    }
    console.log(`[GET_OFFICIAL_PREDICTION_INFO] No official prediction found for tool ${toolId}, draw ${OFFICIAL_PREDICTIONS_DRAW_ID}.`);
    return null;
  } catch (error) {
    console.error(`[GET_OFFICIAL_PREDICTION_ERROR] Error fetching official prediction for tool ${toolId}:`, error);
    return null;
  }
}

export async function getAllOfficialToolPredictionsForCurrentDraw(): Promise<Record<string, number[]>> {
  if (!db) {
    console.error("[GET_ALL_OFFICIAL_PREDICTIONS_ERROR] Firestore 'db' instance is not initialized.");
    return {};
  }
  
  const predictionsMap: Record<string, number[]> = {};
  const predictionsCol = collection(db, "officialToolPredictions");
  // Query for documents matching the current official draw ID
  const q = query(predictionsCol, where("drawId", "==", OFFICIAL_PREDICTIONS_DRAW_ID));

  try {
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data() as OfficialToolPredictionData;
      if (data.toolId && data.predictedNumbers) {
        predictionsMap[data.toolId] = data.predictedNumbers;
      }
    });
    console.log(`[GET_ALL_OFFICIAL_PREDICTIONS_INFO] Fetched ${Object.keys(predictionsMap).length} official predictions for draw ${OFFICIAL_PREDICTIONS_DRAW_ID}.`);
    return predictionsMap;
  } catch (error) {
    console.error(`[GET_ALL_OFFICIAL_PREDICTIONS_ERROR] Error fetching all official predictions for draw ${OFFICIAL_PREDICTIONS_DRAW_ID}:`, error);
    return {};
  }
}
