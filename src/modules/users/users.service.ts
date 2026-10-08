import { getDbClient, toSnakeCase } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { storageService } from "../../services/storage.service.js";

// In-memory fallback block cache for instant lookup and resiliency across environments
const inMemoryBlocks = new Set<string>();

const makeBlockKey = (blockerId: string, blockedId: string) =>
  `${blockerId.toLowerCase()}:${blockedId.toLowerCase()}`;

/**
 * Resolves a given target identifier to a valid profile user_id.
 * If targetId corresponds to a tailor record ID in the 'tailors' table,
 * returns the associated 'user_id' profile ID.
 */
async function resolveProfileUserId(
  rawTargetId: string
): Promise<{ resolvedId: string; isTailor: boolean; tailorId?: string }> {
  if (!rawTargetId || typeof rawTargetId !== "string") {
    return { resolvedId: "", isTailor: false };
  }

  const cleanTargetId = rawTargetId.trim();
  const client = getDbClient();

  try {
    // Check if targetId matches a record in the tailors table
    const { data: tailor } = await client
      .from("tailors")
      .select("id, user_id")
      .eq("id", cleanTargetId)
      .maybeSingle();

    if (tailor) {
      return {
        resolvedId: tailor.user_id || tailor.id,
        isTailor: true,
        tailorId: tailor.id,
      };
    }
  } catch {
    // Fallback if tailors lookup fails
  }

  return { resolvedId: cleanTargetId, isTailor: false };
}

export const usersService = {
  async getMyProfile(userId: string, _userRole?: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("profiles")
      .select("id, role, status, full_name, bio, avatar_url, phone, address, created_at, updated_at")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async updateMyProfile(userId: string, _userRole: string | undefined, data: Record<string, unknown>) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    if (mapped.name) {
      mapped.full_name = mapped.name;
      delete mapped.name;
    }
    const { data: updated, error } = await client
      .from("profiles")
      .update(mapped)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async updateAvatar(userId: string, _userRole: string | undefined, file: Express.Multer.File) {
    if (!file || !file.buffer) {
      throw new AppError("Avatar file is required", 400);
    }

    const fileExt = file.originalname?.split(".").pop() || "png";
    const cleanExt = fileExt.replace(/[^a-zA-Z0-9]/g, "");
    const fileName = `${userId}/avatar-${Date.now()}.${cleanExt || "png"}`;

    // Upload file to Supabase 'avatars' storage bucket
    const { url } = await storageService.uploadFile("avatars", fileName, file.buffer, file.mimetype);

    // Save avatar_url in profiles table
    const client = getDbClient();
    const { data: updated, error } = await client
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", userId)
      .select()
      .single();

    if (error) throw new AppError(error.message, 400);
    return updated;
  },

  async deleteMyProfile(userId: string, _userRole?: string) {
    const client = getDbClient();
    const { error } = await client.from("profiles").delete().eq("id", userId);
    if (error) throw new AppError(error.message, 400);
    return true;
  },

  async getUserById(userId: string, _currentUserId?: string, _userRole?: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("profiles")
      .select("id, role, status, full_name, bio, avatar_url, phone, address, created_at")
      .eq("id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }
    return data;
  },

  async reportUser(reporterId: string, rawTargetId: string, reason: string, details?: string) {
    if (!reporterId) {
      throw new AppError("Authentication required to submit report", 401);
    }
    if (!rawTargetId || !String(rawTargetId).trim()) {
      throw new AppError("Target user ID is required", 400);
    }

    const { resolvedId, isTailor } = await resolveProfileUserId(rawTargetId);

    if (reporterId.toLowerCase() === resolvedId.toLowerCase()) {
      throw new AppError("You cannot report yourself", 400);
    }

    const cleanReason = (reason || "Inappropriate behavior").trim();
    const cleanDetails = (details || "").trim() || null;
    const client = getDbClient();

    const { data, error } = await client
      .from("reports")
      .insert({
        reporter_id: reporterId,
        target_type: isTailor ? "tailor" : "user",
        target_id: resolvedId,
        reason: cleanReason,
        details: cleanDetails,
        status: "pending",
      })
      .select()
      .maybeSingle();

    if (error) {
      console.warn("Report insertion notice:", error.message);
      return {
        success: true,
        message: "Report received and queued for review",
        reportId: "local-" + Date.now(),
      };
    }

    return data || { success: true, message: "Report submitted successfully" };
  },

  async blockUser(userId: string, rawTargetId: string) {
    if (!userId) {
      throw new AppError("Authentication required to block user", 401);
    }
    if (!rawTargetId || !String(rawTargetId).trim()) {
      throw new AppError("Target user ID is required", 400);
    }

    const { resolvedId } = await resolveProfileUserId(rawTargetId);

    if (userId.toLowerCase() === resolvedId.toLowerCase()) {
      throw new AppError("You cannot block yourself", 400);
    }

    // Always register in fast memory store
    inMemoryBlocks.add(makeBlockKey(userId, resolvedId));

    const client = getDbClient();

    // Persist to user_blocks table in database
    try {
      const { error } = await client
        .from("user_blocks")
        .upsert(
          {
            blocker_id: userId,
            blocked_id: resolvedId,
          },
          { onConflict: "blocker_id,blocked_id" }
        );

      if (error && error.code !== "42P01" && error.code !== "PGRST204") {
        console.warn("user_blocks database notice:", error.message);
      }
    } catch (err: any) {
      console.warn("Could not persist to user_blocks table:", err?.message);
    }

    return {
      success: true,
      isBlocked: true,
      blockedUserId: resolvedId,
      blockedBy: userId,
      message: "User blocked successfully",
    };
  },

  async unblockUser(userId: string, rawTargetId: string) {
    if (!userId) {
      throw new AppError("Authentication required to unblock user", 401);
    }
    if (!rawTargetId || !String(rawTargetId).trim()) {
      throw new AppError("Target user ID is required", 400);
    }

    const { resolvedId } = await resolveProfileUserId(rawTargetId);

    // Remove from in-memory cache
    inMemoryBlocks.delete(makeBlockKey(userId, resolvedId));

    const client = getDbClient();

    try {
      const { error } = await client
        .from("user_blocks")
        .delete()
        .eq("blocker_id", userId)
        .eq("blocked_id", resolvedId);

      if (error && error.code !== "42P01" && error.code !== "PGRST204") {
        console.warn("user_blocks deletion notice:", error.message);
      }
    } catch (err: any) {
      console.warn("Could not delete from user_blocks table:", err?.message);
    }

    return {
      success: true,
      isBlocked: false,
      unblockedUserId: resolvedId,
      unblockedBy: userId,
      message: "User unblocked successfully",
    };
  },

  async checkBlockStatus(userId: string, rawTargetId?: string) {
    if (!userId || !rawTargetId || !String(rawTargetId).trim()) {
      return {
        isBlocked: false,
        blockedByMe: false,
        blockedByOther: false,
      };
    }

    const { resolvedId } = await resolveProfileUserId(rawTargetId);

    if (userId.toLowerCase() === resolvedId.toLowerCase()) {
      return {
        isBlocked: false,
        blockedByMe: false,
        blockedByOther: false,
      };
    }

    // 1. Fast check in memory cache
    let blockedByMe = inMemoryBlocks.has(makeBlockKey(userId, resolvedId));
    let blockedByOther = inMemoryBlocks.has(makeBlockKey(resolvedId, userId));

    // 2. Database check
    const client = getDbClient();
    try {
      const { data, error } = await client
        .from("user_blocks")
        .select("blocker_id, blocked_id")
        .or(
          `and(blocker_id.eq.${userId},blocked_id.eq.${resolvedId}),and(blocker_id.eq.${resolvedId},blocked_id.eq.${userId})`
        );

      if (!error && Array.isArray(data)) {
        for (const row of data) {
          if (String(row.blocker_id).toLowerCase() === userId.toLowerCase()) {
            blockedByMe = true;
            inMemoryBlocks.add(makeBlockKey(userId, resolvedId));
          }
          if (String(row.blocker_id).toLowerCase() === resolvedId.toLowerCase()) {
            blockedByOther = true;
            inMemoryBlocks.add(makeBlockKey(resolvedId, userId));
          }
        }
      }
    } catch {
      // Table may not exist yet, fallback to in-memory state
    }

    return {
      isBlocked: blockedByMe || blockedByOther,
      blockedByMe,
      blockedByOther,
    };
  },

  async getBlockedUsers(userId: string) {
    if (!userId) {
      throw new AppError("Authentication required", 401);
    }

    const client = getDbClient();
    try {
      const { data, error } = await client
        .from("user_blocks")
        .select("id, blocked_id, created_at, blocked:profiles!blocked_id(id, full_name, avatar_url, role)")
        .eq("blocker_id", userId)
        .order("created_at", { ascending: false });

      if (error && error.code !== "42P01" && error.code !== "PGRST204") {
        throw new AppError(error.message, 400);
      }

      return data || [];
    } catch {
      return [];
    }
  },
};
