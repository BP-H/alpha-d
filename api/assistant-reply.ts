// /api/assistant-reply.ts
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  // Prefer the server env var; fall back to client-supplied key for local/dev.
  const body = (req.body ?? {}) as any;
  const apiKey = process.env.OPENAI_API_KEY || body.apiKey || "";
  if (!apiKey) return res.status(500).json({ ok: false, error: "Missing OPENAI_API_KEY" });

  // Accept either {prompt} or {q}
  const raw = typeof body.prompt === "string" ? body.prompt : (typeof body.q === "string" ? body.q : "");
  const prompt = (raw || "").trim();
  if (!prompt) return res.status(400).json({ ok: false, error: "Missing prompt" });

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: "You are the SuperNOVA assistant orb. Reply in one or two concise sentences. No markdown." },
          { role: "user", content: prompt.slice(0, 2000) },
        ],
      }),
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ ok: false, error: j?.error?.message || "Failed" });
    const text = (j?.choices?.[0]?.message?.content || "").trim();
    return res.status(200).json({ ok: true, text });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e?.message || "Network error" });
  }
}
