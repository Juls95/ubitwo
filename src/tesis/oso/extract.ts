import { z } from "zod";
import type { LlmClient } from "../../llm/types";
import { ExtractedPost, type Discarded } from "../esquemas/oso";

export const STRUCTURING_SYSTEM = `Conviertes en JSON una respuesta de investigación sobre publicaciones de X.
Reglas:
- Incluye solo publicaciones que aparezcan en la lista CITAS proporcionada; copia la URL exactamente.
- "paraphrase": con tus propias palabras, en español, máximo 240 caracteres. Nunca copies el texto de la publicación literalmente.
- "contains_numeric_claim": true si la publicación menciona una cifra (usuarios, volumen, TVL, precio, crecimiento...).
- "primary_source_url": un enlace en la publicación a near.org, documentación, GitHub, un explorador o un panel oficial; si no, null.
- "claim_type": announcement | metric | opinion | promo | other. Sorteos, enlaces de referidos y llamados tipo "100x" son promo.
- "sentiment": de -1 (muy negativa sobre NEAR) a 1 (muy positiva).
- No inventes publicaciones, fechas ni números. Si tienes dudas, omite la publicación.
Devuelve solo {"posts":[...]}.`;

export function structuringPrompt(searchAnswer: string, citations: readonly string[], date: string): string {
  return `FECHA (UTC): ${date}\nCITAS:\n${citations.join("\n")}\n\nRESPUESTA DE INVESTIGACIÓN:\n${searchAnswer}`;
}

const STATUS_URL = /^https:\/\/(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status\/(\d+)/;

export function normalizeStatusUrl(url: string): { handle: string; id: string; canonical: string } | null {
  const m = STATUS_URL.exec(url);
  if (!m?.[1] || !m[2]) return null;
  return { handle: m[1], id: m[2], canonical: `https://x.com/${m[1]}/status/${m[2]}` };
}

export type VerifyInput = {
  posts: readonly unknown[];
  citations: ReadonlySet<string>;
  allowedHandles: ReadonlySet<string>;
  date: string;
};

/**
 * Compuerta contra alucinaciones: una publicación sobrevive solo si está bien formada, la citó xAI,
 * la escribió una cuenta permitida, cae dentro del día solicitado y no está duplicada.
 */
export function verifyPosts({ posts, citations, allowedHandles, date }: VerifyInput): { kept: ExtractedPost[]; discarded: Discarded[] } {
  const cited = new Set([...citations].map((u) => normalizeStatusUrl(u)?.canonical).filter((u): u is string => Boolean(u)));
  const allowed = new Set([...allowedHandles].map((h) => h.toLowerCase()));
  const seen = new Set<string>();
  const kept: ExtractedPost[] = [];
  const discarded: Discarded[] = [];
  for (const raw of posts) {
    const parsed = ExtractedPost.safeParse(raw);
    const rawUrl = typeof raw === "object" && raw && "url" in raw ? String((raw as { url: unknown }).url) : "";
    if (!parsed.success) {
      discarded.push({ url: rawUrl, reason: "invalid_shape" });
      continue;
    }
    const post = parsed.data;
    const norm = normalizeStatusUrl(post.url);
    if (!norm || !cited.has(norm.canonical)) {
      discarded.push({ url: post.url, reason: "not_in_citations" });
      continue;
    }
    if (!allowed.has(norm.handle.toLowerCase())) {
      discarded.push({ url: post.url, reason: "handle_not_allowed" });
      continue;
    }
    if (post.date !== date) {
      discarded.push({ url: post.url, reason: "outside_date_window" });
      continue;
    }
    if (seen.has(norm.id)) {
      discarded.push({ url: post.url, reason: "duplicate" });
      continue;
    }
    seen.add(norm.id);
    kept.push({ ...post, url: norm.canonical, post_id: norm.id, handle: norm.handle });
  }
  return { kept, discarded };
}

export async function structureAnswer(llm: LlmClient, answer: string, citations: readonly string[], date: string): Promise<unknown[]> {
  const text = await llm.generateJson({ system: STRUCTURING_SYSTEM, prompt: structuringPrompt(answer, citations, date) });
  const parsed = z.object({ posts: z.array(z.unknown()) }).safeParse(JSON.parse(text));
  if (!parsed.success) throw new Error(`El modelo de estructuración devolvió una forma inesperada: ${parsed.error.message}`);
  return parsed.data.posts;
}