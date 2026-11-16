import { hasLlm, requireEnv, type Env } from "../config/env";
import { createGeminiClient } from "./gemini";
import { createXaiClient } from "./xai";
import type { LlmClient } from "./types";

/** Cambiar de modelo es cambiar variables: LLM_PROVIDER + LLM_MODEL. Falla rápido si faltan credenciales. */
export function createLlmClient(env: Env, fetchImpl?: typeof fetch): LlmClient {
  if (env.LLM_PROVIDER === "xai") {
    const { XAI_API_KEY } = requireEnv(env, ["XAI_API_KEY"]);
    return createXaiClient(XAI_API_KEY, env.LLM_MODEL ?? env.XAI_MODEL, fetchImpl);
  }
  const { GEMINI_API_KEY, LLM_MODEL } = requireEnv(env, ["GEMINI_API_KEY", "LLM_MODEL"]);
  return createGeminiClient(GEMINI_API_KEY, LLM_MODEL, fetchImpl);
}

/** Para funciones opcionales (Pregúntale a ubitwo): sin credenciales no hay cliente y se usa el modo sin IA. */
export function maybeLlmClient(env: Env, fetchImpl?: typeof fetch): LlmClient | undefined {
  return hasLlm(env) ? createLlmClient(env, fetchImpl) : undefined;
}

export type { LlmClient, LlmProvider, LlmRequest } from "./types";
