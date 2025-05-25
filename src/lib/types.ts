export type TotoCombination = number[];

export interface HistoricalResult {
  drawNumber: number;
  date: string;
  numbers: TotoCombination;
  additionalNumber: number;
}

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
  // Add more analysis data structures as needed
}

// Mock historical data for development
export const MOCK_HISTORICAL_DATA: HistoricalResult[] = [
  { drawNumber: 3920, date: "2024-07-15", numbers: [5, 12, 23, 31, 40, 49], additionalNumber: 18 },
  { drawNumber: 3919, date: "2024-07-12", numbers: [2, 11, 19, 28, 35, 44], additionalNumber: 7 },
  { drawNumber: 3918, date: "2024-07-08", numbers: [8, 15, 22, 30, 38, 47], additionalNumber: 25 },
  { drawNumber: 3917, date: "2024-07-05", numbers: [1, 10, 20, 29, 39, 42], additionalNumber: 33 },
  { drawNumber: 3916, date: "2024-07-01", numbers: [6, 14, 21, 34, 41, 46], additionalNumber: 3 },
];

export const MOCK_LATEST_RESULT: HistoricalResult = MOCK_HISTORICAL_DATA[0];

export const TOTO_NUMBER_RANGE = { min: 1, max: 49 };
export const TOTO_COMBINATION_LENGTH = 6;
