import { getDbClient, toSnakeCase } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingTableError, throwDbError } from "../../utils/supabase-error.js";

const CURATED_FABRICS = [
  {
    id: "fab-pure-raw-silk",
    name: "Pure Raw Silk",
    slug: "pure-raw-silk",
    category: "Silk",
    origin: "Multan / Varanasi",
    price_per_meter: 3200,
    gsm_weight: 165,
    season: "All Season",
    description:
      "Lustrous handloom raw silk with natural slub texture, prized for bridal lehengas, sherwanis, and structured couture.",
    care_instructions: "Dry clean only; store wrapped in muslin cloth away from moisture.",
    color_swatches: ["#B91C1C", "#0F766E", "#D97706", "#1E293B"],
    image_url: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=900&q=80",
    in_stock: true,
  },
  {
    id: "fab-jamawar-banarsi",
    name: "Banarsi Jamawar",
    slug: "banarsi-jamawar",
    category: "Brocade",
    origin: "Lahore Heritage Looms",
    price_per_meter: 4500,
    gsm_weight: 210,
    season: "Festive / Winter",
    description:
      "Intricately woven metallic-zari brocade featuring Mughal floral motifs engineered for groom sherwanis and formal jackets.",
    care_instructions: "Professional dry clean only; steam from reverse side.",
    color_swatches: ["#78350F", "#991B1B", "#064E3B", "#312E81"],
    image_url: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80",
    in_stock: true,
  },
  {
    id: "fab-swiss-cotton-lawn",
    name: "Swiss Cotton Lawn",
    slug: "swiss-cotton-lawn",
    category: "Cotton",
    origin: "Faisalabad Combed Mills",
    price_per_meter: 950,
    gsm_weight: 85,
    season: "Summer",
    description:
      "Ultra-breathable high-thread-count combed cotton lawn offering crisp drape and skin comfort in warm climates.",
    care_instructions: "Gentle cold wash; shade dry.",
    color_swatches: ["#F8FAFC", "#BAE6FD", "#FBCFE8", "#FEF08A"],
    image_url: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&w=900&q=80",
    in_stock: true,
  },
  {
    id: "fab-organza-sheer",
    name: "Crinkle Silk Organza",
    slug: "crinkle-silk-organza",
    category: "Organza",
    origin: "Karachi Atelier Weavers",
    price_per_meter: 2400,
    gsm_weight: 60,
    season: "Festive / Spring",
    description:
      "Ethereal sheer organza ideal for hand-embellished dupattas, layered pishwas silhouettes, and fine tilla embroidery.",
    care_instructions: "Dry clean only; avoid direct high-heat pressing.",
    color_swatches: ["#FCE7F3", "#E0E7FF", "#ECFDF5", "#FEF3C7"],
    image_url: "https://images.unsplash.com/photo-1583744946564-b52ac1c389c8?auto=format&fit=crop&w=900&q=80",
    in_stock: true,
  },
  {
    id: "fab-merino-boski",
    name: "Heritage Blended Boski",
    slug: "heritage-blended-boski",
    category: "Suiting",
    origin: "Gujranwala Fine Mills",
    price_per_meter: 2850,
    gsm_weight: 145,
    season: "Spring / Autumn",
    description:
      "Silky matte ivory-cream drape renowned for classic menswear shalwar kameez and refined Friday wear.",
    care_instructions: "Dry clean recommended or mild hand wash with neutral detergent.",
    color_swatches: ["#FEF9C3", "#F5F5F4", "#E2E8F0"],
    image_url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=900&q=80",
    in_stock: true,
  },
  {
    id: "fab-velvet-micro",
    name: "Plush Bridal Velvet",
    slug: "plush-bridal-velvet",
    category: "Velvet",
    origin: "Lahore Heritage Looms",
    price_per_meter: 3800,
    gsm_weight: 280,
    season: "Winter",
    description:
      "Dense micro-pile silk-blend velvet engineered to support heavy zardozi, dabka, and mukesh bridal work.",
    care_instructions: "Steam gently with velvet brush; dry clean only.",
    color_swatches: ["#450A0A", "#052E16", "#172554", "#000000"],
    image_url: "https://images.unsplash.com/photo-1551232864-3f0890e580d9?auto=format&fit=crop&w=900&q=80",
    in_stock: true,
  },
];

export const fabricsService = {
  async listFabrics(filters: { category?: string; season?: string; search?: string; page?: number; limit?: number } = {}) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 24));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const client = getDbClient();
    let query = client.from("fabrics").select("*", { count: "exact" });

    if (filters.category && filters.category.toLowerCase() !== "all") {
      query = query.ilike("category", `%${filters.category.trim()}%`);
    }
    if (filters.season && filters.season.toLowerCase() !== "all") {
      query = query.ilike("season", `%${filters.season.trim()}%`);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%,description.ilike.%${q}%,origin.ilike.%${q}%`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      if (isMissingTableError(error)) {
        const filtered = CURATED_FABRICS.filter((f) => {
          if (filters.category && filters.category.toLowerCase() !== "all" && !f.category.toLowerCase().includes(filters.category.toLowerCase())) {
            return false;
          }
          if (filters.season && filters.season.toLowerCase() !== "all" && !f.season.toLowerCase().includes(filters.season.toLowerCase())) {
            return false;
          }
          if (filters.search) {
            const q = filters.search.toLowerCase();
            return (
              f.name.toLowerCase().includes(q) ||
              f.category.toLowerCase().includes(q) ||
              f.description.toLowerCase().includes(q)
            );
          }
          return true;
        });
        return {
          records: filtered.slice(from, to + 1),
          total: filtered.length,
        };
      }
      throw new AppError(error.message, 400);
    }

    const records = data && data.length > 0 ? data : CURATED_FABRICS;
    return {
      records,
      total: count ?? records.length,
    };
  },

  async getFabricById(fabricIdOrSlug: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("fabrics")
      .select("*")
      .or(`id.eq.${fabricIdOrSlug},slug.eq.${fabricIdOrSlug}`)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        const match = CURATED_FABRICS.find(
          (f) => f.id === fabricIdOrSlug || f.slug === fabricIdOrSlug
        );
        if (!match) throw new AppError("Fabric not found", 404);
        return match;
      }
      throw new AppError(error.message, 400);
    }

    if (!data) {
      const match = CURATED_FABRICS.find(
        (f) => f.id === fabricIdOrSlug || f.slug === fabricIdOrSlug
      );
      if (match) return match;
      throw new AppError("Fabric not found", 404);
    }

    return data;
  },

  async createFabric(data: Record<string, unknown>) {
    const mapped = toSnakeCase(data);
    if (!mapped.slug && typeof mapped.name === "string") {
      mapped.slug = mapped.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    const client = getDbClient();
    const { data: created, error } = await client.from("fabrics").insert(mapped).select().single();
    if (error) throwDbError(error, "fabrics");
    return created;
  },

  async updateFabric(fabricId: string, data: Record<string, unknown>) {
    const mapped = toSnakeCase(data);
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("fabrics")
      .update(mapped)
      .eq("id", fabricId)
      .select()
      .single();
    if (error) throwDbError(error, "fabrics");
    return updated;
  },

  async deleteFabric(fabricId: string) {
    const client = getDbClient();
    const { error } = await client.from("fabrics").delete().eq("id", fabricId);
    if (error) throwDbError(error, "fabrics");
    return true;
  },
};
