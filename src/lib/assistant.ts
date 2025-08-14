import type { AssistantMessage, RemixSpec } from "../types";

export async function askLLM(input: string, ctx?: Record<string, unknown>): Promise<AssistantMessage> {
  // Try your backend first
  try {
    const res = await fetch("/api/assistant-reply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ input, ctx }),
    });
    if (res.ok) {
      const data = await res.json();
      return { id: crypto.randomUUID(), role: "assistant", text: data.text || "ok", ts: Date.now() };
    }
  } catch {}

  // Fallback: local echo (compiles offline)
  return { id: crypto.randomUUID(), role: "assistant", text: `💡 stub: “${input}”`, ts: Date.now() };
}

export async function imageToVideo(spec: RemixSpec): Promise<{ ok: boolean; url?: string; error?: string; }> {
  try {
    const res = await fetch("/api/image-to-video", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(spec),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    return { ok: true, url: data.url };
  } catch (e: any) {
    return { ok: false, error: e?.message || "remix failed" };
  }
}
