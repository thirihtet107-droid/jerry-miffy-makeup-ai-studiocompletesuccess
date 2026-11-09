
import { getMakeupLook } from "../public/makeup-looks.mjs";

const API = "https://generativelanguage.googleapis.com/v1beta/models/";
const CONSULT_MODEL = "gemini-3.1-flash-lite";
const PREVIEW_MODEL = "gemini-3.1-flash-image";

async function readResponse(response) {
  const raw = await response.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {
      error: {
        message: raw || `Empty response (${response.status})`
      }
    };
  }
}

function errorResponse(message, status = 500) {
  return Response.json({ error: message }, { status });
}

async function getRequestData(request) {
  try {
    return await request.json();
  } catch {
    throw new Error("Request data ကို ဖတ်မရပါ။ ထပ်စမ်းကြည့်ပါ။");
  }
}

async function consult(request, env) {
  const key = env.GEMINI_API_KEY;

  if (!key) {
    return errorResponse(
      "Cloudflare Worker မှာ GEMINI_API_KEY Secret မထည့်ရသေးပါ။",
      500
    );
  }

  try {
    const {
      image,
      mimeType = "image/jpeg",
      language = "Burmese",
      occasion = "General",
      notes = ""
    } = await getRequestData(request);

    if (!image || typeof image !== "string") {
      return errorResponse("Photo data မရှိပါ။", 400);
    }

    if (image.length > 5_000_000) {
      return errorResponse(
        "Photo data အရွယ်အစားကြီးလွန်းပါတယ်။ ပိုသေးတဲ့ပုံကို ရွေးပေးပါ။",
        413
      );
    }

    const prompt = `
You are a careful professional makeup artist assistant supporting a human makeup artist.

Analyze only visible cosmetic features.
Do not infer personality, ethnicity, health, age, or attractiveness.

Lighting and camera can distort skin tone.
Label undertone and shade as tentative and request in-person swatch confirmation.

Do not criticize the client.
Preserve their natural identity and features in all recommendations.

Reply in ${language}.
Occasion: ${occasion}
Artist notes: ${notes || "None"}

Give a structured, practical consultation with:

1. Photo quality and visible limitations.
2. Tentative face shape and visible eye, lip, nose and cheek features.
3. Skin tone and undertone caveat.
4. Specific eye makeup placement.
5. Contour, blush and highlight placement.
6. Base and foundation selection guidance.
7. Lip and brow suggestions.
8. Complete recommended look.
9. Product types and application sequence.
10. Alternative makeup direction.

Prioritize Douyin, Vietnamese and Korean styles.
Explain which style could suit the requested occasion and why.

Be concise but useful for a professional makeup artist.
`;

    const response = await fetch(
      `${API}${CONSULT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: image
                }
              }
            ]
          }],
          generationConfig: {
            maxOutputTokens: 1800
          }
        }),
        signal: AbortSignal.timeout(24000)
      }
    );

    const result = await readResponse(response);

    if (!response.ok) {
      const detail =
        result.error?.message ||
        `Gemini API error ${response.status}`;

      return Response.json({
        error: `Gemini Analyze မအောင်မြင်ပါ။ ${detail}`,
        detail
      }, { status: response.status });
    }

    const parts =
      result.candidates?.[0]?.content?.parts || [];

    const answer = parts
      .filter(part => typeof part.text === "string")
      .map(part => part.text)
      .join("\n");

    if (!answer) {
      const reason = result.promptFeedback?.blockReason;

      return errorResponse(
        reason
          ? `Gemini safety filter ကြောင့် မဖြေနိုင်ပါ (${reason})။`
          : "Gemini က စာသားမပြန်ပေးပါ။ ပုံကို ပြန်ရွေးပြီး ထပ်စမ်းပါ။",
        502
      );
    }

    return Response.json({
      text: answer,
      model: CONSULT_MODEL
    });

  } catch (error) {
    const message =
      error?.name === "TimeoutError"
        ? "Gemini Analyze က 24 စက္ကန့်အတွင်း မတုံ့ပြန်နိုင်ပါ။ ထပ်စမ်းပါ။"
        : error?.message || "Server error";

    return errorResponse(message, 502);
  }
}

async function preview(request, env) {
  const key = env.GEMINI_API_KEY;

  if (!key) {
    return errorResponse(
      "Cloudflare Worker မှာ GEMINI_API_KEY Secret မထည့်ရသေးပါ။",
      500
    );
  }

  try {
    const {
      image,
      mimeType = "image/jpeg",
      style = "douyin"
    } = await getRequestData(request);

    if (!image || typeof image !== "string") {
      return errorResponse("Photo မရှိပါ။", 400);
    }

    if (image.length > 5_000_000) {
      return errorResponse(
        "Photo data အရွယ်အစားကြီးလွန်းပါတယ်။ ပိုသေးတဲ့ပုံကို ရွေးပေးပါ။",
        413
      );
    }

    const selectedLook =
      getMakeupLook(style) || getMakeupLook("douyin");

    const prompt = `
Edit the provided client's photo to apply only this makeup style:

${selectedLook.name}
${selectedLook.prompt}

CRITICAL IDENTITY PRESERVATION:

Keep the same person.
Preserve their identity, face shape, facial proportions, eye size and shape, nose, lips, jaw, skin tone, expression, pose, hairstyle, clothing and background unchanged.

Do not beautify, reshape, slim, enlarge or alter facial anatomy.

Only add realistic cosmetic makeup:
- Foundation finish
- Eyeshadow
- Eyeliner
- Blush
- Makeup contour
- Highlight
- Lipstick

Keep the result photorealistic and suitable for professional client consultation.
`;

    const response = await fetch(
      `${API}${PREVIEW_MODEL}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key
        },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: image
                }
              }
            ]
          }],
          generationConfig: {
            responseModalities: ["IMAGE"]
          }
        }),
        signal: AbortSignal.timeout(52000)
      }
    );

    const result = await readResponse(response);

    if (!response.ok) {
      const detail =
        result.error?.message ||
        `Gemini image API error ${response.status}`;

      return Response.json({
        error: `Gemini Preview API error (${response.status}): ${detail}`,
        detail
      }, { status: response.status });
    }

    const parts =
      result.candidates?.[0]?.content?.parts || [];

    for (const part of parts) {
      const data = part.inlineData || part.inline_data;

      if (data?.data) {
        return Response.json({
          image: data.data,
          mimeType:
            data.mimeType ||
            data.mime_type ||
            "image/png"
        });
      }
    }

    const finishReason =
      result.candidates?.[0]?.finishReason;

    const blockReason =
      result.promptFeedback?.blockReason;

    const detail = blockReason
      ? `Gemini safety filter: ${blockReason}`
      : finishReason
        ? `Gemini image response has no image (${finishReason})`
        : "Gemini က image data မပြန်ပေးခဲ့ပါ။";

    return errorResponse(
      `Preview ပုံမရရှိပါ။ ${detail}`,
      502
    );

  } catch (error) {
    const message =
      error?.name === "TimeoutError"
        ? "Gemini Preview က 52 စက္ကန့်အတွင်း မတုံ့ပြန်ပါ။ ခဏစောင့်ပြီး ထပ်စမ်းပါ။"
        : error?.message || "Preview server error";

    return errorResponse(message, 502);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (
      request.method === "POST" &&
      url.pathname === "/api/consult"
    ) {
      return consult(request, env);
    }

    if (
      request.method === "POST" &&
      url.pathname === "/api/preview"
    ) {
      return preview(request, env);
    }

    if (url.pathname.startsWith("/api/")) {
      return errorResponse(
        `API route not found: ${url.pathname}`,
        404
      );
    }

    return env.ASSETS.fetch(request);
  }
};
                
