// src/lib/api.ts
export async function assistantReply(prompt: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  const apiKey = localStorage.getItem("sn2177.apiKey") || "";
  try {
    const r = await fetch("/api/assistant-reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey, prompt }), // <— 'prompt' shape
    });
    const j = await r.json().catch(() => ({}));
    return j?.ok ? { ok: true, text: j.text || "" } : { ok: false, error: j?.error || "Failed" };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Network error" };
  }
}

export async function fetchPlayers(): Promise<{ id: string; name: string; color: string }[]> {
  try {
    const r = await fetch("/api/players");
    const j = await r.json().catch(() => ({}));
    return j?.ok ? (j.players || []) : [];
  } catch {
    return [];
  }
}
