
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, limit, addDoc, serverTimestamp } from "firebase/firestore";
import type { HistoricalResult } from "@/lib/types";
import { MOCK_HISTORICAL_DATA, MOCK_LATEST_RESULT } from "@/lib/types";

const TOTO_RESULTS_COLLECTION = "totoResults";

export async function getHistoricalResultsFromFirestore(): Promise<HistoricalResult[]> {
  try {
    const q = query(collection(db, TOTO_RESULTS_COLLECTION), orderBy("drawNumber", "desc"));
    const querySnapshot = await getDocs(q);
    const results: HistoricalResult[] = [];
    querySnapshot.forEach((doc) => {
      // Firestore data might include server timestamps or other Firestore-specific fields.
      // Ensure we only pull what's defined in HistoricalResult.
      const data = doc.data();
      results.push({
        drawNumber: data.drawNumber,
        date: data.date, // Assuming date is stored as a string like "YYYY-MM-DD"
        numbers: data.numbers,
        additionalNumber: data.additionalNumber,
      });
    });

    if (results.length === 0) {
      console.warn("Firestore 'totoResults' collection is empty. Falling back to mock data for historical results.");
      return MOCK_HISTORICAL_DATA;
    }
    return results;
  } catch (error) {
    console.error("Error fetching historical results from Firestore:", error);
    console.warn("Falling back to mock data for historical results due to error.");
    return MOCK_HISTORICAL_DATA; // Fallback to mock data on error
  }
}

export async function getLatestHistoricalResultFromFirestore(): Promise<HistoricalResult> {
  try {
    const q = query(collection(db, TOTO_RESULTS_COLLECTION), orderBy("drawNumber", "desc"), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        drawNumber: data.drawNumber,
        date: data.date,
        numbers: data.numbers,
        additionalNumber: data.additionalNumber,
      };
    }
    console.warn("Firestore 'totoResults' collection is empty or no latest result found. Falling back to mock data for latest result.");
    return MOCK_LATEST_RESULT; // Fallback if no results
  } catch (error) {
    console.error("Error fetching latest result from Firestore:", error);
    console.warn("Falling back to mock data for latest result due to error.");
    return MOCK_LATEST_RESULT; // Fallback to mock data on error
  }
}

/**
 * Adds a new historical TOTO result to Firestore.
 * This function would typically be used by a separate script or admin interface
 * to populate the database, not directly from the main user-facing application.
 * @param result The HistoricalResult object to add.
 */
export async function addHistoricalResultToFirestore(result: Omit<HistoricalResult, 'id'>): Promise<void> {
  try {
    // Consider adding a check to prevent duplicate drawNumbers if necessary
    await addDoc(collection(db, TOTO_RESULTS_COLLECTION), {
      ...result,
      createdAt: serverTimestamp(), // Optional: add a timestamp for when it was added
    });
    console.log(`Successfully added result for draw number ${result.drawNumber} to Firestore.`);
  } catch (error) {
    console.error("Error adding historical result to Firestore:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}
