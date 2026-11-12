// Injected by the platform. Do not edit.
import { env } from "./env";

export type AiMessage = { role: "user" | "assistant"; content: string };
type SupabaseLike = { auth: { getSession: () => Promise<{ data: { session: { access_token: string } | null } }> } };

/** True when the app can reach the AI relay (the owner still has to set an AI key in the platform). */
export const aiEnabled = Boolean(env.paymentsUrl);

/**
 * Asks the AI (signed-in users only). input: a question, or a conversation with an optional system prompt.
 * Returns the answer text; throws an Error with a message ready to show to the user.
 */
export async function askAI(
  supabase: SupabaseLike,
  input: string | { messages: AiMessage[]; system?: string; maxTokens?: number },
): Promise<string> {
  if (!env.paymentsUrl) throw new Error("L'assistant IA n'est pas disponible dans cette version.");
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Connectez-vous pour utiliser l'assistant.");
  const body = typeof input === "string" ? { messages: [{ role: "user", content: input }] } : input;
  const res = await fetch(env.paymentsUrl.replace("/api/pay/", "/api/app-ai/") + "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as { text?: string; message?: string };
  if (!res.ok) throw new Error(json.message || "L'assistant IA n'a pas pu répondre.");
  return json.text ?? "";
}
