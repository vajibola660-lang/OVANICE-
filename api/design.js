module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: "AI design is not connected yet. Add a Gemini API key from a Google AI Studio Free Tier project with no billing account attached. Paid fallback is disabled." });
  }
  const prompt = typeof req.body?.prompt === "string" ? req.body.prompt.trim() : "";
  if (!prompt) return res.status(400).json({ error: "Describe the design first." });
  if (prompt.length > 2500) return res.status(413).json({ error: "Design prompt is too long." });
  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: "Create a polished, original vector graphic for the user's design brief. Return ONLY one complete SVG document, no Markdown fences or commentary. Use a 900 by 900 viewBox. Make the composition visually rich, balanced, and suitable for a professional design. Use only SVG elements: svg, defs, linearGradient, radialGradient, stop, g, path, rect, circle, ellipse, line, polyline, polygon, text, and tspan. Use only inline vector shapes and text. Do not include script, style, foreignObject, image, use, links, external resources, event handlers, data URLs, or JavaScript. Use accessible contrast and tasteful typography. Keep all elements inside the viewBox."
          }]
        },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 3500 }
      })
    });
    const result = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      if (upstream.status === 429) return res.status(429).json({ error: "The free Gemini quota has been reached. No paid fallback is enabled." });
      if (upstream.status === 400 || upstream.status === 403) return res.status(502).json({ error: "Gemini rejected the request. Check the Free Tier key and model availability. Do not attach billing." });
      return res.status(502).json({ error: "The free design model is temporarily unavailable. No paid model will be tried." });
    }
    let svg = (result.candidates?.[0]?.content?.parts || []).map(p => p.text || "").join("\n").trim();
    svg = svg.replace(/^\uFEFF/, "").replace(/^\x60\x60\x60(?:svg)?\s*/i, "").replace(/\s*\x60\x60\x60$/i, "");
    const start = svg.toLowerCase().indexOf("<svg");
    const end = svg.toLowerCase().lastIndexOf("</svg>");
    if (start >= 0 && end > start) svg = svg.slice(start, end + 6);
    if (!/^<svg[\s>]/i.test(svg) || !/<\/svg>\s*$/i.test(svg) || svg.length > 100000) {
      return res.status(502).json({ error: "The model did not return a valid SVG. Try a simpler design brief." });
    }
    if (/<\s*(script|foreignObject|iframe|image|use|style)\b|\bon[a-z]+\s*=|javascript:|https?:\/\//i.test(svg)) {
      return res.status(502).json({ error: "The generated SVG contained unsupported content. Try another prompt." });
    }
    return res.status(200).json({ svg });
  } catch (error) {
    return res.status(502).json({ error: "Could not reach the free design model. No paid fallback is enabled." });
  }
};
