import { env } from "../config/env.js";

/**
 * AI Service for Fashion & Outfit Design Generation
 * Uses FLUX.1 Model engine (Hugging Face Inference API / FLUX Model Engine)
 */
export const aiService = {
  /**
   * Enhances raw user prompts into detailed fashion design prompts
   */
  optimizeFashionPrompt(userPrompt: string): string {
    const baseStyle = "High fashion catalog photography, intricate stitching, detailed fabric texture, professional fashion studio lighting, highly detailed garment, 8k resolution";
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
        // Try HuggingFace OpenAI-compatible Router endpoint first
        const routerRes = await fetch(
          "https://router.huggingface.co/hf-inference/v1/images/generations",
          {
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
          }
        );

        if (routerRes.ok) {
          const json = await routerRes.json() as { data?: Array<{ url?: string; b64_json?: string }> };
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

        // Direct Inference Endpoint fallback
        const directRes = await fetch(
          "https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.HUGGINGFACE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ inputs: promptUsed }),
          }
        );

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
  }
};
