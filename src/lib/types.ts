
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

export const TOTO_NUMBER_RANGE = { min: 1, max: 49 };
export const TOTO_COMBINATION_LENGTH = 6;
