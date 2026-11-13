# OVANICE

OVANICE is a free-first creative workspace.

## Current features
- Responsive web app and installable web-app shell.
- Browser-local poster editor with PNG export.
- Local file selection and previews.
- Video brief creation and local saving.
- Optional Gemini 2.5 Flash-Lite chat and multimodal attachment endpoint, enabled only when a free-tier API key is added.

## Zero-charge safeguards
- The only model hard-coded in the server endpoint is `gemini-2.5-flash-lite`.
- No paid fallback, automatic model switching, image-generation endpoint or video-generation endpoint exists.
- If `GEMINI_API_KEY` is absent, the endpoint returns HTTP 503 and sends no provider request.
- If free quota is exhausted, the endpoint stops with a quota message. It does not retry against a paid model.
- For strict zero-cost operation, use a Google AI Studio API key from a project with **no billing account attached**. Never click "Set up billing" or add a payment method to that project.
- Free-tier prompts and files may be used by Google to improve its products. Do not submit sensitive or confidential files unless you accept Google's terms.

## Enable free AI chat
1. Create a Free Tier Gemini API key in Google AI Studio.
2. Confirm the linked Google Cloud project has no active billing account.
3. Add the key to the Vercel project as an encrypted environment variable named `GEMINI_API_KEY`.
4. Redeploy the project.

Official references:
- Gemini pricing: https://ai.google.dev/gemini-api/docs/pricing
- Gemini 2.5 Flash-Lite capabilities: https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash-lite
- API key management: https://ai.google.dev/gemini-api/docs/api-key

## Current limitations
- The Design Studio creates local poster layouts; it is not generative image synthesis.
- Video Studio creates and saves briefs only. AI video generation is not available in the no-charge build.
- Supported chat attachments: JPEG, PNG, WebP, GIF, PDF, TXT, Markdown, CSV and JSON. Attachments are sent to Google only after the free Gemini connection is enabled and the user sends a chat request.
