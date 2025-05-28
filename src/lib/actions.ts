
"use server";

import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import type { WeightedCriterion, HistoricalResult, TotoCombination } from "./types";
import { db, auth as firebaseClientAuthInstance } from "./firebase"; 
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, doc, writeBatch, runTransaction, arrayUnion, arrayRemove, getDoc, setDoc } from "firebase/firestore";


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
  jsonDataString: string,
  adminUserId: string | null
): Promise<{ success: boolean; message: string; count?: number }> {
  console.log("[SYNC_FIRESTORE] Attempting to sync historical results to Firestore.");
  if (!db) {
    console.error("[SYNC_FIRESTORE] Firestore 'db' instance is not initialized.");
    return { success: false, message: "Firestore 'db' instance is not initialized."};
  }

  if (!adminUserId) {
    console.error("[SYNC_FIRESTORE] Admin user ID not provided. Sync aborted.");
    return { success: false, message: "管理员未登录或UID无效，无法同步。" };
  }
  console.log(`[SYNC_FIRESTORE] Admin user ID: ${adminUserId} initiated sync.`);

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
      const dataToSet = { ...result, userId: adminUserId }; // Add adminUserId to each document
      batch.set(resultDocRef, dataToSet, { merge: true }); 
      count++;
    }

    await batch.commit();
    console.log(`[SYNC_FIRESTORE] Successfully synced ${count} historical results to Firestore by admin ${adminUserId}.`);
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
  console.log(`[SAVE_SMART_PICK] Input userId from client: ${data.userId}`);
  console.log(`[SAVE_SMART_PICK] Input ID Token (present): ${!!data.idToken}`);
  console.log(`[SAVE_SMART_PICK] Firebase SDK auth.currentUser.uid inside action: ${actionAuthUid}`);
  
  try {
    const transformedCombinations = data.combinations.map(combo => ({ numbers: combo }));
    const dataToSave = {
      userId: data.userId, 
      drawId: data.drawId,
      combinations: transformedCombinations,
      createdAt: serverTimestamp(),
    };
    
    console.log(`[SAVE_SMART_PICK] Data being written to Firestore:`, JSON.stringify(dataToSave, null, 2));
    console.log(`[SAVE_SMART_PICK] Target collection: smartPickResults`);
    
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

export async function updateCurrentDrawDisplayInfo(
  plainTextInfo: string,
  adminUserId: string | null
): Promise<{ success: boolean; message?: string }> {
  if (!db) {
    return { success: false, message: "Firestore 'db' instance is not initialized." };
  }
  if (!adminUserId) {
    return { success: false, message: "管理员未登录，无法更新。" };
  }

  const lines = plainTextInfo.trim().split('\n');
  if (lines.length < 2) {
    return { success: false, message: "输入格式错误。请确保第一行为日期/时间，第二行为头奖金额。" };
  }
  const currentDrawDateTime = lines[0].trim();
  const currentJackpot = lines[1].trim();

  if (!currentDrawDateTime || !currentJackpot) {
     return { success: false, message: "日期/时间或头奖金额不能为空。" };
  }

  try {
    const docRef = doc(db, "appSettings", "currentDrawInfo");
    await setDoc(docRef, {
      currentDrawDateTime,
      currentJackpot,
      updatedBy: adminUserId,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { success: true, message: "本期开奖信息已更新。" };
  } catch (error) {
    console.error("Error updating current draw display info:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return { success: false, message: `更新失败: ${errorMessage}` };
  }
}

export async function getCurrentDrawDisplayInfo(): Promise<{ currentDrawDateTime: string; currentJackpot: string } | null> {
  if (!db) {
    console.error("Firestore 'db' instance is not initialized for getCurrentDrawDisplayInfo.");
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
    console.error("Error fetching current draw display info:", error);
    return null;
  }
}
    
