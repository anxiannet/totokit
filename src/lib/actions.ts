
"use server";

import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import type { WeightedCriterion, HistoricalResult, TotoCombination } from "./types";
import { db, auth as firebaseClientAuthInstance } from "./firebase"; // Renamed import for clarity
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, writeBatch, runTransaction, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { type User } from "firebase/auth";


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
    console.log(`[SAVE_TOOL_PREDICTION] Tool prediction saved successfully with ID: ${docRef.id} for tool: ${data.toolId}, draw: ${data.targetDrawNumber}`); // Corrected log to use data.targetDrawNumber
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
  console.log("[SYNC_FIRESTORE] Attempting to sync historical results to Firestore.");
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
    console.error(`[SYNC_FIRESTORE] Specific error message to be returned: ${specificMessage}`);
    return { success: false, message: specificMessage };
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
    throw error; 
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
        transaction.set(userFavoritesRef, { favoriteToolIds: [toolId] });
        currentFavoritedStatus = true;
      } else {
        favoriteToolIds = sfDoc.data().favoriteToolIds || [];
        if (favoriteToolIds.includes(toolId)) {
          transaction.update(userFavoritesRef, {
            favoriteToolIds: arrayRemove(toolId),
          });
          currentFavoritedStatus = false;
        } else {
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

export interface SmartPickResultInput {
  userId: string | null;
  idToken: string | null; 
  drawId: string;
  combinations: TotoCombination[];
}

export async function saveSmartPickResult(
  data: SmartPickResultInput
): Promise<{ success: boolean; message?: string; docId?: string }> {
  if (!db) {
    console.error("[SAVE_SMART_PICK] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }

  const currentUserInAction = firebaseClientAuthInstance.currentUser;
  const actionAuthUid = currentUserInAction ? currentUserInAction.uid : null;

  console.log(`[SAVE_SMART_PICK] Attempting to save smart pick.`);
  console.log(`[SAVE_SMART_PICK] Data received from client - userId: ${data.userId}, drawId: ${data.drawId}, idToken (present): ${!!data.idToken}`);
  console.log(`[SAVE_SMART_PICK] Auth state in server action - firebaseClientAuthInstance.currentUser.uid: ${actionAuthUid}`);

  if (data.userId && actionAuthUid && data.userId !== actionAuthUid) {
    console.error(`[SAVE_SMART_PICK] CRITICAL MISMATCH: userId from client (${data.userId}) does NOT match UID from auth instance in server action (${actionAuthUid}). This will likely cause Firestore rule failure if rules depend on request.auth.uid matching resource.data.userId.`);
  }
  if (data.userId && !actionAuthUid) {
      console.warn(`[SAVE_SMART_PICK] Auth Warning: Client sent userId '${data.userId}', but server action's auth instance has no current user. 'request.auth' in Firestore rules will likely be null.`);
  }
  if (!data.userId && actionAuthUid) {
      // This is less common but possible if client somehow loses auth state before sending but server action retains an older one.
      console.warn(`[SAVE_SMART_PICK] Auth Warning: Client did not send userId (anonymous pick), but server action's auth instance HAS a current user ('${actionAuthUid}'). This could be an edge case or indicate inconsistent state.`);
  }
  
  try {
    const transformedCombinations = data.combinations.map(combo => ({ numbers: combo }));
    const dataToSave = {
      userId: data.userId, // This becomes request.resource.data.userId
      drawId: data.drawId,
      combinations: transformedCombinations,
      createdAt: serverTimestamp(),
    };
    
    console.log(`[SAVE_SMART_PICK] Data being written to Firestore:`, JSON.stringify(dataToSave, null, 2));

    const docRef = await addDoc(collection(db, "smartPickResults"), dataToSave);
    console.log(`[SAVE_SMART_PICK] Smart pick result saved successfully with ID: ${docRef.id} for draw ${data.drawId}, user: ${data.userId || 'anonymous'}`);
    return { success: true, message: "智能选号结果已保存。", docId: docRef.id };
  } catch (error) {
    console.error("[SAVE_SMART_PICK] Error saving smart pick result to Firestore:", error);
    let errorMessage = "保存智能选号结果失败: ";
    if (error instanceof Error) {
      errorMessage += error.message;
       const firebaseError = error as any; 
       if (firebaseError.code === 'permission-denied' || firebaseError.code === 7 || firebaseError.code === 'PERMISSION_DENIED') {
        errorMessage += ` (Firestore权限不足。尝试保存的userId: ${data.userId}. 服务器端SDK识别的用户UID: ${actionAuthUid}. 请确认Firestore安全规则已正确部署，并且客户端已重新登录以刷新权限。)`;
      }
    } else {
      errorMessage += "未知错误";
    }
    return { success: false, message: errorMessage };
  }
}
