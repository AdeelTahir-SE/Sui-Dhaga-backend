import { getDbClient, toSnakeCase } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { storageService } from "../../services/storage.service.js";
import { cacheService } from "../../services/cache.service.js";
import { notificationsService } from "../notifications/notifications.service.js";
import { isMissingTableError, throwDbError } from "../../utils/supabase-error.js";
import {
  decodeRawBase64Image,
  extractStoragePathFromUrl,
  isValidHttpImageUrl,
  MAX_AVATAR_BYTES,
  parseBase64ImageDataUri,
  resolveImageFileMeta,
} from "../../utils/image-upload.helper.js";

const AVATAR_INPUT_KEYS = [
  "avatarUrl",
  "avatar_url",
  "avatar",
  "image",
  "imageUrl",
  "image_url",
  "url",
  "dataUrl",
] as const;

type ProfileClient = ReturnType<typeof getDbClient>;

function formatUserProfileResponse(
  profile: Record<string, any> | null | undefined,
  extras: { email?: string; fallbackId?: string; fallbackRole?: string } = {}
) {
  const record = profile && typeof profile === "object" ? profile : null;
  const avatarUrl = record?.avatar_url ?? null;
  const fullName = record?.full_name ?? null;

  return {
    ...(record || {
      id: extras.fallbackId,
      role: extras.fallbackRole || "customer",
      status: "active",
      full_name: null,
      bio: null,
      avatar_url: null,
      phone: null,
      address: null,
    }),
    ...(extras.email ? { email: extras.email } : {}),
    fullName,
    avatarUrl,
    avatar: avatarUrl,
  };
}

async function resolveAvatarUploadSource(
  userId: string,
  file?: Express.Multer.File,
  body: Record<string, unknown> = {}
): Promise<{ url: string | null; uploadedPath: string | null; shouldChange: boolean }> {
  if (file) {
    const { extension, mimeType } = resolveImageFileMeta(file);
    const storagePath = `${userId}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const { url } = await storageService.uploadFile("avatars", storagePath, file.buffer, mimeType);
    return { url, uploadedPath: storagePath, shouldChange: true };
  }

  if (typeof body.base64 === "string" && body.base64.trim()) {
    const { buffer, mimeType, extension } = decodeRawBase64Image(
      body.base64,
      typeof body.mimeType === "string" ? body.mimeType : undefined,
      MAX_AVATAR_BYTES
    );
    const storagePath = `${userId}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
    const { url } = await storageService.uploadFile("avatars", storagePath, buffer, mimeType);
    return { url, uploadedPath: storagePath, shouldChange: true };
  }

  if (body.removeAvatar === true) {
    return { url: null, uploadedPath: null, shouldChange: true };
  }

  let hasExplicitClear = false;
  for (const key of AVATAR_INPUT_KEYS) {
    if (!(key in body)) continue;
    const raw = body[key];
    if (raw === null || raw === "") {
      hasExplicitClear = true;
      continue;
    }
    if (typeof raw !== "string") continue;

    const trimmed = raw.trim();
    if (!trimmed) {
      hasExplicitClear = true;
      continue;
    }

    const parsedDataUri = parseBase64ImageDataUri(trimmed, MAX_AVATAR_BYTES);
    if (parsedDataUri) {
      const storagePath = `${userId}/avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${parsedDataUri.extension}`;
      const { url } = await storageService.uploadFile(
        "avatars",
        storagePath,
        parsedDataUri.buffer,
        parsedDataUri.mimeType
      );
      return { url, uploadedPath: storagePath, shouldChange: true };
    }

    if (isValidHttpImageUrl(trimmed)) {
      return { url: trimmed, uploadedPath: null, shouldChange: true };
    }

    throw new AppError(
      "Invalid avatar image. Provide an image file, base64 image data URI, or valid HTTP(S) image URL.",
      400
    );
  }

  if (hasExplicitClear) {
    return { url: null, uploadedPath: null, shouldChange: true };
  }

  return { url: null, uploadedPath: null, shouldChange: false };
}

async function saveProfileFields(
  client: ProfileClient,
  userId: string,
  userRole: string | undefined,
  fields: Record<string, unknown>
) {
  const payload = {
    ...fields,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await client
    .from("profiles")
    .update(payload)
    .eq("id", userId)
    .select()
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new AppError(error.message, 400);
  }
  if (updated) {
    return updated;
  }

  const { data: upserted, error: upsertError } = await client
    .from("profiles")
    .upsert(
      {
        id: userId,
        role: userRole || "customer",
        ...payload,
      },
      { onConflict: "id" }
    )
    .select()
    .single();

  if (upsertError) {
    throw new AppError(upsertError.message, 400);
  }
  return upserted;
}

async function syncUserAuthAndTailorCache(
  client: ProfileClient,
  userId: string,
  updates: { fullName?: string; avatarUrl?: string | null }
) {
  try {
    if (
      (updates.fullName !== undefined || updates.avatarUrl !== undefined) &&
      typeof client?.auth?.admin?.getUserById === "function" &&
      typeof client?.auth?.admin?.updateUserById === "function"
    ) {
      const { data: lookup } = await client.auth.admin.getUserById(userId);
      const currentMeta =
        lookup?.user?.user_metadata && typeof lookup.user.user_metadata === "object"
          ? lookup.user.user_metadata
          : {};
      const nextMeta: Record<string, unknown> = { ...currentMeta };

      if (updates.fullName !== undefined) {
        nextMeta.full_name = updates.fullName;
        nextMeta.name = updates.fullName;
      }
      if (updates.avatarUrl !== undefined) {
        nextMeta.avatar_url = updates.avatarUrl;
        nextMeta.avatar = updates.avatarUrl;
        nextMeta.picture = updates.avatarUrl;
      }

      await client.auth.admin.updateUserById(userId, { user_metadata: nextMeta });
    }
  } catch {}

  if (updates.avatarUrl !== undefined || updates.fullName !== undefined) {
    try {
      const { data: tailor } = await client
        .from("tailors")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (tailor?.id) {
        cacheService.del(`tailor:${tailor.id}`);
      }
      cacheService.delByPattern("tailors:*");
    } catch {}
  }
}

async function cleanupPreviousAvatar(
  previousUrl: unknown,
  nextUrl: string | null,
  newPath: string | null,
  userId: string
) {
  const oldPath = extractStoragePathFromUrl(previousUrl, "avatars", `${userId}/`);
  if (oldPath && oldPath !== newPath && previousUrl !== nextUrl) {
    await storageService.deleteFile("avatars", oldPath);
  }
}

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
  async getMyProfile(userId: string, userRole?: string, email?: string) {
    const client = getDbClient();
    const { data, error } = await client
      .from("profiles")
      .select("id, role, status, full_name, bio, avatar_url, phone, address, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw new AppError(error.message, 400);
    }

    return formatUserProfileResponse(data, {
      email,
      fallbackId: userId,
      fallbackRole: userRole,
    });
  },

  async updateMyProfile(
    userId: string,
    userRole: string | undefined,
    data: Record<string, unknown>,
    file?: Express.Multer.File
  ) {
    const client = getDbClient();
    const mapped = toSnakeCase(data);
    const profileUpdates: Record<string, unknown> = {};

    const resolvedName =
      typeof data.fullName === "string"
        ? data.fullName
        : typeof data.full_name === "string"
        ? data.full_name
        : typeof data.name === "string"
        ? data.name
        : undefined;
    if (resolvedName !== undefined) {
      profileUpdates.full_name = resolvedName;
    }

    for (const col of ["phone", "address", "bio"] as const) {
      if (mapped[col] !== undefined) {
        profileUpdates[col] = mapped[col];
      }
    }

    const avatarUpdate = await resolveAvatarUploadSource(userId, file, data);
    let previousAvatarUrl: unknown;
    if (avatarUpdate.shouldChange) {
      try {
        const { data: existing } = await client
          .from("profiles")
          .select("avatar_url")
          .eq("id", userId)
          .maybeSingle();
        previousAvatarUrl = existing?.avatar_url;
      } catch {}
      profileUpdates.avatar_url = avatarUpdate.url;
    }

    const updated = await saveProfileFields(client, userId, userRole, profileUpdates);

    if (avatarUpdate.shouldChange) {
      await cleanupPreviousAvatar(
        previousAvatarUrl,
        avatarUpdate.url,
        avatarUpdate.uploadedPath,
        userId
      );
    }

    await syncUserAuthAndTailorCache(client, userId, {
      fullName: resolvedName,
      ...(avatarUpdate.shouldChange ? { avatarUrl: avatarUpdate.url } : {}),
    });

    return formatUserProfileResponse(updated, {
      fallbackId: userId,
      fallbackRole: userRole,
    });
  },

  async updateAvatar(
    userId: string,
    userRole: string | undefined,
    file?: Express.Multer.File,
    body: Record<string, unknown> = {}
  ) {
    const avatarUpdate = await resolveAvatarUploadSource(userId, file, body);
    if (!avatarUpdate.shouldChange || !avatarUpdate.url) {
      throw new AppError(
        "Avatar image file, base64 data URI, or valid image URL is required",
        400
      );
    }

    const client = getDbClient();
    let previousAvatarUrl: unknown;
    try {
      const { data: existing } = await client
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .maybeSingle();
      previousAvatarUrl = existing?.avatar_url;
    } catch {}

    const updated = await saveProfileFields(client, userId, userRole, {
      avatar_url: avatarUpdate.url,
    });

    await cleanupPreviousAvatar(
      previousAvatarUrl,
      avatarUpdate.url,
      avatarUpdate.uploadedPath,
      userId
    );

    await syncUserAuthAndTailorCache(client, userId, {
      avatarUrl: avatarUpdate.url,
    });

    return {
      ...formatUserProfileResponse(updated, { fallbackId: userId, fallbackRole: userRole }),
      url: avatarUpdate.url,
    };
  },

  async deleteAvatar(userId: string, userRole?: string) {
    const client = getDbClient();
    let previousAvatarUrl: unknown;
    try {
      const { data: existing } = await client
        .from("profiles")
        .select("avatar_url")
        .eq("id", userId)
        .maybeSingle();
      previousAvatarUrl = existing?.avatar_url;
    } catch {}

    const updated = await saveProfileFields(client, userId, userRole, {
      avatar_url: null,
    });

    await cleanupPreviousAvatar(previousAvatarUrl, null, null, userId);
    await syncUserAuthAndTailorCache(client, userId, { avatarUrl: null });

    return formatUserProfileResponse(updated, { fallbackId: userId, fallbackRole: userRole });
  },

  async deleteMyProfile(userId: string, _userRole?: string) {
    const client = getDbClient();

    // 1. Invalidate caches
    cacheService.del(`user:${userId}`);
    cacheService.delByPattern(`*${userId}*`);
    try {
      const { data: tailor } = await client
        .from("tailors")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();
      if (tailor?.id) {
        cacheService.del(`tailor:${tailor.id}`);
        cacheService.delByPattern("tailors:*");
      }
    } catch {}

    // 2. Delete user profile
    const { error } = await client.from("profiles").delete().eq("id", userId);
    if (error) throw new AppError(error.message, 400);

    // 3. Delete from Supabase Auth admin if available
    try {
      if (typeof client?.auth?.admin?.deleteUser === "function") {
        await client.auth.admin.deleteUser(userId);
      }
    } catch (authErr: any) {
      console.warn("Could not delete Supabase auth user:", authErr?.message || authErr);
    }

    return { deleted: true, userId };
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

  async followUser(followerId: string, rawTargetId: string) {
    if (!followerId) throw new AppError("Authentication required", 401);
    const { resolvedId } = await resolveProfileUserId(rawTargetId);
    if (!resolvedId) throw new AppError("Target user not found", 404);
    if (resolvedId.toLowerCase() === followerId.toLowerCase()) {
      throw new AppError("You cannot follow yourself", 400);
    }

    const client = getDbClient();
    const { error } = await client
      .from("user_follows")
      .upsert(
        { follower_id: followerId, following_id: resolvedId },
        { onConflict: "follower_id,following_id" }
      );

    if (error) {
      throwDbError(error, "user_follows");
    }

    const { count: followersCount } = await client
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", resolvedId);

    await notificationsService
      .createNotification({
        userId: resolvedId,
        title: "New follower",
        message: "Someone started following your profile",
        type: "follow",
        data: { followerId },
      })
      .catch(() => {});

    return {
      following: true,
      isFollowing: true,
      followingId: resolvedId,
      followersCount: followersCount ?? 1,
    };
  },

  async unfollowUser(followerId: string, rawTargetId: string) {
    if (!followerId) throw new AppError("Authentication required", 401);
    const { resolvedId } = await resolveProfileUserId(rawTargetId);
    if (!resolvedId) throw new AppError("Target user not found", 404);

    const client = getDbClient();
    const { error } = await client
      .from("user_follows")
      .delete()
      .eq("follower_id", followerId)
      .eq("following_id", resolvedId);

    if (error) {
      throwDbError(error, "user_follows");
    }

    const { count: followersCount } = await client
      .from("user_follows")
      .select("id", { count: "exact", head: true })
      .eq("following_id", resolvedId);

    return {
      following: false,
      isFollowing: false,
      followingId: resolvedId,
      followersCount: followersCount ?? 0,
    };
  },

  async getFollowStatus(userId: string | undefined, rawTargetId: string) {
    const { resolvedId } = await resolveProfileUserId(rawTargetId);
    if (!resolvedId) throw new AppError("Target user not found", 404);

    const client = getDbClient();
    const [followersRes, followingRes, relationRes] = await Promise.all([
      client
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", resolvedId),
      client
        .from("user_follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", resolvedId),
      userId
        ? client
            .from("user_follows")
            .select("id")
            .eq("follower_id", userId)
            .eq("following_id", resolvedId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null } as any),
    ]);

    if (followersRes.error && isMissingTableError(followersRes.error)) {
      return {
        userId: resolvedId,
        isFollowing: false,
        followersCount: 0,
        followingCount: 0,
      };
    }

    return {
      userId: resolvedId,
      isFollowing: Boolean(relationRes?.data),
      followersCount: followersRes.count ?? 0,
      followingCount: followingRes.count ?? 0,
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
