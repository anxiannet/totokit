"use server";

import { generateNumberCombinations as genkitGenerateNumberCombinations } from "@/ai/flows/generate-number-combinations";
import type { GenerateNumberCombinationsInput, GenerateNumberCombinationsOutput } from "@/ai/flows/generate-number-combinations";
import type { WeightedCriterion } from "./types";

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
    
    // Add default criteria if none are provided to prevent AI errors
    if (Object.keys(weightedCriteria).length === 0) {
        weightedCriteria['generalBalance'] = 0.5; // Default criteria
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

    // Validate combinations
    const validCombinations = result.combinations.filter(combo => 
      Array.isArray(combo) &&
      combo.length > 0 && // Ensure combo is not empty
      combo.every(num => typeof num === 'number' && num >= 1 && num <= 49) &&
      new Set(combo).size === combo.length // Ensure no duplicates
    );

    if (validCombinations.length === 0 && result.combinations.length > 0) {
        // This case means AI returned combinations, but they were malformed.
        return { error: "AI returned malformed combinations. Please try adjusting parameters." };
    }
    
    return { combinations: validCombinations };

  } catch (error) {
    console.error("Error generating TOTO predictions:", error);
    return { error: error instanceof Error ? error.message : "An unknown error occurred during prediction." };
  }
}
