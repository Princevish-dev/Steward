import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, type LanguageModel } from "ai";
import type { z } from "zod";

export type AiCallMeta = {
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
};

export type AiObjectGenerator = <T>(input: {
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
  timeoutMs?: number;
}) => Promise<{ object: T; meta: AiCallMeta }>;

const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ?? (anthropicKey?.startsWith("AQ.") || anthropicKey?.startsWith("AIza") ? anthropicKey : undefined);
const isGoogleKey = Boolean(googleKey);

const DEFAULT_MODEL = isGoogleKey ? (process.env.GEMINI_MODEL ?? "gemini-3.5-flash-lite") : (process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5");

export const useLlm = process.env.USE_LLM !== "false" && Boolean(anthropicKey || googleKey);

function estimateCost(model: string, inputTokens?: number, outputTokens?: number): number | undefined {
  if (inputTokens === undefined || outputTokens === undefined) return undefined;
  if (model.includes("gemini")) {
    return inputTokens * 0.0000001 + outputTokens * 0.0000004;
  }
  return inputTokens * 0.000003 + outputTokens * 0.000015;
}

function getModel(modelName: string): LanguageModel {
  if (isGoogleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    return google(modelName);
  }
  return anthropic(modelName);
}

export const generateAiObject: AiObjectGenerator = async ({ schema, system, prompt, timeoutMs = 30_000 }) => {
  const started = Date.now();
  const modelName = DEFAULT_MODEL;
  const result = await generateObject({
    model: getModel(modelName),
    schema,
    system,
    prompt,
    abortSignal: AbortSignal.timeout(timeoutMs)
  });
  const inputTokens = result.usage.inputTokens;
  const outputTokens = result.usage.outputTokens;
  return {
    object: result.object,
    meta: {
      model: modelName,
      latencyMs: Date.now() - started,
      inputTokens,
      outputTokens,
      costUsd: estimateCost(modelName, inputTokens, outputTokens)
    }
  };
};
