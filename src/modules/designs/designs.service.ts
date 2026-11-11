import { getDbClient } from "../../utils/resource-helper.js";
import { aiService } from "../../services/ai.service.js";
import { storageService } from "../../services/storage.service.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingColumnError, isMissingTableError } from "../../utils/supabase-error.js";
import { buildTechPackPdfBuffer } from "../../utils/pdf-generator.js";

const CURATED_DESIGN_TEMPLATES = [
  {
    id: "tpl-bridal-lehenga",
    slug: "royal-crimson-bridal-lehenga",
    title: "Royal Crimson Bridal Lehenga",
    description: "Traditional hand-embellished bridal lehenga choli with intricate zardozi and dabka borders.",
    category: "Bridal",
    occasion: "Wedding",
    style: "Traditional Heritage",
    type: "text-to-design",
    prompt: "Royal crimson velvet bridal lehenga choli with antique gold zardozi, dabka embroidery, scalloped organza dupatta",
    image_url: "https://image.pollinations.ai/prompt/Royal%20crimson%20velvet%20bridal%20lehenga%20choli%20with%20gold%20zardozi%20editorial%20fashion?width=800&height=1000&model=flux&nologo=true",
    colors: ["#8B0000", "#D4AF37", "#FDF5E6"],
    fabric: "Pure Silk Velvet & Organza",
    embroidery: "Zardozi, Dabka & Resham",
    tags: ["bridal", "lehenga", "zardozi", "wedding"],
    popularity: 100,
  },
  {
    id: "tpl-groom-sherwani",
    slug: "ivory-jamawar-groom-sherwani",
    title: "Ivory Jamawar Groom Sherwani",
    description: "Structured ivory self-jamawar sherwani paired with antique brass buttons and subtle collar embroidery.",
    category: "Menswear",
    occasion: "Nikah / Barat",
    style: "Classic Regal",
    type: "text-to-design",
    prompt: "Ivory Banarsi jamawar groom sherwani with mandarin collar, minimal gold tilla motif on cuff and collar",
    image_url: "https://image.pollinations.ai/prompt/Ivory%20Banarsi%20jamawar%20groom%20sherwani%20studio%20fashion%20photography?width=800&height=1000&model=flux&nologo=true",
    colors: ["#FFFFF0", "#C5A059", "#2C2C2C"],
    fabric: "Banarsi Jamawar",
    embroidery: "Minimal Tilla & Dabka Collar",
    tags: ["sherwani", "groom", "menswear", "nikah"],
    popularity: 95,
  },
  {
    id: "tpl-emerald-anarkali",
    slug: "emerald-anarkali-festive-gown",
    title: "Emerald Silk Anarkali Gown",
    description: "Floor-length flared Anarkali silhouette in emerald raw silk with gota patti and mirror accents.",
    category: "Festive",
    occasion: "Mehndi / Eid",
    style: "Regal Flare",
    type: "text-to-design",
    prompt: "Emerald green raw silk floor-length Anarkali dress with delicate gold gota patti hemline and sheer organza dupatta",
    image_url: "https://image.pollinations.ai/prompt/Emerald%20green%20raw%20silk%20Anarkali%20dress%20gold%20gota%20patti%20couture?width=800&height=1000&model=flux&nologo=true",
    colors: ["#046307", "#E6BE8A", "#F4F1EA"],
    fabric: "Pure Raw Silk",
    embroidery: "Gota Patti & Sequins",
    tags: ["anarkali", "festive", "eid", "raw-silk"],
    popularity: 90,
  },
  {
    id: "tpl-bespoke-suit",
    slug: "charcoal-bespoke-three-piece-suit",
    title: "Charcoal Bespoke Three-Piece Suit",
    description: "Sharp Savile-inspired three-piece tailored wool suit with peak lapels and horn buttons.",
    category: "Formal",
    occasion: "Business / Reception",
    style: "Modern Tailored",
    type: "text-to-design",
    prompt: "Charcoal grey bespoke three-piece wool suit with sharp peak lapels, waistcoat, crisp white shirt",
    image_url: "https://image.pollinations.ai/prompt/Charcoal%20grey%20bespoke%20three%20piece%20wool%20suit%20editorial%20studio?width=800&height=1000&model=flux&nologo=true",
    colors: ["#36454F", "#FFFFFF", "#1C1C1C"],
    fabric: "Super 120s Italian Wool",
    embroidery: "Hand-stitched Pick Stitching",
    tags: ["suit", "formal", "menswear", "bespoke"],
    popularity: 88,
  },
  {
    id: "tpl-rose-kurta",
    slug: "pastel-rose-chikankari-kurta",
    title: "Pastel Rose Chikankari Kurta Set",
    description: "Breathable summer cotton lawn kurta featuring delicate tone-on-tone chikankari and pearl buttons.",
    category: "Casual",
    occasion: "Daywear / Eid",
    style: "Minimalist Craft",
    type: "text-to-design",
    prompt: "Blush pastel rose pure cotton lawn tailored kurta shalwar with delicate white chikankari embroidery",
    image_url: "https://image.pollinations.ai/prompt/Pastel%20rose%20cotton%20lawn%20chikankari%20kurta%20fashion%20photography?width=800&height=1000&model=flux&nologo=true",
    colors: ["#F4C2C2", "#FFF8F0", "#E8D5C4"],
    fabric: "Swiss Voile Cotton Lawn",
    embroidery: "Tone-on-Tone Chikankari",
    tags: ["kurta", "casual", "lawn", "chikankari"],
    popularity: 85,
  },
  {
    id: "tpl-champagne-gharara",
    slug: "champagne-gharara-walima-ensemble",
    title: "Champagne Tissue Gharara Set",
    description: "Luminous champagne gold tissue short kurti paired with wide-flared pleated gharara.",
    category: "Bridal",
    occasion: "Walima / Engagement",
    style: "Contemporary Couture",
    type: "text-to-design",
    prompt: "Champagne gold crushed tissue short kurti with pearl and crystal handwork paired with flared pleated gharara",
    image_url: "https://image.pollinations.ai/prompt/Champagne%20gold%20tissue%20gharara%20Pakistani%20bridal%20couture?width=800&height=1000&model=flux&nologo=true",
    colors: ["#F7E7CE", "#D4AF37", "#FAF9F6"],
    fabric: "Crushed Tissue & Katan Silk",
    embroidery: "Pearls, Cutdana & Mukesh",
    tags: ["gharara", "walima", "tissue", "bridal"],
    popularity: 82,
  },
];

const CORE_DESIGN_COLUMNS = new Set([
  "title",
  "description",
  "type",
  "prompt",
  "enhanced_prompt",
  "image_url",
  "original_image_url",
  "sketch_url",
  "colors",
  "fabric",
  "embroidery",
  "measurements",
  "notes",
  "model_used",
  "status",
  "shared_with_tailor_id",
  "duplicated_from_id",
  "pdf_url",
]);

const EXTENDED_DESIGN_COLUMNS = new Set([
  ...CORE_DESIGN_COLUMNS,
  "is_favorite",
  "is_trashed",
  "trashed_at",
  "category",
  "style",
  "occasion",
  "tags",
  "chat_history",
  "metadata",
]);

function formatDesignRecord(d: any) {
  if (!d) return d;
  const colors = Array.isArray(d.colors) ? d.colors : [];
  return {
    ...d,
    imageUrl: d.image_url ?? null,
    originalImageUrl: d.original_image_url ?? null,
    sketchUrl: d.sketch_url ?? null,
    enhancedPrompt: d.enhanced_prompt ?? null,
    colorPalette: colors,
    isFavorite: Boolean(d.is_favorite ?? d.metadata?.isFavorite ?? false),
    isTrashed: Boolean(d.is_trashed ?? d.metadata?.isTrashed ?? false),
    trashedAt: d.trashed_at ?? null,
    chatHistory: Array.isArray(d.chat_history) ? d.chat_history : [],
    sharedWithTailorId: d.shared_with_tailor_id ?? null,
    pdfUrl: d.pdf_url ?? null,
    createdAt: d.created_at,
    updatedAt: d.updated_at,
  };
}

function normalizeDesignPayload(data: Record<string, unknown>, isCreate = false): {
  extended: Record<string, unknown>;
  coreOnly: Record<string, unknown>;
} {
  const metadata: Record<string, unknown> =
    typeof data.metadata === "object" && data.metadata !== null ? { ...(data.metadata as Record<string, unknown>) } : {};

  const extended: Record<string, unknown> = {};

  if (data.title !== undefined) extended.title = data.title;
  if (data.description !== undefined) extended.description = data.description;
  if (data.type !== undefined) extended.type = data.type;
  else if (isCreate) extended.type = "manual";

  if (data.prompt !== undefined) extended.prompt = data.prompt;
  if (data.enhancedPrompt !== undefined || data.enhanced_prompt !== undefined) {
    extended.enhanced_prompt = data.enhancedPrompt ?? data.enhanced_prompt;
  }

  const imageUrl = data.imageUrl ?? data.image_url ?? data.image;
  if (imageUrl !== undefined) extended.image_url = imageUrl;

  if (data.originalImageUrl !== undefined || data.original_image_url !== undefined) {
    extended.original_image_url = data.originalImageUrl ?? data.original_image_url;
  }
  if (data.sketchUrl !== undefined || data.sketch_url !== undefined) {
    extended.sketch_url = data.sketchUrl ?? data.sketch_url;
  }

  const rawColors = data.colors ?? data.colorPalette ?? data.color_palette;
  if (Array.isArray(rawColors)) {
    extended.colors = rawColors.map(String);
  }

  if (data.fabric !== undefined) {
    if (typeof data.fabric === "object" && data.fabric !== null) {
      const fabObj = data.fabric as Record<string, unknown>;
      extended.fabric = String(fabObj.name || fabObj.material || fabObj.type || "Custom Fabric");
      metadata.fabricDetails = fabObj;
    } else {
      extended.fabric = data.fabric;
    }
  }

  if (data.embroidery !== undefined) {
    if (typeof data.embroidery === "object" && data.embroidery !== null) {
      const embObj = data.embroidery as Record<string, unknown>;
      extended.embroidery = String(embObj.style || embObj.name || embObj.description || JSON.stringify(embObj));
      metadata.embroideryDetails = embObj;
    } else {
      extended.embroidery = data.embroidery;
    }
  }

  if (data.measurements !== undefined && typeof data.measurements === "object" && data.measurements !== null) {
    extended.measurements = data.measurements;
  }

  if (data.notes !== undefined) {
    if (typeof data.notes === "object" && data.notes !== null) {
      extended.notes = String((data.notes as any).notes || (data.notes as any).text || JSON.stringify(data.notes));
    } else {
      extended.notes = data.notes;
    }
  }

  if (data.modelUsed !== undefined || data.model_used !== undefined) {
    extended.model_used = data.modelUsed ?? data.model_used;
  }
  if (data.status !== undefined) extended.status = data.status;
  else if (isCreate) extended.status = "completed";

  if (data.sharedWithTailorId !== undefined || data.shared_with_tailor_id !== undefined) {
    extended.shared_with_tailor_id = data.sharedWithTailorId ?? data.shared_with_tailor_id;
  }
  if (data.duplicatedFromId !== undefined || data.duplicated_from_id !== undefined) {
    extended.duplicated_from_id = data.duplicatedFromId ?? data.duplicated_from_id;
  }
  if (data.pdfUrl !== undefined || data.pdf_url !== undefined) {
    extended.pdf_url = data.pdfUrl ?? data.pdf_url;
  }

  // Extended studio columns (added in migration 014)
  const fav = data.isFavorite ?? data.is_favorite ?? data.favorite;
  if (fav !== undefined) {
    extended.is_favorite = Boolean(fav);
    metadata.isFavorite = Boolean(fav);
  }

  const trashed = data.isTrashed ?? data.is_trashed ?? data.trashed;
  if (trashed !== undefined) {
    extended.is_trashed = Boolean(trashed);
    extended.trashed_at = trashed ? new Date().toISOString() : null;
    metadata.isTrashed = Boolean(trashed);
  }

  if (data.category !== undefined) extended.category = data.category;
  if (data.style !== undefined) extended.style = data.style;
  if (data.occasion !== undefined) extended.occasion = data.occasion;

  if (data.tags !== undefined) {
    extended.tags = Array.isArray(data.tags)
      ? data.tags.map(String)
      : typeof data.tags === "string"
        ? data.tags.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
  }

  if (Array.isArray(data.chatHistory ?? data.chat_history)) {
    extended.chat_history = data.chatHistory ?? data.chat_history;
  }

  if (Object.keys(metadata).length > 0) {
    extended.metadata = metadata;
  }

  const coreOnly: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(extended)) {
    if (CORE_DESIGN_COLUMNS.has(k)) {
      coreOnly[k] = v;
    }
  }

  return { extended, coreOnly };
}

async function persistGeneratedImage(userId: string | undefined, imageUrl: string): Promise<string> {
  if (!imageUrl.startsWith("data:image/")) return imageUrl;
  try {
    const match = imageUrl.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
    if (!match) return imageUrl;
    const mimeType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const ext = mimeType.split("/")[1]?.replace(/[^a-zA-Z0-9]/g, "") || "png";
    const path = `${userId || "studio"}/ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const uploaded = await storageService.uploadFile("designs", path, buffer, mimeType);
    return uploaded.url;
  } catch {
    return imageUrl;
  }
}

export interface GetDesignsFilters {
  type?: string;
  category?: string;
  search?: string;
  isFavorite?: boolean;
  isTrashed?: boolean;
  status?: string;
}

export const designsService = {
  async getDesigns(
    userId: string | undefined,
    userRole: string | undefined,
    page = 1,
    limit = 20,
    filters: GetDesignsFilters = {},
  ) {
    const client = getDbClient();
    const p = Math.max(1, page);
    const l = Math.min(100, Math.max(1, limit));

    const buildQuery = (withExtendedFilters: boolean) => {
      let query = client.from("designs").select("*", { count: "exact" });
      if (userId && userRole !== "admin") {
        query = query.eq("user_id", userId);
      }
      if (filters.type) query = query.eq("type", filters.type);
      if (filters.status) query = query.eq("status", filters.status);
      if (filters.search && filters.search.trim()) {
        const q = filters.search.trim().replace(/[,()]/g, "");
        if (q) {
          query = query.or(`title.ilike.%${q}%,prompt.ilike.%${q}%,fabric.ilike.%${q}%,notes.ilike.%${q}%`);
        }
      }
      if (withExtendedFilters) {
        if (filters.category) query = query.ilike("category", `%${filters.category}%`);
        if (filters.isFavorite !== undefined) query = query.eq("is_favorite", filters.isFavorite);
        if (filters.isTrashed !== undefined) query = query.eq("is_trashed", filters.isTrashed);
      }
      return query.order("created_at", { ascending: false }).range((p - 1) * l, p * l - 1);
    };

    let { data, error, count } = await buildQuery(true);
    if (error && isMissingColumnError(error)) {
      const retry = await buildQuery(false);
      data = retry.data;
      error = retry.error;
      count = retry.count;
    }

    if (error) throw new AppError(error.message, 400);

    return {
      records: (data ?? []).map(formatDesignRecord),
      page: p,
      limit: l,
      total: count ?? 0,
    };
  },

  async getDesignById(designId: string, userId: string | undefined, userRole: string | undefined) {
    const client = getDbClient();
    const { data, error } = await client
      .from("designs")
      .select("*, shared_tailor:tailors!shared_with_tailor_id(id, shop_name, rating, city, address, banner_url)")
      .eq("id", designId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    if (!data) throw new AppError("Design not found", 404);

    if (userId && userRole !== "admin" && data.user_id !== userId) {
      let isSharedTailor = false;
      if (data.shared_with_tailor_id) {
        const { data: tailor } = await client
          .from("tailors")
          .select("id")
          .eq("id", data.shared_with_tailor_id)
          .eq("user_id", userId)
          .maybeSingle();
        isSharedTailor = Boolean(tailor?.id);
      }
      if (!isSharedTailor) {
        throw new AppError("You do not have permission to access this design", 403);
      }
    }

    return formatDesignRecord(data);
  },

  async getTemplates(category?: string, search?: string) {
    const client = getDbClient();
    let query = client
      .from("design_templates")
      .select("*")
      .eq("is_active", true)
      .order("popularity", { ascending: false });

    if (category && category.toLowerCase() !== "all") {
      query = query.ilike("category", `%${category}%`);
    }
    if (search && search.trim()) {
      const q = search.trim().replace(/[,()]/g, "");
      if (q) {
        query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%,fabric.ilike.%${q}%`);
      }
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((t: any) => ({
        ...t,
        imageUrl: t.image_url,
        colorPalette: t.colors || [],
      }));
    }

    if (error && !isMissingTableError(error)) {
      console.warn("Templates query notice:", error.message);
    }

    // Fallback to curated studio templates
    let fallback = CURATED_DESIGN_TEMPLATES;
    if (category && category.toLowerCase() !== "all") {
      const catLower = category.toLowerCase();
      fallback = fallback.filter((t) => t.category.toLowerCase().includes(catLower));
    }
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      fallback = fallback.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.fabric.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      );
    }

    return fallback.map((t) => ({
      ...t,
      imageUrl: t.image_url,
      colorPalette: t.colors,
    }));
  },

  async createDesign(userId: string | undefined, _userRole: string | undefined, data: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const client = getDbClient();
    const { extended, coreOnly } = normalizeDesignPayload(data, true);

    let { data: created, error } = await client
      .from("designs")
      .insert({ ...extended, user_id: userId })
      .select()
      .single();

    if (error && isMissingColumnError(error)) {
      const retry = await client
        .from("designs")
        .insert({ ...coreOnly, user_id: userId })
        .select()
        .single();
      created = retry.data;
      error = retry.error;
    }

    if (error) throw new AppError(error.message, 400);
    return formatDesignRecord(created);
  },

  async updateDesign(designId: string, userId: string | undefined, userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const { extended, coreOnly } = normalizeDesignPayload(data, false);

    if (Object.keys(extended).length === 0) {
      return this.getDesignById(designId, userId, userRole);
    }

    const executeUpdate = async (payload: Record<string, unknown>) => {
      let query = client.from("designs").update(payload).eq("id", designId);
      if (userId && userRole !== "admin") {
        query = query.eq("user_id", userId);
      }
      return query.select().maybeSingle();
    };

    let { data: updated, error } = await executeUpdate(extended);
    if (error && isMissingColumnError(error)) {
      if (Object.keys(coreOnly).length === 0) {
        return this.getDesignById(designId, userId, userRole);
      }
      const retry = await executeUpdate(coreOnly);
      updated = retry.data;
      error = retry.error;
    }

    if (error) throw new AppError(error.message, 400);
    if (!updated) throw new AppError("Design not found or permission denied", 404);
    return formatDesignRecord(updated);
  },

  async deleteDesign(designId: string, userId: string | undefined, userRole: string | undefined) {
    const client = getDbClient();
    const existing = await this.getDesignById(designId, userId, userRole);
    if (!existing) throw new AppError("Design not found", 404);

    if (userId && userRole !== "admin" && existing.user_id !== userId) {
      throw new AppError("You do not have permission to delete this design", 403);
    }

    const { error } = await client.from("designs").delete().eq("id", designId);
    if (error) throw new AppError(error.message, 400);
    return true;
  },

  async generateDesign(
    userId: string | undefined,
    userRole: string | undefined,
    body: Record<string, unknown>,
    files?: { image?: Express.Multer.File; sketch?: Express.Multer.File; file?: Express.Multer.File },
  ) {
    const rawMode = String(body.mode || body.type || "").toLowerCase();
    const prompt = String(body.prompt || body.instructions || "").trim();
    const fabricPref = (body.fabricPreference || body.fabric) as string | undefined;
    const colorPref = body.colors
      ? (body.colors as string[])
      : typeof body.colorPreference === "string"
        ? body.colorPreference.split(",").map((s) => s.trim()).filter(Boolean)
        : Array.isArray(body.colorPreference)
          ? (body.colorPreference as string[])
          : undefined;

    const imageFile = files?.image || files?.file;
    const sketchFile = files?.sketch;

    let resolvedMode: "text-to-design" | "image-to-design" | "sketch-to-design" = "text-to-design";
    if (rawMode.includes("sketch") || sketchFile || body.sketchUrl || body.sketch) {
      resolvedMode = "sketch-to-design";
    } else if (rawMode.includes("image") || imageFile || body.imageUrl || body.image) {
      resolvedMode = "image-to-design";
    }

    const enrichedPromptParts = [prompt];
    if (body.category) enrichedPromptParts.push(`category: ${body.category}`);
    if (body.style) enrichedPromptParts.push(`style: ${body.style}`);
    if (body.occasion) enrichedPromptParts.push(`occasion: ${body.occasion}`);
    if (fabricPref) enrichedPromptParts.push(`fabric: ${fabricPref}`);
    if (colorPref && colorPref.length > 0) enrichedPromptParts.push(`colors: ${colorPref.join(", ")}`);
    const fullPrompt = enrichedPromptParts.filter(Boolean).join(", ");

    let aiResult: { imageUrl: string; promptUsed: string; model: string };
    let originalImageUrl: string | undefined;
    let sketchUrl: string | undefined;

    if (resolvedMode === "image-to-design") {
      originalImageUrl = (body.imageUrl || body.image) as string | undefined;
      if (imageFile) {
        const cleanExt = (imageFile.originalname?.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "");
        const path = `${userId || "guest"}/input-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${cleanExt || "png"}`;
        const uploaded = await storageService.uploadFile("designs", path, imageFile.buffer, imageFile.mimetype);
        originalImageUrl = uploaded.url;
      }
      if (!originalImageUrl) throw new AppError("Image file or imageUrl is required for image-to-design", 400);
      aiResult = await aiService.generateImageToDesign(originalImageUrl, fullPrompt || undefined);
    } else if (resolvedMode === "sketch-to-design") {
      sketchUrl = (body.sketchUrl || body.sketch) as string | undefined;
      const fileToUse = sketchFile || imageFile;
      if (fileToUse) {
        const cleanExt = (fileToUse.originalname?.split(".").pop() || "png").replace(/[^a-zA-Z0-9]/g, "");
        const path = `${userId || "guest"}/sketch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${cleanExt || "png"}`;
        const uploaded = await storageService.uploadFile("designs", path, fileToUse.buffer, fileToUse.mimetype);
        sketchUrl = uploaded.url;
      }
      if (!sketchUrl) throw new AppError("Sketch file or sketchUrl is required for sketch-to-design", 400);
      aiResult = await aiService.generateSketchToDesign(sketchUrl, fullPrompt || undefined);
    } else {
      if (!fullPrompt) throw new AppError("A prompt is required for text-to-design generation", 400);
      aiResult = await aiService.generateTextToDesign(fullPrompt);
    }

    const storedImageUrl = await persistGeneratedImage(userId, aiResult.imageUrl);
    const shouldSave = body.save !== false;

    const generatedPayload = {
      title: (body.title as string) || (prompt ? prompt.slice(0, 60) : "AI Couture Concept"),
      description: `Generated via ${resolvedMode} using ${aiResult.model}`,
      type: resolvedMode,
      prompt: prompt || fullPrompt,
      enhanced_prompt: aiResult.promptUsed,
      image_url: storedImageUrl,
      original_image_url: originalImageUrl,
      sketch_url: sketchUrl,
      fabric: fabricPref,
      colors: colorPref || [],
      category: body.category as string | undefined,
      style: body.style as string | undefined,
      occasion: body.occasion as string | undefined,
      model_used: aiResult.model,
      status: "completed",
    };

    if (!shouldSave || !userId) {
      return {
        ...generatedPayload,
        imageUrl: storedImageUrl,
        promptUsed: aiResult.promptUsed,
        model: aiResult.model,
      };
    }

    const saved = await this.createDesign(userId, userRole, generatedPayload);
    return {
      ...saved,
      promptUsed: aiResult.promptUsed,
      model: aiResult.model,
    };
  },

  async textToDesign(userId: string | undefined, userRole: string | undefined, prompt: string, extras: Record<string, unknown> = {}) {
    return this.generateDesign(userId, userRole, { mode: "text-to-design", prompt, ...extras });
  },

  async imageToDesign(userId: string | undefined, userRole: string | undefined, imageUrl?: string, file?: Express.Multer.File, prompt?: string) {
    return this.generateDesign(userId, userRole, { mode: "image-to-design", imageUrl, prompt }, { image: file });
  },

  async sketchToDesign(userId: string | undefined, userRole: string | undefined, sketchUrl?: string, file?: Express.Multer.File, prompt?: string) {
    return this.generateDesign(userId, userRole, { mode: "sketch-to-design", sketchUrl, prompt }, { sketch: file });
  },

  async chatDesign(
    userId: string | undefined,
    userRole: string | undefined,
    payload: {
      message: string;
      designId?: string;
      history?: Array<{ role: string; content: string }>;
      generateImage?: boolean;
      context?: Record<string, unknown>;
    },
  ) {
    let existingDesign: any = null;
    if (payload.designId) {
      try {
        existingDesign = await this.getDesignById(payload.designId, userId, userRole);
      } catch {
        existingDesign = null;
      }
    }

    const history =
      payload.history ??
      (Array.isArray(existingDesign?.chat_history) ? existingDesign.chat_history : []);

    const aiResponse = await aiService.chatWithDesignAssistant({
      message: payload.message,
      history,
      designContext: {
        title: existingDesign?.title || (payload.context?.title as string | undefined),
        category: existingDesign?.category || (payload.context?.category as string | undefined),
        fabric: existingDesign?.fabric || (payload.context?.fabric as string | undefined),
        colors: existingDesign?.colors || (payload.context?.colors as string[] | undefined),
        embroidery: existingDesign?.embroidery || (payload.context?.embroidery as string | undefined),
        prompt: existingDesign?.prompt || (payload.context?.prompt as string | undefined),
        notes: existingDesign?.notes || (payload.context?.notes as string | undefined),
      },
    });

    let generatedImageUrl: string | undefined;
    if (payload.generateImage) {
      const imgRes = await aiService.generateTextToDesign(aiResponse.suggestions.refinedPrompt);
      generatedImageUrl = await persistGeneratedImage(userId, imgRes.imageUrl);
    }

    const now = new Date().toISOString();
    const updatedHistory = [
      ...history,
      { role: "user", content: payload.message, timestamp: now },
      {
        role: "assistant",
        content: aiResponse.reply,
        suggestions: aiResponse.suggestions,
        ...(generatedImageUrl ? { imageUrl: generatedImageUrl } : {}),
        timestamp: now,
      },
    ];

    if (existingDesign?.id && userId) {
      await this.updateDesign(existingDesign.id, userId, userRole, {
        chatHistory: updatedHistory,
        ...(generatedImageUrl ? { imageUrl: generatedImageUrl } : {}),
      });
    }

    return {
      reply: aiResponse.reply,
      message: aiResponse.reply,
      designId: existingDesign?.id ?? payload.designId ?? null,
      suggestions: aiResponse.suggestions,
      imageUrl: generatedImageUrl ?? null,
      model: aiResponse.model,
      chatHistory: updatedHistory,
    };
  },

  async duplicateDesign(designId: string, userId: string | undefined, userRole: string | undefined) {
    const original = await this.getDesignById(designId, userId, userRole);
    const clonePayload: Record<string, unknown> = {
      title: original.title ? `${original.title} (Copy)` : "Untitled Design (Copy)",
      description: original.description,
      type: original.type,
      prompt: original.prompt,
      enhanced_prompt: original.enhanced_prompt,
      image_url: original.image_url,
      original_image_url: original.original_image_url,
      sketch_url: original.sketch_url,
      colors: original.colors,
      fabric: original.fabric,
      embroidery: original.embroidery,
      measurements: original.measurements,
      notes: original.notes,
      category: original.category,
      style: original.style,
      occasion: original.occasion,
      tags: original.tags,
      duplicated_from_id: designId,
      status: "completed",
    };
    return this.createDesign(userId, userRole, clonePayload);
  },

  async shareWithTailor(designId: string, userId: string | undefined, userRole: string | undefined, tailorId: string) {
    const client = getDbClient();
    const { data: tailor } = await client
      .from("tailors")
      .select("id, user_id, shop_name")
      .or(`id.eq.${tailorId},user_id.eq.${tailorId}`)
      .maybeSingle();

    if (!tailor) {
      throw new AppError("Tailor not found", 404);
    }

    const updated = await this.updateDesign(designId, userId, userRole, {
      sharedWithTailorId: tailor.id,
    });

    if (tailor.user_id) {
      try {
        await notificationsService.createNotification({
          userId: tailor.user_id,
          title: "New Design Shared With You",
          message: `A customer shared design "${updated.title || "Custom Outfit"}" with ${tailor.shop_name}.`,
          type: "design",
          data: { designId: updated.id, tailorId: tailor.id },
        });
      } catch {}
    }

    return updated;
  },

  async getTechPack(designId: string, userId: string | undefined, userRole: string | undefined) {
    const design = await this.getDesignById(designId, userId, userRole);
    const sharedTailorName = (design as any).shared_tailor?.shop_name || null;

    const pdfBuffer = buildTechPackPdfBuffer({
      designId,
      title: design.title || "Custom Bespoke Design",
      type: design.type || "manual",
      category: design.category,
      style: design.style,
      occasion: design.occasion,
      fabric: design.fabric,
      colors: Array.isArray(design.colors) ? design.colors : [],
      embroidery: design.embroidery,
      measurements: (design.measurements as Record<string, unknown>) || {},
      notes: design.notes,
      prompt: design.prompt,
      imageUrl: design.image_url,
      sharedTailorName,
      createdAt: design.created_at,
    });

    let pdfUrl: string | null = null;
    try {
      const storagePath = `${design.user_id || "public"}/tech-pack-${designId}.pdf`;
      const uploaded = await storageService.uploadFile("exports", storagePath, pdfBuffer, "application/pdf");
      pdfUrl = uploaded.url;
      await this.updateDesign(designId, userId, userRole, { pdfUrl });
    } catch {
      pdfUrl = (design as any).pdf_url || null;
    }

    const techPack = {
      designId,
      title: design.title || "Custom Bespoke Design",
      category: design.category || "Bespoke",
      style: design.style || "Custom",
      occasion: design.occasion || "All Occasions",
      fabric: {
        primary: design.fabric || "To be finalized",
        estimatedYardageMeters: 4.5,
      },
      colorPalette: Array.isArray(design.colors) ? design.colors : [],
      embroidery: design.embroidery || "Standard clean finishing",
      measurements: design.measurements || {},
      constructionNotes: design.notes || "Follow standard atelier seam allowances.",
      visualReferenceUrl: design.image_url || null,
      sketchUrl: design.sketch_url || null,
      sharedTailor: (design as any).shared_tailor || null,
      generatedAt: new Date().toISOString(),
    };

    return {
      designId,
      pdfUrl,
      shareUrl: `/designs/${designId}/tech-pack`,
      techPack,
      pdfBuffer,
    };
  },

  async exportPdf(designId: string, userId: string | undefined, userRole: string | undefined) {
    const { pdfUrl, techPack } = await this.getTechPack(designId, userId, userRole);
    return { designId, pdfUrl, techPack };
  },
};
