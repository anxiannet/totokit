// src/ai/flows/generate-number-combinations.ts
'use server';

/**
 * @fileOverview Generates TOTO number combinations based on historical data and user-weighted criteria.
 *
 * - generateNumberCombinations - A function that generates TOTO number combinations.
 * - GenerateNumberCombinationsInput - The input type for the generateNumberCombinations function.
 * - GenerateNumberCombinationsOutput - The output type for the generateNumberCombinations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateNumberCombinationsInputSchema = z.object({
  historicalData: z.string().describe('Historical TOTO results data.'),
  weightedCriteria: z
    .record(z.number())
    .describe(
      'User-defined weighted criteria for number selection (e.g., hot numbers, odd/even balance).'
    ),
  luckyNumbers: z
    .array(z.number())
    .optional()
    .describe('User-defined lucky numbers to include in the combinations.'),
  excludeNumbers: z
    .array(z.number())
    .optional()
    .describe('User-defined numbers to exclude from the combinations.'),
  numberOfCombinations: z
    .number()
    .default(10)
    .describe('The number of TOTO combinations to generate.'),
});

export type GenerateNumberCombinationsInput = z.infer<typeof GenerateNumberCombinationsInputSchema>;

const GenerateNumberCombinationsOutputSchema = z.object({
  combinations: z
    .array(z.array(z.number()))
    .describe('An array of generated TOTO number combinations.'),
});

export type GenerateNumberCombinationsOutput = z.infer<typeof GenerateNumberCombinationsOutputSchema>;

export async function generateNumberCombinations(
  input: GenerateNumberCombinationsInput
): Promise<GenerateNumberCombinationsOutput> {
  return generateNumberCombinationsFlow(input);
}

const generateNumberCombinationsPrompt = ai.definePrompt({
  name: 'generateNumberCombinationsPrompt',
  input: {schema: GenerateNumberCombinationsInputSchema},
  output: {schema: GenerateNumberCombinationsOutputSchema},
  prompt: `You are an AI TOTO number prediction expert.

  Based on the historical TOTO results data, and the user-defined weighted criteria, generate a ranked set of potential winning combinations.

  Historical Data: {{{historicalData}}}
  Weighted Criteria: {{#each weightedCriteria}}{{@key}}: {{{this}}} {{/each}}
  Lucky Numbers: {{#if luckyNumbers}}{{{luckyNumbers}}}{{else}}None{{/if}}
  Exclude Numbers: {{#if excludeNumbers}}{{{excludeNumbers}}}{{else}}None{{/if}}
  Number of Combinations: {{{numberOfCombinations}}}

  Return only the combinations.
  Do not return an explanation.
  Ensure no duplicate numbers are in the same combination. Each number must be between 1 and 49 inclusive.
  Ensure that the total number of generated combinations matches the Number of Combinations specified.
  Ensure that the lucky numbers are included in the generated combinations.
  Ensure that the exclude numbers are not included in the generated combinations.
  `,
});

const generateNumberCombinationsFlow = ai.defineFlow(
  {
    name: 'generateNumberCombinationsFlow',
    inputSchema: GenerateNumberCombinationsInputSchema,
    outputSchema: GenerateNumberCombinationsOutputSchema,
  },
  async input => {
    const {output} = await generateNumberCombinationsPrompt(input);
    return output!;
  }
);
