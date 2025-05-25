// Summarize the historical TOTO results analysis for quick understanding of trends and patterns.
'use server';
/**
 * @fileOverview Summarizes historical TOTO results analysis.
 *
 * - summarizeResultsAnalysis - A function that summarizes the results analysis.
 * - SummarizeResultsAnalysisInput - The input type for the summarizeResultsAnalysis function.
 * - SummarizeResultsAnalysisOutput - The return type for the summarizeResultsAnalysis function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeResultsAnalysisInputSchema = z.object({
  analysisResults: z
    .string()
    .describe('The historical TOTO results analysis to summarize.'),
});
export type SummarizeResultsAnalysisInput = z.infer<
  typeof SummarizeResultsAnalysisInputSchema
>;

const SummarizeResultsAnalysisOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the analysis results.'),
});
export type SummarizeResultsAnalysisOutput = z.infer<
  typeof SummarizeResultsAnalysisOutputSchema
>;

export async function summarizeResultsAnalysis(
  input: SummarizeResultsAnalysisInput
): Promise<SummarizeResultsAnalysisOutput> {
  return summarizeResultsAnalysisFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeResultsAnalysisPrompt',
  input: {schema: SummarizeResultsAnalysisInputSchema},
  output: {schema: SummarizeResultsAnalysisOutputSchema},
  prompt: `You are an expert in analyzing TOTO results and identifying trends.

  Summarize the following TOTO results analysis in a concise and easy-to-understand manner.

  Analysis Results: {{{analysisResults}}}`,
});

const summarizeResultsAnalysisFlow = ai.defineFlow(
  {
    name: 'summarizeResultsAnalysisFlow',
    inputSchema: SummarizeResultsAnalysisInputSchema,
    outputSchema: SummarizeResultsAnalysisOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
