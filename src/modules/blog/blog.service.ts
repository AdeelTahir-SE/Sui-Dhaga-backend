import { getDbClient, toSnakeCase } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { isMissingTableError, throwDbError } from "../../utils/supabase-error.js";

const CURATED_BLOG_POSTS = [
  {
    id: "blog-bridal-fabrics-guide",
    slug: "bridal-fabrics-pakistan-seasonal-guide",
    title: "Choosing the Right Bridal Fabric for Every Season in Pakistan",
    excerpt:
      "From raw silk and kamdani organza for spring nikahs to plush velvet lehengas for December walimas — a master tailor's textile breakdown.",
    content:
      "Selecting a bridal textile starts with silhouette structure and embroidery weight. Heavy dabka and zardozi hold best on 165+ GSM pure raw silk or dense micro-velvet, while airy spring nikah outfits shine in crinkle silk organza paired with light tilla and mukesh accents. Always allow an extra 1.5 yards when pairing directional border motifs.",
    cover_image_url:
      "https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1000&q=80",
    category: "Bridal Atelier",
    tags: ["bridal", "fabrics", "silk", "velvet"],
    author_name: "Sui-Dhaga Editorial Team",
    read_time_minutes: 6,
    is_published: true,
    published_at: "2026-09-15T10:00:00.000Z",
  },
  {
    id: "blog-bespoke-sherwani-fit",
    slug: "anatomy-of-a-bespoke-sherwani-fit",
    title: "The Anatomy of a Perfectly Fitted Bespoke Sherwani",
    excerpt:
      "Why shoulder slope, armhole height, and collar band circumference matter more than length alone when commissioning groomwear.",
    content:
      "A sharp sherwani depends on three critical ratios: clean high-cut armholes for effortless posture, structured canvas chest interlining so heavy jamawar never collapses, and a tailored 1.25-inch band collar matched accurately to the neck base. Book two fittings — basted canvas first, final buttons last.",
    cover_image_url:
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1000&q=80",
    category: "Menswear Craft",
    tags: ["sherwani", "menswear", "measurements", "tailoring"],
    author_name: "Master Rafiq Studio",
    read_time_minutes: 5,
    is_published: true,
    published_at: "2026-10-02T10:00:00.000Z",
  },
  {
    id: "blog-ai-tech-pack-workflow",
    slug: "how-to-share-ai-tech-packs-with-your-tailor",
    title: "How to Turn an AI Sketch into a Tailor-Ready Tech Pack",
    excerpt:
      "Learn how color hex notes, fabric GSM specs, embroidery placement callouts, and body measurements speed up bespoke quotes.",
    content:
      "When sending an AI-generated outfit concept to an atelier on Sui-Dhaga, clarity saves both time and fabric waste. Attach your saved body measurement profile, lock in primary and accent fabric selections, and specify neckline depth and sleeve finish inside the Design Studio notes before exporting your PDF Tech Pack.",
    cover_image_url:
      "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&w=1000&q=80",
    category: "Design Studio",
    tags: ["ai-studio", "tech-pack", "bespoke"],
    author_name: "Sui-Dhaga Product Lab",
    read_time_minutes: 4,
    is_published: true,
    published_at: "2026-10-20T10:00:00.000Z",
  },
];

export const blogService = {
  async listPosts(filters: { category?: string; search?: string; tag?: string; page?: number; limit?: number } = {}) {
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(100, Math.max(1, filters.limit || 20));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const client = getDbClient();
    let query = client
      .from("blog_posts")
      .select("*", { count: "exact" })
      .eq("is_published", true);

    if (filters.category && filters.category.toLowerCase() !== "all") {
      query = query.ilike("category", `%${filters.category.trim()}%`);
    }
    if (filters.tag) {
      query = query.contains("tags", [filters.tag.trim()]);
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(`title.ilike.%${q}%,excerpt.ilike.%${q}%,content.ilike.%${q}%`);
    }

    const { data, count, error } = await query
      .order("published_at", { ascending: false })
      .range(from, to);

    if (error) {
      if (isMissingTableError(error)) {
        const filtered = CURATED_BLOG_POSTS.filter((p) => {
          if (filters.category && filters.category.toLowerCase() !== "all" && !p.category.toLowerCase().includes(filters.category.toLowerCase())) {
            return false;
          }
          if (filters.tag && !p.tags.includes(filters.tag)) {
            return false;
          }
          if (filters.search) {
            const q = filters.search.toLowerCase();
            return (
              p.title.toLowerCase().includes(q) ||
              p.excerpt.toLowerCase().includes(q) ||
              p.content.toLowerCase().includes(q)
            );
          }
          return true;
        });
        return { records: filtered.slice(from, to + 1), total: filtered.length };
      }
      throw new AppError(error.message, 400);
    }

    const records = data && data.length > 0 ? data : CURATED_BLOG_POSTS;
    return {
      records,
      total: count ?? records.length,
    };
  },

  async getPostBySlug(slugOrId: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("blog_posts")
      .select("*")
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .maybeSingle();

    if (error) {
      if (isMissingTableError(error)) {
        const match = CURATED_BLOG_POSTS.find(
          (p) => p.slug === slugOrId || p.id === slugOrId
        );
        if (!match) throw new AppError("Blog article not found", 404);
        return match;
      }
      throw new AppError(error.message, 400);
    }

    if (!data) {
      const match = CURATED_BLOG_POSTS.find(
        (p) => p.slug === slugOrId || p.id === slugOrId
      );
      if (match) return match;
      throw new AppError("Blog article not found", 404);
    }

    return data;
  },

  async createPost(data: Record<string, unknown>) {
    const mapped = toSnakeCase(data);
    if (!mapped.slug && typeof mapped.title === "string") {
      mapped.slug = mapped.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    }
    const client = getDbClient();
    const { data: created, error } = await client
      .from("blog_posts")
      .insert({ ...mapped, published_at: new Date().toISOString() })
      .select()
      .single();
    if (error) throwDbError(error, "blog_posts");
    return created;
  },

  async updatePost(slugOrId: string, data: Record<string, unknown>) {
    const mapped = toSnakeCase(data);
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("blog_posts")
      .update(mapped)
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`)
      .select()
      .single();
    if (error) throwDbError(error, "blog_posts");
    return updated;
  },

  async deletePost(slugOrId: string) {
    const client = getDbClient();
    const { error } = await client
      .from("blog_posts")
      .delete()
      .or(`slug.eq.${slugOrId},id.eq.${slugOrId}`);
    if (error) throwDbError(error, "blog_posts");
    return true;
  },
};
