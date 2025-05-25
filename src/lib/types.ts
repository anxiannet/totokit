
export type TotoCombination = number[];

export interface HistoricalResult {
  drawNumber: number;
  date: string; // YYYY-MM-DD
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

// Only keep the new draw result
const newDrawResult: HistoricalResult = {
  drawNumber: 4080,
  date: "2025-05-22",
  numbers: [3, 10, 32, 34, 44, 48],
  additionalNumber: 29
};

// Mock historical data for development - now only contains the single provided result
export const MOCK_HISTORICAL_DATA: HistoricalResult[] = [
  newDrawResult,
];

export const MOCK_LATEST_RESULT: HistoricalResult = newDrawResult;

export const TOTO_NUMBER_RANGE = { min: 1, max: 49 };
export const TOTO_COMBINATION_LENGTH = 6;

