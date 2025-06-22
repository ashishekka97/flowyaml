'use server';

/**
 * @fileOverview This file defines a Genkit flow for validating flowcharts.
 *
 * It checks for potential issues like loops, dead ends, and unreachable nodes.
 * Exported functions:
 * - `validateFlowchart`: Validates a flowchart represented as a YAML string.
 * - `FlowchartValidationInput`: Input type for `validateFlowchart`, a YAML string.
 * - `FlowchartValidationOutput`: Output type for `validateFlowchart`, a string describing validation results.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FlowchartValidationInputSchema = z.object({
  yamlCode: z
    .string()
    .describe('The YAML code representing the flowchart to be validated.'),
});
export type FlowchartValidationInput = z.infer<typeof FlowchartValidationInputSchema>;

const FlowchartValidationOutputSchema = z.object({
  validationResult: z
    .string()
    .describe(
      'A string describing the validation results, including any identified issues like loops, dead ends, or unreachable nodes.'
    ),
});
export type FlowchartValidationOutput = z.infer<typeof FlowchartValidationOutputSchema>;

export async function validateFlowchart(
  input: FlowchartValidationInput
): Promise<FlowchartValidationOutput> {
  return validateFlowchartFlow(input);
}

const validateFlowchartPrompt = ai.definePrompt({
  name: 'validateFlowchartPrompt',
  input: {schema: FlowchartValidationInputSchema},
  output: {schema: FlowchartValidationOutputSchema},
  prompt: `You are an AI expert in analyzing flowcharts represented as YAML code.

  Your task is to identify potential issues within the flowchart, such as:
  - Loops: Check for any circular paths that could cause the flowchart to run indefinitely.
  - Dead Ends: Identify any nodes that do not lead to a terminator node.
  - Unreachable Nodes: Determine if there are any nodes that cannot be reached from the start node.

  Provide a detailed validation result, clearly stating any identified issues.

  Here is the YAML code for the flowchart:
  \`\`\`yaml
  {{{yamlCode}}}
  \`\`\`

  Now, perform the validation and provide the result. Be concise and provide the steps for improvement.
  `,
});

const validateFlowchartFlow = ai.defineFlow(
  {
    name: 'validateFlowchartFlow',
    inputSchema: FlowchartValidationInputSchema,
    outputSchema: FlowchartValidationOutputSchema,
  },
  async input => {
    const {output} = await validateFlowchartPrompt(input);
    return output!;
  }
);

