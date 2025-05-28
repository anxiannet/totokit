
// functions/src/index.ts
// (确保您已经在此目录下运行了 npm install firebase-admin firebase-functions zod)

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {z} from "zod"; // For data validation

// Initialize Firebase Admin SDK if not already initialized
// This typically happens automatically when deployed to Firebase,
// but it"s good practice for local emulation too.
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Zod schema for validating historical result data
// (should match your Next.js app"s schema)
const HistoricalResultSchema = z.object({
  drawNumber: z.number(),
  date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must be in YYYY-MM-DD format"
  ),
  numbers: z.array(
    z.number().min(1).max(49)
  ).length(6, "Must have 6 winning numbers"),
  additionalNumber: z.number().min(1).max(49),
});
const HistoricalResultsArraySchema = z.array(HistoricalResultSchema);
type HistoricalResult = z.infer<typeof HistoricalResultSchema>;


/**
 * HTTP Callable Cloud Function to sync TOTO results to Firestore.
 * - Expects `jsonDataString` in the `data` payload.
 * - Verifies that the caller is authenticated and has an `isAdmin: true`
 *   custom claim.
 * - Validates the structure of the provided JSON data.
 * - Writes each result to the `totoResults` collection, using `drawNumber`
 *   as the document ID.
 */
export const syncTotoResultsCallable = functions.https.onCall(
  async (data, context) => {
    // 1. Check Authentication and Admin Claim
    // Ensure the user is authenticated.
    if (!context.auth) {
      console.error(
        "syncTotoResultsCallable: Unauthenticated call attempt."
      );
      throw new functions.https.HttpsError(
        "unauthenticated",
        "The function must be called while authenticated."
      );
    }

    // Ensure the user has the "isAdmin" custom claim set to true.
    if (context.auth.token.isAdmin !== true) {
      const userEmail = context.auth.token.email || "N/A";
      console.warn(
        `syncTotoResultsCallable: User ${context.auth.uid} ` +
        `(email: ${userEmail}) attempted to call without admin claim.`
      );
      throw new functions.https.HttpsError(
        "permission-denied",
        "You must be an administrator to perform this action."
      );
    }
    const adminEmail = context.auth.token.email || "N/A";
    console.log(
      `syncTotoResultsCallable: Admin user ${context.auth.uid} ` +
      `(email: ${adminEmail}) initiated sync.`
    );

    // 2. Validate Input Data
    const jsonDataString = data.jsonDataString;
    if (!jsonDataString || typeof jsonDataString !== "string") {
      console.error(
        "syncTotoResultsCallable: Missing or invalid " +
        "\"jsonDataString\" argument."
      );
      throw new functions.https.HttpsError(
        "invalid-argument",
        "The function must be called with a \"jsonDataString\" argument " +
        "containing the TOTO results."
      );
    }

    let resultsToSync: HistoricalResult[];
    try {
      const parsedData = JSON.parse(jsonDataString);
      const validationResult =
        HistoricalResultsArraySchema.safeParse(parsedData);
      if (!validationResult.success) {
        const errorDetails = validationResult.error.issues
          .map((issue) => {
            const path = issue.path.join(".") || "root";
            return `${path}: ${issue.message}`;
          })
          .join("; ");
        console.error(
          "syncTotoResultsCallable: JSON data validation failed.",
          errorDetails
        );
        throw new functions.https.HttpsError(
          "invalid-argument",
          `Invalid JSON data structure. Issues: ${errorDetails}`
        );
      }
      resultsToSync = validationResult.data;
      console.log(
        "syncTotoResultsCallable: Successfully validated " +
        `${resultsToSync.length} results for sync.`
      );
    } catch (error: any) { // Explicitly typed as any for now
      console.error(
        "syncTotoResultsCallable: Error parsing or validating JSON data.",
        error
      );
      const errorMessage = (error instanceof Error) ?
        error.message :
        "Unknown parsing/validation error";
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid JSON data provided: ${errorMessage}`
      );
    }

    if (resultsToSync.length === 0) {
      console.log(
        "syncTotoResultsCallable: No results to sync after parsing."
      );
      return {success: true, message: "没有需要同步的开奖结果。", count: 0};
    }

    // 3. Sync to Firestore
    const db = admin.firestore();
    const batch = db.batch();
    let syncedCount = 0;

    resultsToSync.forEach((result) => {
      // Use drawNumber as a string for the document ID to ensure consistency
      const resultDocRef = db
        .collection("totoResults")
        .doc(String(result.drawNumber));
      // Using {merge: true} will create the document if it doesn"t exist,
      // or update it if it does, merging new fields and overwriting
      // existing ones.
      batch.set(resultDocRef, result, {merge: true});
      syncedCount++;
    });

    try {
      await batch.commit();
      console.log(
        `syncTotoResultsCallable: Successfully synced/updated ` +
        `${syncedCount} historical results to Firestore by admin user ` +
        `${context.auth.uid}.`
      );
      return {
        success: true,
        message:
          `成功通过云函数同步/更新 ${syncedCount} 条开奖结果到 Firestore。`,
        count: syncedCount,
      };
    } catch (error: any) { // Explicitly typed as any for now
      console.error(
        "syncTotoResultsCallable: Error committing batch to Firestore.",
        error
      );
      const firestoreErrorMessage = (error instanceof Error) ?
        error.message :
        "Unknown Firestore error";
      throw new functions.https.HttpsError(
        "internal",
        `Failed to sync data to Firestore: ${firestoreErrorMessage}`
      );
    }
  }
);
