module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "OVANICE AI is not connected yet. Add a Gemini API key from a Google AI Studio project with no billing account attached. Paid fallback is disabled." });
  }
  const body = req.body || {};
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  const attachments = Array.isArray(body.attachments) ? body.attachments : [];
  if (!prompt) return res.status(400).json({ error: "Enter a prompt first." });
  if (prompt.length > 12000) return res.status(413).json({ error: "Prompt is too long." });
  if (attachments.length > 4) return res.status(400).json({ error: "Attach no more than four files at once." });
  const parts = [{ text: prompt }];
  let totalBytes = 0;
  for (const file of attachments) {
    if (!file || typeof file.name !== "string") return res.status(400).json({ error: "Invalid attachment." });
    if (typeof file.text === "string") {
      if (file.text.length > 30000) return res.status(413).json({ error: "A text attachment is too large." });
      parts.push({ text: "\n\nAttached text file (" + file.name.slice(0, 120) + "):\n" + file.text });
      continue;
    }
    const mimeType = String(file.mimeType || "");
    const data = String(file.data || "");
    if (!["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"].includes(mimeType)) {
      return res.status(415).json({ error: "Unsupported file type. Use JPEG, PNG, WebP, GIF, PDF or text." });
    }
    totalBytes += Math.floor(data.length * 0.75);
    if (!data || totalBytes > 2800000) return res.status(413).json({ error: "Attachments exceed the 2.8 MB limit." });
    parts.push({ inline_data: { mime_type: mimeType, data } });
  }
  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: "You are OVANICE, a helpful, accurate and creative AI assistant. Be clear about uncertainty. When users attach files, analyze only the supplied content. Never claim to have generated images or videos." }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.65, maxOutputTokens: 2048 }
      })
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      if (upstream.status === 429) return res.status(429).json({ error: "The free Gemini quota or rate limit has been reached. No paid fallback is enabled; try again after the quota resets." });
      if (upstream.status === 403 || upstream.status === 400) return res.status(502).json({ error: "Gemini rejected this request. Check that the key belongs to a Free Tier project with no billing account attached and that the model is available." });
      return res.status(502).json({ error: "The free AI provider is temporarily unavailable. No paid provider will be tried." });
    }
    const text = (result.candidates?.[0]?.content?.parts || []).map(part => part.text || "").join("\n").trim();
    if (!text) return res.status(502).json({ error: "The model returned no text. Try a shorter prompt." });
    return res.status(200).json({ text });
  } catch (error) {
    return res.status(502).json({ error: "Could not reach the free AI provider. No paid fallback is enabled." });
  }
};
