export type LlmRequest = {
  system: string;
  prompt: string;
};

export type LlmProvider = "gemini" | "xai";

export interface LlmClient {
  readonly provider: LlmProvider;
  readonly model: string;
  /** Devuelve texto del modelo que debería ser un documento JSON; quien llama lo valida con zod. */
  generateJson(req: LlmRequest): Promise<string>;
  /** Devuelve texto libre (respuestas en lenguaje natural). */
  generateText(req: LlmRequest): Promise<string>;
}
