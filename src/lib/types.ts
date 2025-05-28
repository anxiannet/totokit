
import { z } from 'zod';

export type TotoCombination = number[];

export const TOTO_NUMBER_RANGE = { min: 1, max: 49 };
export const TOTO_COMBINATION_LENGTH = 6;

// Define the schema first
export const HistoricalResultSchema = z.object({
  drawNumber: z.number(),
  date: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    "Date must be in YYYY-MM-DD format"
  ),
  numbers: z.array(
    z.number().min(TOTO_NUMBER_RANGE.min).max(TOTO_NUMBER_RANGE.max)
  ).length(TOTO_COMBINATION_LENGTH, `Must have ${TOTO_COMBINATION_LENGTH} winning numbers`),
  additionalNumber: z.number().min(TOTO_NUMBER_RANGE.min).max(TOTO_NUMBER_RANGE.max),
  userId: z.string().optional(), // Added for Firestore rule checking on admin sync
});

// Derive the TypeScript interface from the Zod schema
export interface HistoricalResult extends z.infer<typeof HistoricalResultSchema> {}


// Mock historical data for development
export const MOCK_HISTORICAL_DATA: HistoricalResult[] = [
  {
    "drawNumber": 4081,
    "date": "2025-05-26",
    "numbers": [5, 9, 15, 28, 46, 48],
    "additionalNumber": 8
  },
  {
    "drawNumber": 4080,
    "date": "2025-05-22",
    "numbers": [3, 10, 32, 34, 44, 48],
    "additionalNumber": 29
  },
  {
    "drawNumber": 4079,
    "date": "2025-05-19",
    "numbers": [2, 15, 17, 18, 39, 45],
    "additionalNumber": 26
  },
  {
    "drawNumber": 4078,
    "date": "2025-05-15",
    "numbers": [9, 16, 17, 20, 34, 38],
    "additionalNumber": 18
  },
  {
    "drawNumber": 4077,
    "date": "2025-05-12",
    "numbers": [6, 16, 20, 23, 40, 48],
    "additionalNumber": 45
  },
  {
    "drawNumber": 4076,
    "date": "2025-05-08",
    "numbers": [9, 13, 17, 39, 46, 47],
    "additionalNumber": 22
  },
  {
    "drawNumber": 4075,
    "date": "2025-05-05",
    "numbers": [5, 8, 28, 38, 40, 43],
    "additionalNumber": 39
  },
  {
    "drawNumber": 4074,
    "date": "2025-05-01",
    "numbers": [2, 8, 12, 30, 35, 49],
    "additionalNumber": 38
  },
  {
    "drawNumber": 4073,
    "date": "2025-04-28",
    "numbers": [3, 8, 12, 18, 24, 41],
    "additionalNumber": 11
  },
  {
    "drawNumber": 4072,
    "date": "2025-04-24",
    "numbers": [17, 19, 21, 23, 30, 40],
    "additionalNumber": 33
  },
  {
    "drawNumber": 4071,
    "date": "2025-04-21",
    "numbers": [1, 17, 30, 37, 41, 43],
    "additionalNumber": 32
  },
  {
    "drawNumber": 4070,
    "date": "2025-04-17",
    "numbers": [15, 17, 26, 31, 40, 46],
    "additionalNumber": 19
  },
  {
    "drawNumber": 4069,
    "date": "2025-04-14",
    "numbers": [6, 14, 29, 30, 35, 42],
    "additionalNumber": 25
  },
  {
    "drawNumber": 4068,
    "date": "2025-04-10",
    "numbers": [14, 26, 27, 30, 46, 48],
    "additionalNumber": 10
  },
  {
    "drawNumber": 4067,
    "date": "2025-04-07",
    "numbers": [7, 19, 35, 40, 43, 47],
    "additionalNumber": 33
  },
  {
    "drawNumber": 4066,
    "date": "2025-04-03",
    "numbers": [12, 14, 15, 16, 21, 40],
    "additionalNumber": 23
  },
  {
    "drawNumber": 4065,
    "date": "2025-03-31",
    "numbers": [9, 12, 17, 23, 29, 46],
    "additionalNumber": 20
  },
  {
    "drawNumber": 4064,
    "date": "2025-03-27",
    "numbers": [21, 22, 27, 35, 40, 42],
    "additionalNumber": 3
  },
  {
    "drawNumber": 4063,
    "date": "2025-03-24",
    "numbers": [18, 19, 25, 28, 31, 44],
    "additionalNumber": 34
  },
  {
    "drawNumber": 4062,
    "date": "2025-03-20",
    "numbers": [9, 10, 11, 13, 23, 42],
    "additionalNumber": 20
  },
  {
    "drawNumber": 4061,
    "date": "2025-03-17",
    "numbers": [7, 30, 39, 42, 43, 48],
    "additionalNumber": 33
  },
  {
    "drawNumber": 4060,
    "date": "2025-03-13",
    "numbers": [16, 26, 34, 36, 42, 49],
    "additionalNumber": 41
  }
];

export const MOCK_LATEST_RESULT: HistoricalResult = MOCK_HISTORICAL_DATA[0];

export interface WeightedCriterion {
  id: string;
  name: string;
  weight: number;
}

export interface UserTicket {
  id: string;
  numbers: TotoCombination;
}

export interface AnalysisData {
  hotNumbers: { number: number, frequency: number }[];
  coldNumbers: { number: number, frequency: number }[];
  oddEvenRatio: { odd: number, even: number, percentage: number }[];
}

// --- For Firestore `toolPredictions` collection ---
export interface PredictionDetail {
  predictedNumbers: number[];
  targetDrawDate: string; // Actual date for historical, "PENDING_DRAW" for future
  savedAt: any; // Firestore Timestamp
  userId?: string; // Admin UID who saved/updated this specific prediction
}

export interface ToolPredictionsDocument {
  toolId: string;
  toolName: string;
  predictionsByDraw: Record<string, PredictionDetail>; // Key is targetDrawNumber as string
  lastUpdatedAt: any; // Firestore Timestamp
  userId: string; // Admin UID who last updated this document
}

// For saving individual predictions from server actions
export interface ToolPredictionInput {
  toolId: string;
  toolName: string;
  targetDrawNumber: string | number;
  targetDrawDate?: string;
  predictedNumbers: number[];
  userId?: string; // UID of the admin performing the save
}

// For saving smart pick results (now local, but interface can remain)
export interface SmartPickResultInput {
  userId: string | null;
  drawId: string;
  combinations: TotoCombination[];
  idToken?: string | null; // If passing user's ID token
}

// For appSettings/currentDrawInfo
export interface CurrentDrawInfo {
  currentDrawDateTime: string;
  currentJackpot: string;
  officialPredictionsDrawId?: string; // The draw ID for which official predictions are being shown/generated
  userId?: string; // Admin UID who last updated this
}
