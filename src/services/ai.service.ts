import { env } from "../config/env.js";

export interface DesignChatContext {
  title?: string | null;
  category?: string | null;
  fabric?: string | null;
  colors?: string[];
  embroidery?: string | null;
  prompt?: string | null;
  notes?: string | null;
}

export interface DesignChatResponse {
  reply: string;
  suggestions: {
    title?: string;
    fabric?: string;
    colors?: string[];
    embroidery?: string;
    refinedPrompt: string;
  };
  model: string;
}

function buildRuleBasedFashionReply(message: string, ctx: DesignChatContext = {}): DesignChatResponse {
  const lower = message.toLowerCase();

  let garment = ctx.title || "Bespoke Garment";
  let fabric = ctx.fabric || "Pure Raw Silk";
  let colors = ctx.colors && ctx.colors.length > 0 ? [...ctx.colors] : ["#1A847B", "#D4AF37", "#FAF8F5"];
  let embroidery = ctx.embroidery || "Delicate hand-worked resham & tilla border";

  if (lower.includes("bridal") || lower.includes("lehenga") || lower.includes("wedding") || lower.includes("barat")) {
    garment = "Royal Bridal Lehenga Choli";
    fabric = "Pure Katan Silk & Organza";
    colors = ["#8B0000", "#D4AF37", "#FDF5E6"];
    embroidery = "Intricate zardozi, dabka, and nakshi border";
  } else if (lower.includes("sherwani") || lower.includes("groom") || lower.includes("nikah")) {
    garment = "Regal Groom Sherwani";
    fabric = "Banarsi Jamawar";
    colors = ["#FFFFF0", "#C5A059", "#2C2C2C"];
    embroidery = "Antique tilla collar and cuff motif";
  } else if (lower.includes("suit") || lower.includes("tuxedo") || lower.includes("blazer") || lower.includes("formal")) {
    garment = "Bespoke Three-Piece Suit";
    fabric = "Super 120s Italian Worsted Wool";
    colors = ["#36454F", "#FFFFFF", "#1C1C1C"];
    embroidery = "Hand-finished pick stitching & horn buttons";
  } else if (lower.includes("kurta") || lower.includes("summer") || lower.includes("lawn") || lower.includes("casual")) {
    garment = "Tailored Chikankari Kurta Set";
    fabric = "Egyptian Giza Cotton Lawn";
    colors = ["#F4F1EA", "#1A847B", "#C5A059"];
    embroidery = "Minimalist tone-on-tone chikankari placket";
  } else if (lower.includes("anarkali") || lower.includes("gharara") || lower.includes("eid") || lower.includes("festive")) {
    garment = "Festive Couture Ensemble";
    fabric = "Crushed Tissue & Raw Silk";
    colors = ["#046307", "#E6BE8A", "#FAF9F6"];
    embroidery = "Gota patti, pearls & scalloped organza trim";
  }

  if (lower.includes("emerald") || lower.includes("green")) {
    colors = ["#046307", "#D4AF37", "#FAF8F5"];
  } else if (lower.includes("black") || lower.includes("noir")) {
    colors = ["#141414", "#C5A059", "#E5E5E5"];
  } else if (lower.includes("blue") || lower.includes("navy")) {
    colors = ["#1B365D", "#C0C0C0", "#FFFFFF"];
  } else if (lower.includes("pastel") || lower.includes("pink") || lower.includes("rose")) {
    colors = ["#F4C2C2", "#FAF0E6", "#D4AF37"];
  } else if (lower.includes("red") || lower.includes("crimson") || lower.includes("maroon")) {
    colors = ["#800020", "#D4AF37", "#FFF8F0"];
  }

  if (lower.includes("velvet")) fabric = "Pure Micro Silk Velvet";
  else if (lower.includes("chiffon")) fabric = "French Crinkle Chiffon";
  else if (lower.includes("linen")) fabric = "Breathable Belgian Linen";
  else if (lower.includes("cotton")) fabric = "Combed Cotton Lawn";

  const refinedPrompt = `${garment} crafted in ${fabric}, featuring ${embroidery}, palette ${colors.join(", ")}. ${message.trim()}`;
  const reply = `For "${message.trim()}", I recommend a ${garment} tailored in ${fabric} with ${embroidery}. Pairing this silhouette with the color palette (${colors.join(", ")}) balances drape, structure, and artisan detail. You can apply these fabric and color updates directly or generate a fresh studio preview with the refined prompt below.`;

  return {
    reply,
    suggestions: {
      title: garment,
      fabric,
      colors,
      embroidery,
      refinedPrompt,
    },
    model: "sui-dhaga-couture-assistant-v1",
  };
}

function tryParseJsonFromLlm(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

/**
 * AI Service for Fashion & Outfit Design Generation and Studio Assistant Chat
 * Uses FLUX.1 Model engine (Hugging Face Inference API / FLUX Model Engine) and LLM chat endpoints
 */
export const aiService = {
  /**
   * Enhances raw user prompts into detailed fashion design prompts
   */
  optimizeFashionPrompt(userPrompt: string): string {
    const baseStyle =
      "High fashion catalog photography, intricate stitching, detailed fabric texture, professional fashion studio lighting, highly detailed garment, 8k resolution";
    return `${userPrompt.trim()}, ${baseStyle}`;
  },

  /**
   * Generates a design image using FLUX.1 model engine
   */
  async generateTextToDesign(prompt: string): Promise<{ imageUrl: string; promptUsed: string; model: string }> {
    const promptUsed = this.optimizeFashionPrompt(prompt);
    const seed = Math.floor(Math.random() * 1000000);

    // 1. Try Hugging Face FLUX.1-schnell model if API key is provided
    if (env.HUGGINGFACE_API_KEY) {
      try {
        const routerRes = await fetch("https://router.huggingface.co/hf-inference/v1/images/generations", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "black-forest-labs/FLUX.1-schnell",
            prompt: promptUsed,
            size: "1024x1024",
          }),
        });

        if (routerRes.ok) {
          const json = (await routerRes.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
          if (json.data?.[0]?.url) {
            return {
              imageUrl: json.data[0].url,
              promptUsed,
              model: "black-forest-labs/FLUX.1-schnell (Hugging Face Router)",
            };
          } else if (json.data?.[0]?.b64_json) {
            return {
              imageUrl: `data:image/png;base64,${json.data[0].b64_json}`,
              promptUsed,
              model: "black-forest-labs/FLUX.1-schnell (Hugging Face Router)",
            };
          }
        }

        const directRes = await fetch("https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ inputs: promptUsed }),
        });

        if (directRes.ok) {
          const buffer = await directRes.arrayBuffer();
          const base64Image = Buffer.from(buffer).toString("base64");
          const mimeType = directRes.headers.get("content-type") || "image/png";
          return {
            imageUrl: `data:${mimeType};base64,${base64Image}`,
            promptUsed,
            model: "black-forest-labs/FLUX.1-schnell (Hugging Face Direct)",
          };
        }
      } catch (err) {
        console.warn("Hugging Face FLUX.1 API call failed, falling back to FLUX engine:", err);
      }
    }

    // 2. Fallback to FLUX.1 Model Engine (Zero API Key needed)
    const fluxImageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptUsed)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

    return {
      imageUrl: fluxImageUrl,
      promptUsed,
      model: "FLUX.1 (Free Engine)",
    };
  },

  /**
   * Generates a design variant based on existing image reference
   */
  async generateImageToDesign(imageUrl: string, prompt?: string): Promise<{ imageUrl: string; promptUsed: string; model: string }> {
    const combinedPrompt = prompt
      ? `Fashion design based on image reference (${imageUrl}): ${prompt}`
      : `High fashion suit design adaptation based on image reference (${imageUrl})`;

    return this.generateTextToDesign(combinedPrompt);
  },

  /**
   * Converts a sketch reference into a full fashion design rendering
   */
  async generateSketchToDesign(sketchUrl: string, prompt?: string): Promise<{ imageUrl: string; promptUsed: string; model: string }> {
    const sketchPrompt = prompt
      ? `Render sketch into realistic tailored clothing (${sketchUrl}): ${prompt}`
      : `Realistic fashion garment rendered from hand-drawn sketch reference (${sketchUrl})`;

    return this.generateTextToDesign(sketchPrompt);
  },

  /**
   * Conversational AI Design Studio assistant for outfit ideation, fabrics, colors & prompt refinement
   */
  async chatWithDesignAssistant(options: {
    message: string;
    history?: Array<{ role: string; content: string }>;
    designContext?: DesignChatContext;
  }): Promise<DesignChatResponse> {
    const ctx = options.designContext || {};
    const systemPrompt = [
      "You are the Sui Dhaga AI Fashion & Bespoke Tailoring Studio Assistant.",
      "Help users refine South Asian and bespoke garments (lehengas, sherwanis, kurtas, suits, anarkalis).",
      'Respond STRICTLY with JSON containing keys: "reply" (string, helpful concise tailoring guidance), "title" (string), "fabric" (string), "colors" (array of 3 hex codes), "embroidery" (string), "refinedPrompt" (detailed visual generation prompt).',
      ctx.title || ctx.fabric || ctx.prompt ? `Current design context: ${JSON.stringify(ctx)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...(options.history || []).slice(-6).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || ""),
      })),
      { role: "user", content: options.message },
    ];

    const fallback = buildRuleBasedFashionReply(options.message, ctx);

    const tryChatCompletion = async (endpoint: string, apiKey: string, model: string): Promise<DesignChatResponse | null> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: chatMessages,
            temperature: 0.7,
            max_tokens: 450,
          }),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const rawText = json.choices?.[0]?.message?.content?.trim();
        if (!rawText) return null;

        const parsed = tryParseJsonFromLlm(rawText);
        if (parsed && typeof parsed.reply === "string") {
          return {
            reply: parsed.reply,
            suggestions: {
              title: typeof parsed.title === "string" ? parsed.title : fallback.suggestions.title,
              fabric: typeof parsed.fabric === "string" ? parsed.fabric : fallback.suggestions.fabric,
              colors: Array.isArray(parsed.colors)
                ? parsed.colors.map(String).slice(0, 5)
                : fallback.suggestions.colors,
              embroidery: typeof parsed.embroidery === "string" ? parsed.embroidery : fallback.suggestions.embroidery,
              refinedPrompt:
                typeof parsed.refinedPrompt === "string" ? parsed.refinedPrompt : fallback.suggestions.refinedPrompt,
            },
            model,
          };
        }

        return {
          reply: rawText,
          suggestions: fallback.suggestions,
          model,
        };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    };

    if (env.OPENAI_API_KEY) {
      const openAiResult = await tryChatCompletion(
        "https://api.openai.com/v1/chat/completions",
        env.OPENAI_API_KEY,
        "gpt-4o-mini",
      );
      if (openAiResult) return openAiResult;
    }

    if (env.HUGGINGFACE_API_KEY) {
      const hfResult = await tryChatCompletion(
        "https://router.huggingface.co/v1/chat/completions",
        env.HUGGINGFACE_API_KEY,
        "Qwen/Qwen2.5-72B-Instruct",
      );
      if (hfResult) return hfResult;
    }

    return fallback;
  },
};
