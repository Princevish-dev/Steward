import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject, type LanguageModel } from "ai";
import type { z } from "zod";

export const NEMOTRON_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

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
  model?: string;
  timeoutMs?: number;
}) => Promise<{ object: T; meta: AiCallMeta }>;

export function stripReasoningTokens(text: string): string {
  if (!text || typeof text !== "string") return text;
  // Remove <think>...</think> and [THINK]...[/THINK] reasoning blocks
  let cleaned = text
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/\[THINK\][\s\S]*?\[\/THINK\]/gi, "")
    .trim();
  // Unwrap markdown JSON code fences if present (```json ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) {
    cleaned = codeBlockMatch[1].trim();
  }
  return cleaned;
}

export function extractJsonFromModelOutput<T>(text: string, schema: z.ZodType<T>): T {
  const cleaned = stripReasoningTokens(text);
  try {
    const parsed = JSON.parse(cleaned);
    return schema.parse(parsed);
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const jsonSubstring = cleaned.slice(firstBrace, lastBrace + 1);
      const parsed = JSON.parse(jsonSubstring);
      return schema.parse(parsed);
    }
    throw new Error(`Unable to extract valid JSON conforming to schema: ${text.slice(0, 150)}`);
  }
}

export const createNvidiaFetch = (underlyingFetch: typeof fetch = fetch): typeof fetch => {
  return async (input, init) => {
    let modifiedInit = init;

    // 1. Request translation: inject thinking tokens configuration into OpenAI-compatible payload
    if (init?.body && typeof init.body === "string" && init.method === "POST") {
      try {
        const parsed = JSON.parse(init.body);
        // Translate Python extra_body={"chat_template_kwargs":{"enable_thinking":True}}
        parsed.chat_template_kwargs = {
          ...(parsed.chat_template_kwargs || {}),
          enable_thinking: true
        };
        parsed.extra_body = {
          ...(parsed.extra_body || {}),
          chat_template_kwargs: { enable_thinking: true }
        };
        modifiedInit = {
          ...init,
          body: JSON.stringify(parsed)
        };
      } catch {
        // Continue with original init if parsing fails
      }
    }

    const response = await underlyingFetch(input, modifiedInit);

    // 2. Response interception: strip reasoning tokens before Vercel AI SDK parses choices
    if (response.ok) {
      try {
        const cloned = response.clone();
        const data = await cloned.json();
        let modified = false;

        if (Array.isArray(data?.choices)) {
          for (const choice of data.choices) {
            if (typeof choice?.message?.content === "string") {
              const original = choice.message.content;
              const cleaned = stripReasoningTokens(original);
              if (cleaned !== original) {
                choice.message.content = cleaned;
                modified = true;
              }
            }
          }
        }

        if (modified) {
          const headers = new Headers(response.headers);
          headers.set("content-type", "application/json");
          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers
          });
        }
      } catch {
        // Fall back to original response if body cloning or JSON parsing fails
      }
    }

    return response;
  };
};

export const nvidia = createOpenAI({
  baseURL: process.env.NVIDIA_BASE_URL ?? "https://integrate.api.nvidia.com/v1",
  apiKey: process.env.NVIDIA_API_KEY?.trim(),
  fetch: createNvidiaFetch()
});

const nvidiaKey = process.env.NVIDIA_API_KEY?.trim();
const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() ?? (anthropicKey?.startsWith("AQ.") || anthropicKey?.startsWith("AIza") ? anthropicKey : undefined);
const isGoogleKey = Boolean(googleKey);

export const DEFAULT_MODEL = process.env.NVIDIA_MODEL ?? NEMOTRON_MODEL;

export const useLlm = process.env.USE_LLM !== "false" && Boolean(nvidiaKey || googleKey || anthropicKey);

function estimateCost(model: string, inputTokens?: number, outputTokens?: number): number | undefined {
  if (inputTokens === undefined || outputTokens === undefined) return undefined;
  if (model.includes("nemotron") || model.includes("nvidia")) {
    return inputTokens * 0.000001 + outputTokens * 0.000003;
  }
  if (model.includes("gemini")) {
    return inputTokens * 0.0000001 + outputTokens * 0.000004;
  }
  return inputTokens * 0.000003 + outputTokens * 0.000015;
}

export function getModel(modelName: string = DEFAULT_MODEL): LanguageModel {
  if (nvidiaKey || modelName.startsWith("nvidia/") || modelName.includes("nemotron")) {
    return nvidia.chat(modelName);
  }
  if (isGoogleKey) {
    const google = createGoogleGenerativeAI({ apiKey: googleKey });
    return google(modelName);
  }
  if (anthropicKey) {
    return anthropic(modelName);
  }
  return nvidia.chat(modelName);
}

export const generateAiObject: AiObjectGenerator = async ({
  schema,
  system,
  prompt,
  model = DEFAULT_MODEL,
  timeoutMs = 30_000
}) => {
  const started = Date.now();
  const modelName = model;
  const targetModel = getModel(modelName);

  try {
    const result = await generateObject({
      model: targetModel,
      schema,
      system,
      prompt,
      providerOptions: {
        openai: {
          // Extra options passed directly through AI SDK
        }
      },
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
  } catch (err: unknown) {
    // JSON Enforcement: fallback extraction if raw response contains reasoning tokens that broke direct schema parsing
    const rawText = (err as { text?: string })?.text ?? (err as { responseBody?: string })?.responseBody;
    if (typeof rawText === "string" && rawText.length > 0) {
      try {
        const fallbackObject = extractJsonFromModelOutput(rawText, schema);
        return {
          object: fallbackObject,
          meta: {
            model: modelName,
            latencyMs: Date.now() - started,
            costUsd: estimateCost(modelName, 0, 0)
          }
        };
      } catch {
        // Fallback failed, re-throw the original error
      }
    }
    throw err;
  }
};
