// api/generate.js — runs on Vercel as a serverless function.
// Uses Groq's FREE tier (no credit card). Your key stays private here on the
// server and is never exposed in the app. References come separately from the
// free OpenAlex API, called directly by the browser.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GROQ_API_KEY. Add it in your Vercel project settings." });
    return;
  }

  try {
    const { system, prompt, model } = req.body || {};
    if (!prompt) {
      res.status(400).json({ error: "Missing prompt" });
      return;
    }

    // Free models (no credit card):
    //   llama-3.3-70b-versatile  -> recommended: best quality for academic prose
    //   llama-3.1-8b-instant     -> faster / lighter
    const m = model || "llama-3.1-8b-instant";

    const messages = [];
    if (system) messages.push({ role: "system", content: system });
    messages.push({ role: "user", content: prompt });

    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", "authorization": "Bearer " + apiKey },
      body: JSON.stringify({ model: m, messages, temperature: 0.7, max_tokens: 2048 })
    });

    const data = await r.json();

    if (!r.ok) {
      const msg = (data && data.error && data.error.message) || ("Groq API error " + r.status);
      res.status(r.status).json({ error: msg });
      return;
    }

    const text =
      (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";

    if (!text) {
      res.status(502).json({ error: "The AI returned an empty response — please try again." });
      return;
    }

    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message || "Unknown server error" });
  }
}
