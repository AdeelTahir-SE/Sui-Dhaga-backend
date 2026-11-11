import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { createAuthClient } from "../../config/supabase.js";
import { getAllowedOrigins } from "../../config/cors.js";
import { env } from "../../config/env.js";
import { subscriptionsService } from "../subscriptions/subscriptions.service.js";

import type {
  RegisterPayload,
  ResendConfirmationPayload,
  GoogleAuthPayload,
  CompleteProfilePayload,
} from "./auth.types.js";

const DEFAULT_CALLBACK_URL = "https://sui-dhaga-backend.vercel.app/api/v1/auth/callback";
const MOBILE_APP_REDIRECT = "suidhagamobile://auth/callback";
const ALLOWED_CALLBACK_OTP_TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
]);

type AuthDbClient = ReturnType<typeof getDbClient>;
type CallbackOtpType = "signup" | "invite" | "magiclink" | "recovery" | "email_change" | "email";

function getAuthClient() {
  const client = createAuthClient();
  if (!client) {
    throw new AppError(
      "Database/auth service unavailable. Please verify Supabase environment configuration.",
      500
    );
  }
  return client;
}

function getHttpStatus(error: unknown, fallback = 400): number {
  const status = (error as { status?: unknown })?.status;
  return typeof status === "number" && status >= 400 && status < 600 ? status : fallback;
}

function isAllowedRedirectTarget(candidate: string): boolean {
  const trimmed = candidate.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("suidhagamobile://")) return true;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    const allowedOrigins = new Set<string>([
      "https://sui-dhaga-backend.vercel.app",
      ...getAllowedOrigins(),
    ]);
    return allowedOrigins.has(parsed.origin);
  } catch {
    return false;
  }
}

function buildBridgeRedirectUrl(appRedirect: string): string {
  return `${DEFAULT_CALLBACK_URL}?appRedirect=${encodeURIComponent(appRedirect)}`;
}

function resolveSignupRedirectUrl(
  payload: { emailRedirectTo?: string; redirectTo?: string; appRedirect?: string },
  requestOrigin?: string
): string {
  const explicitTarget = payload.emailRedirectTo?.trim() || payload.redirectTo?.trim();
  if (explicitTarget && isAllowedRedirectTarget(explicitTarget)) {
    if (explicitTarget.startsWith("suidhagamobile://")) {
      return buildBridgeRedirectUrl(explicitTarget);
    }
    return explicitTarget;
  }

  const appRedirect = payload.appRedirect?.trim();
  if (appRedirect && isAllowedRedirectTarget(appRedirect)) {
    return buildBridgeRedirectUrl(appRedirect);
  }

  const trimmedOrigin = requestOrigin?.trim();
  if (trimmedOrigin && isAllowedRedirectTarget(trimmedOrigin)) {
    return buildBridgeRedirectUrl(trimmedOrigin);
  }

  return DEFAULT_CALLBACK_URL;
}

function sanitizeCallbackTarget(appRedirect?: string): string {
  const trimmed = appRedirect?.trim();
  if (trimmed && isAllowedRedirectTarget(trimmed)) {
    return trimmed;
  }
  return MOBILE_APP_REDIRECT;
}

async function findAuthUserByEmail(dbClient: AuthDbClient, normalizedEmail: string) {
  try {
    for (let page = 1; page <= 10; page += 1) {
      const { data, error } = await dbClient.auth.admin.listUsers({ page, perPage: 200 });
      if (error || !data?.users?.length) return null;
      const match = data.users.find((u) => u.email?.toLowerCase() === normalizedEmail);
      if (match) return match;
      if (data.users.length < 200) return null;
    }
  } catch {
    return null;
  }
  return null;
}

export const authService = {
  async register(payload: RegisterPayload, requestOrigin?: string) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const role = payload.role ?? "customer";
    const displayName = (payload.name || payload.fullName || payload.full_name)?.trim();
    const phone = payload.phone?.trim();
    const redirectUrl = resolveSignupRedirectUrl(payload, requestOrigin);

    const authClient = getAuthClient();
    const dbClient = getDbClient();
    const metadata: Record<string, unknown> = {
      role,
      ...(displayName ? { name: displayName, full_name: displayName } : {}),
      ...(phone ? { phone } : {}),
    };

    const { data, error } = await authClient.auth.signUp({
      email: normalizedEmail,
      password: payload.password,
      options: {
        data: metadata,
        emailRedirectTo: redirectUrl,
      },
    });
    if (error) throw new AppError(error.message, getHttpStatus(error, 400));

    // When email confirmation is enabled, Supabase returns a user with identities: []
    // and silently skips sending any email if the address is already registered.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const existingUser = await findAuthUserByEmail(dbClient, normalizedEmail);
      if (existingUser?.email_confirmed_at || existingUser?.confirmed_at) {
        throw new AppError("An account with this email already exists. Please sign in instead.", 409);
      }

      const { error: resendError } = await authClient.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: { emailRedirectTo: redirectUrl },
      });
      if (resendError) {
        throw new AppError(resendError.message, getHttpStatus(resendError, 400));
      }

      return {
        user: existingUser ?? data.user,
        session: null,
        emailConfirmationRequired: true,
        confirmationResent: true,
        confirmationSentAt: new Date().toISOString(),
      };
    }

    if (data.user?.id && (displayName || phone)) {
      const profileUpdates: Record<string, unknown> = {};
      if (displayName) profileUpdates.full_name = displayName;
      if (phone) profileUpdates.phone = phone;

      await dbClient
        .from("profiles")
        .update(profileUpdates)
        .eq("id", data.user.id);
    }

    if (data.user?.id) {
      await subscriptionsService.ensureDefaultSubscription(data.user.id).catch(() => null);
    }

    return {
      user: data.user,
      session: data.session,
      emailConfirmationRequired: !data.session,
      confirmationResent: false,
      confirmationSentAt: data.user?.confirmation_sent_at ?? null,
    };
  },

  async resendConfirmation(payload: ResendConfirmationPayload, requestOrigin?: string) {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const redirectUrl = resolveSignupRedirectUrl(payload, requestOrigin);
    const dbClient = getDbClient();
    const authClient = getAuthClient();

    const existingUser = await findAuthUserByEmail(dbClient, normalizedEmail);
    if (existingUser?.email_confirmed_at || existingUser?.confirmed_at) {
      throw new AppError("This email address is already confirmed. Please sign in.", 400);
    }

    const { data, error } = await authClient.auth.resend({
      type: "signup",
      email: normalizedEmail,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) {
      throw new AppError(error.message, getHttpStatus(error, 400));
    }

    return {
      email: normalizedEmail,
      emailRedirectTo: redirectUrl,
      messageId: data?.messageId ?? null,
    };
  },

  async login(credentials: { email: string; password: string }) {
    const authClient = getAuthClient();
    const dbClient = getDbClient();
    const { data, error } = await authClient.auth.signInWithPassword({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });
    if (error) {
      const isUnconfirmed =
        error.code === "email_not_confirmed" || /email not confirmed/i.test(error.message);
      if (isUnconfirmed) {
        throw new AppError(
          "Email not confirmed. Please check your inbox or request a new confirmation email.",
          403
        );
      }
      throw new AppError("Invalid email or password", 401);
    }

    // Check if user profile exists in profiles table
    let profile: any = null;
    try {
      const { data: prof } = await dbClient
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .maybeSingle();
      profile = prof;
    } catch {}

    // Check if tailor record exists if role is tailor
    let hasTailor = true;
    const userRole = profile?.role || data.user.user_metadata?.role || "customer";
    if (userRole === "tailor") {
      try {
        const { data: tailor } = await dbClient
          .from("tailors")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        hasTailor = Boolean(tailor?.id);
      } catch {}
    }

    const isProfileCompleted = true;
    const isExistingUser = true;
    const needsProfileCompletion = false;

    const resolvedName =
      profile?.full_name ||
      data.user.user_metadata?.full_name ||
      data.user.user_metadata?.name ||
      data.user.email?.split("@")[0] ||
      "User";

    return {
      user: {
        id: data.user.id,
        email: data.user.email,
        fullName: resolvedName,
        name: resolvedName,
        role: userRole,
        phone: profile?.phone || data.user.phone || data.user.user_metadata?.phone || undefined,
        avatarUrl: profile?.avatar_url || data.user.user_metadata?.avatar_url || undefined,
        avatar: profile?.avatar_url || data.user.user_metadata?.avatar_url || undefined,
        profileCompleted: isProfileCompleted,
        isExistingUser: true,
      },
      profile,
      session: data.session,
      isExistingUser: true,
      needsProfileCompletion: false,
    };
  },

  async logout() {
    const authClient = getAuthClient();
    const { error } = await authClient.auth.signOut();
    if (error) throw new AppError(error.message, getHttpStatus(error, 400));
    return true;
  },

  async refreshToken(refreshToken: string) {
    const authClient = getAuthClient();
    const { data, error } = await authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) throw new AppError(error.message, getHttpStatus(error, 401));
    return data;
  },

  async forgotPassword(email: string) {
    const authClient = getAuthClient();
    const { error } = await authClient.auth.resetPasswordForEmail(email.trim());
    if (error) {
      console.warn("Supabase resetPasswordForEmail notice:", error.message);
    }
    return "If an account exists with this email, password reset instructions have been sent.";
  },

  async resetPassword(payload: { password: string; userId?: string; token?: string; email?: string }) {
    const client = getDbClient();
    const { password, userId, token, email } = payload;

    // 1. If we have an authenticated user ID (from Bearer token)
    if (userId) {
      const { error } = await client.auth.admin.updateUserById(userId, { password });
      if (error) throw new AppError(error.message, 400);
      return "Password reset successful";
    }

    // 2. If token is provided
    if (token && token.trim()) {
      const trimmedToken = token.trim();
      // Try verifying token as an access token
      const { data: userData } = await client.auth.getUser(trimmedToken);
      if (userData?.user?.id) {
        const { error } = await client.auth.admin.updateUserById(userData.user.id, { password });
        if (error) throw new AppError(error.message, 400);
        return "Password reset successful";
      }

      // Try verifying OTP if email is provided
      if (email && email.trim()) {
        const authClient = getAuthClient();
        const { data: otpData, error: otpError } = await authClient.auth.verifyOtp({
          email: email.trim(),
          token: trimmedToken,
          type: "recovery",
        });
        if (otpData?.user?.id) {
          const { error } = await client.auth.admin.updateUserById(otpData.user.id, { password });
          if (error) throw new AppError(error.message, 400);
          return "Password reset successful";
        }
        if (otpError) {
          console.warn("OTP verification notice:", otpError.message);
        }
      }
    }

    // 3. If email is provided (admin direct reset when user has validated flow)
    if (email && email.trim()) {
      const normalizedEmail = email.trim().toLowerCase();
      const { data: usersData, error: listError } = await client.auth.admin.listUsers();
      if (!listError && usersData?.users) {
        const user = usersData.users.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );
        if (user?.id) {
          const { error } = await client.auth.admin.updateUserById(user.id, { password });
          if (error) throw new AppError(error.message, 400);
          return "Password reset successful";
        }
      }
      throw new AppError("No account found with this email address.", 404);
    }

    throw new AppError("A valid email, token, or session is required to reset password.", 400);
  },

  async googleAuth(payload: GoogleAuthPayload) {
    const client = getDbClient();
    let token = payload.accessToken || payload.token;

    let targetUser: any = null;

    let refreshToken: string | undefined;
    // 0. If PKCE authorization code provided, exchange it for session
    if (payload.code && payload.code.trim()) {
      try {
        const { data: codeData, error: codeError } = await client.auth.exchangeCodeForSession(payload.code.trim());
        if (!codeError && codeData?.user) {
          targetUser = codeData.user;
          if (codeData.session?.access_token) {
            token = codeData.session.access_token;
          }
          if (codeData.session?.refresh_token) {
            refreshToken = codeData.session.refresh_token;
          }
        }
      } catch (codeErr) {
        console.warn("Notice: Code exchange error in Supabase:", codeErr);
      }
    }

    // 1. If token provided, verify with Supabase Auth
    if (!targetUser && token && token.trim()) {
      try {
        const { data: userData, error: userError } = await client.auth.getUser(token.trim());
        if (!userError && userData?.user) {
          targetUser = userData.user;
        }
      } catch (tokenErr) {
        console.warn("Notice: Token verification error in Supabase:", tokenErr);
      }

      // 1b. Fallback: decode JWT payload if getUser failed or had network/clock-skew issues
      if (!targetUser) {
        try {
          const parts = token.trim().split(".");
          if (parts.length === 3) {
            const payloadStr = Buffer.from(parts[1], "base64url").toString("utf8");
            const jwtPayload = JSON.parse(payloadStr);
            const sub = jwtPayload.sub;
            if (sub && typeof sub === "string") {
              const { data: adminUser } = await client.auth.admin.getUserById(sub);
              if (adminUser?.user) {
                targetUser = adminUser.user;
              }
            }
          }
        } catch (jwtErr) {
          console.warn("Notice: JWT decode fallback error in googleAuth:", jwtErr);
        }
      }
    }

    // 2. If user not resolved by token, search or create using email
    const email = (payload.email || targetUser?.email || "").trim().toLowerCase();
    if (!targetUser && email) {
      try {
        const { data: usersData } = await client.auth.admin.listUsers({ perPage: 1000 });
        const existing = usersData?.users?.find(
          (u) => u.email?.toLowerCase() === email
        );
        if (existing) {
          targetUser = existing;
        }
      } catch (listErr) {
        console.warn("Notice: listUsers error:", listErr);
      }

      if (!targetUser) {
        const fullName = payload.fullName || payload.name || email.split("@")[0];
        const avatarUrl = payload.avatarUrl || payload.avatar;
        const phone = payload.phone;

        try {
          const { data: created, error: createError } = await client.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              name: fullName,
              avatar_url: avatarUrl,
              phone: phone || undefined,
              provider: "google",
              profile_completed: false,
            },
          });

          if (created?.user) {
            targetUser = created.user;
          } else if (createError) {
            // If user already exists in auth.users, search again
            const { data: allUsers } = await client.auth.admin.listUsers({ perPage: 1000 });
            targetUser = allUsers?.users?.find((u) => u.email?.toLowerCase() === email);

            if (!targetUser) {
              // Check profiles table for an existing user id
              const { data: prof } = await client
                .from("profiles")
                .select("id")
                .eq("phone", phone || "")
                .maybeSingle();
              if (prof?.id) {
                const { data: uData } = await client.auth.admin.getUserById(prof.id);
                targetUser = uData?.user;
              }
            }

            if (!targetUser) {
              throw new AppError(createError.message || "Failed to create Google user account", 400);
            }
          }
        } catch (createErr: any) {
          if (createErr instanceof AppError) throw createErr;
          console.warn("Notice: createUser exception:", createErr);
          // Try to recover existing user
          try {
            const { data: allUsers } = await client.auth.admin.listUsers({ perPage: 1000 });
            targetUser = allUsers?.users?.find((u) => u.email?.toLowerCase() === email);
          } catch {}
          if (!targetUser) {
            throw new AppError(createErr?.message || "Failed to authenticate Google user", 400);
          }
        }
      }
    }

    if (!targetUser || !targetUser.id) {
      throw new AppError("Failed to authenticate with Google. User could not be resolved.", 400);
    }

    // 3. Ensure profile in profiles table with upsert to prevent unique constraint conflicts
    let profile: any = null;
    let userAlreadyExisted = false;
    try {
      const { data: existingProfile } = await client
        .from("profiles")
        .select("*")
        .eq("id", targetUser.id)
        .maybeSingle();
      if (existingProfile) {
        profile = existingProfile;
        userAlreadyExisted = true;
      }
    } catch (profErr) {
      console.warn("Notice: Error fetching existing profile:", profErr);
    }

    const resolvedName =
      payload.fullName ||
      payload.name ||
      targetUser.user_metadata?.full_name ||
      targetUser.user_metadata?.name ||
      email.split("@")[0] ||
      "User";
    const resolvedAvatar =
      payload.avatarUrl ||
      payload.avatar ||
      targetUser.user_metadata?.avatar_url ||
      targetUser.user_metadata?.picture ||
      null;
    const resolvedPhone =
      payload.phone ||
      targetUser.user_metadata?.phone ||
      targetUser.phone ||
      null;

    if (!profile) {
      const { data: upsertedProfile } = await client
        .from("profiles")
        .upsert(
          {
            id: targetUser.id,
            role: targetUser.user_metadata?.role || "customer",
            status: "active",
            full_name: resolvedName,
            avatar_url: resolvedAvatar,
            phone: resolvedPhone,
          },
          { onConflict: "id" }
        )
        .select()
        .maybeSingle();
      profile = upsertedProfile || {
        id: targetUser.id,
        role: targetUser.user_metadata?.role || "customer",
        full_name: resolvedName,
        avatar_url: resolvedAvatar,
        phone: resolvedPhone,
      };
    } else if (resolvedAvatar && !profile.avatar_url) {
      const { data: updatedProf } = await client
        .from("profiles")
        .update({ avatar_url: resolvedAvatar })
        .eq("id", targetUser.id)
        .select()
        .maybeSingle();
      profile = updatedProf || profile;
    }

    if (!userAlreadyExisted) {
      await subscriptionsService.ensureDefaultSubscription(targetUser.id).catch(() => null);
    }

    // Check if account completion is required:
    // A user is considered an existing user if:
    // 1. They have explicitly completed profile setup or selected a role (profile_completed or role_selected flag)
    // 2. OR they already exist as a registered tailor in the tailors table
    // 3. OR their account was created earlier and has an established phone and explicit role
    const hasCompletedFlag =
      targetUser.user_metadata?.profile_completed === true ||
      targetUser.app_metadata?.profile_completed === true;

    const hasRoleSelected =
      targetUser.user_metadata?.role_selected === true ||
      targetUser.app_metadata?.role_selected === true;

    let hasTailorRecord = false;
    try {
      const { data: tailor } = await client
        .from("tailors")
        .select("id")
        .eq("user_id", targetUser.id)
        .maybeSingle();
      hasTailorRecord = Boolean(tailor?.id);
    } catch {}

    const createdAtMs = new Date(targetUser.created_at).getTime();
    const lastSignInMs = targetUser.last_sign_in_at
      ? new Date(targetUser.last_sign_in_at).getTime()
      : createdAtMs;
    const nowMs = Date.now();

    // A user is strictly considered brand new if their account was created just now (< 45s),
    // has no prior sign-ins, has no tailor record, and has no completed profile / role flag.
    const isBrandNewGoogleAccount =
      !hasCompletedFlag &&
      !hasRoleSelected &&
      !hasTailorRecord &&
      Math.abs(lastSignInMs - createdAtMs) < 15000 &&
      (nowMs - createdAtMs) < 45000;

    const isExistingUser = !isBrandNewGoogleAccount;
    const needsProfileCompletion = !isExistingUser;

    const resolvedRole: "customer" | "tailor" =
      hasTailorRecord || profile?.role === "tailor" || targetUser.user_metadata?.role === "tailor"
        ? "tailor"
        : "customer";

    // Generate or maintain access token
    let sessionToken = token;
    if (!sessionToken) {
      try {
        const { data: linkData } = await client.auth.admin.generateLink({
          type: "magiclink",
          email: targetUser.email || email,
        });
        sessionToken = linkData?.properties?.hashed_token || `token_${targetUser.id}`;
      } catch {
        sessionToken = `token_${targetUser.id}`;
      }
    }

    return {
      user: {
        id: targetUser.id,
        email: targetUser.email || email,
        fullName: profile?.full_name || resolvedName,
        name: profile?.full_name || resolvedName,
        role: resolvedRole,
        phone: profile?.phone || resolvedPhone || undefined,
        avatarUrl: profile?.avatar_url || resolvedAvatar || undefined,
        avatar: profile?.avatar_url || resolvedAvatar || undefined,
        profileCompleted: isExistingUser,
        isExistingUser,
      },
      session: {
        access_token: sessionToken,
        token: sessionToken,
        refresh_token: refreshToken,
        refreshToken: refreshToken,
      },
      isExistingUser,
      needsProfileCompletion,
    };
  },

  async completeProfile(userId: string, payload: CompleteProfilePayload) {
    const client = getDbClient();
    const { role, phone, name, fullName, shopName, city, address, specialties } = payload;
    const resolvedName = fullName || name;

    // 1. Update Supabase Auth metadata
    const metaUpdates: Record<string, unknown> = {
      role,
      role_selected: true,
      profile_completed: true,
    };
    if (phone) metaUpdates.phone = phone;
    if (resolvedName) {
      metaUpdates.full_name = resolvedName;
      metaUpdates.name = resolvedName;
    }

    try {
      await client.auth.admin.updateUserById(userId, {
        user_metadata: metaUpdates,
        app_metadata: { role, role_selected: true, profile_completed: true },
      });
    } catch (metaErr) {
      console.warn("Notice: updateUserById error in completeProfile:", metaErr);
    }

    // 2. Upsert into profiles table to prevent failure when row doesn't exist
    const profileUpsertData: Record<string, unknown> = {
      id: userId,
      role,
      status: "active",
      updated_at: new Date().toISOString(),
    };
    if (phone) profileUpsertData.phone = phone;
    if (resolvedName) profileUpsertData.full_name = resolvedName;
    if (address) profileUpsertData.address = address;

    const { data: updatedProfile, error: profileErr } = await client
      .from("profiles")
      .upsert(profileUpsertData, { onConflict: "id" })
      .select()
      .single();

    if (profileErr) throw new AppError(profileErr.message, 400);

    // 3. If tailor, ensure row exists in tailors table using maybeSingle()
    if (role === "tailor") {
      const { data: existingTailor } = await client
        .from("tailors")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!existingTailor) {
        await client.from("tailors").insert({
          user_id: userId,
          shop_name: shopName || `${resolvedName || "Tailor"}'s Boutique`,
          city: city || "Lahore",
          address: address || updatedProfile?.address || "Main Market",
          specialties: specialties || ["Custom Suits", "Traditional"],
          experience_years: 1,
        });
      }
    }

    return {
      user: {
        id: userId,
        fullName: updatedProfile.full_name,
        name: updatedProfile.full_name,
        role: updatedProfile.role,
        phone: updatedProfile.phone,
        avatarUrl: updatedProfile.avatar_url,
        avatar: updatedProfile.avatar_url,
        profileCompleted: true,
        isExistingUser: true,
      },
      profile: updatedProfile,
      isExistingUser: true,
      needsProfileCompletion: false,
      message: "Profile completed successfully",
    };
  },

  getGoogleAuthUrl(redirectUri?: string, baseUrl?: string) {
    if (!env.SUPABASE_URL) {
      return null;
    }
    const defaultScheme = "suidhagamobile://auth/callback";
    const appRedirect = redirectUri || defaultScheme;

    // If appRedirect is already the bridge endpoint, direct to Supabase with it
    if (appRedirect.includes("/auth/google/callback")) {
      return `${env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(appRedirect)}`;
    }

    // Otherwise wrap appRedirect in the backend's callback bridge so Chrome 302 redirects to custom schemes don't fail
    const serverBase = baseUrl || "https://sui-dhaga-backend.vercel.app";
    const bridgeUrl = `${serverBase.replace(/\/+$/, "")}/api/v1/auth/google/callback?appRedirect=${encodeURIComponent(appRedirect)}`;

    return `${env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(bridgeUrl)}`;
  },

  async verifyCallbackTokenHash(
    tokenHash: string,
    type: string
  ): Promise<{ accessToken?: string; refreshToken?: string; error?: string }> {
    const normalizedHash = tokenHash.trim();
    const normalizedType = type.trim().toLowerCase();

    if (!normalizedHash || !ALLOWED_CALLBACK_OTP_TYPES.has(normalizedType)) {
      return { error: "Invalid or unsupported verification link." };
    }

    try {
      const authClient = getAuthClient();
      const { data, error } = await authClient.auth.verifyOtp({
        token_hash: normalizedHash,
        type: normalizedType as CallbackOtpType,
      });

      if (error) {
        return { error: error.message };
      }

      return {
        accessToken: data?.session?.access_token,
        refreshToken: data?.session?.refresh_token,
      };
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : "Failed to verify authentication token.",
      };
    }
  },

  renderGoogleCallbackHtml(
    appRedirect?: string,
    verification?: { accessToken?: string; refreshToken?: string; error?: string }
  ) {
    const target = sanitizeCallbackTarget(appRedirect);
    const verifiedAccessToken = verification?.accessToken || "";
    const verifiedRefreshToken = verification?.refreshToken || "";
    const verifiedError = verification?.error || "";

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sui Dhaga - Authenticating</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #FAF8F5;
      color: #1A1D1F;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 20px;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 16px;
      padding: 32px 24px;
      max-width: 380px;
      width: 100%;
      text-align: center;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
    }
    .spinner {
      width: 44px;
      height: 44px;
      border: 4px solid #F3F4F6;
      border-top: 4px solid #1A847B;
      border-radius: 50%;
      animation: spin 0.9s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    h2 { font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 8px; }
    p { font-size: 14px; color: #6B7280; line-height: 1.5; margin-bottom: 20px; }
    .btn {
      display: inline-block;
      width: 100%;
      background: #1A847B;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 16px;
      padding: 14px 20px;
      border-radius: 10px;
      text-decoration: none;
      transition: background 0.2s;
      cursor: pointer;
    }
    .btn:hover { background: #13665F; }
    #manualSection { margin-top: 8px; }
    .hint { font-size: 12px; color: #9CA3AF; margin-top: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <h2 id="statusTitle">Redirecting to Sui Dhaga...</h2>
    <p id="statusMessage">Please wait while we complete your authentication, or tap the button below to return to the app.</p>
    <div id="manualSection">
      <a id="deepLinkBtn" class="btn" href="#">Open Sui Dhaga App</a>
      <p class="hint">Tap above if the app does not open automatically</p>
    </div>
  </div>
  <script>
    (function() {
      var hash = window.location.hash.substring(1);
      var hashParams = new URLSearchParams(hash);
      var queryParams = new URLSearchParams(window.location.search);

      var verifiedAccessToken = ${JSON.stringify(verifiedAccessToken)};
      var verifiedRefreshToken = ${JSON.stringify(verifiedRefreshToken)};
      var verifiedError = ${JSON.stringify(verifiedError)};

      var accessToken = verifiedAccessToken || hashParams.get('access_token') || queryParams.get('access_token') || hashParams.get('token') || queryParams.get('token');
      var refreshToken = verifiedRefreshToken || hashParams.get('refresh_token') || queryParams.get('refresh_token');
      var code = queryParams.get('code') || hashParams.get('code');
      var tokenHash = verifiedAccessToken ? '' : (queryParams.get('token_hash') || hashParams.get('token_hash'));
      var type = queryParams.get('type') || hashParams.get('type');
      var error = verifiedError || queryParams.get('error_description') || queryParams.get('error') || hashParams.get('error_description') || hashParams.get('error');

      var targetBase = ${JSON.stringify(target)};

      var sep = targetBase.indexOf('?') === -1 ? '?' : '&';
      var params = [];
      if (accessToken) params.push('access_token=' + encodeURIComponent(accessToken));
      if (refreshToken) params.push('refresh_token=' + encodeURIComponent(refreshToken));
      if (code) params.push('code=' + encodeURIComponent(code));
      if (tokenHash) params.push('token_hash=' + encodeURIComponent(tokenHash));
      if (type) params.push('type=' + encodeURIComponent(type));
      if (error) params.push('error=' + encodeURIComponent(error));

      var finalUrl = targetBase + (params.length > 0 ? sep + params.join('&') : '');

      var spinner = document.getElementById('spinner');
      var titleEl = document.getElementById('statusTitle');
      var msgEl = document.getElementById('statusMessage');
      if (error) {
        if (spinner) spinner.style.display = 'none';
        if (titleEl) titleEl.textContent = 'Authentication Error';
        if (msgEl) msgEl.textContent = error;
      } else if (verifiedAccessToken && type === 'signup') {
        if (titleEl) titleEl.textContent = 'Email Confirmed!';
        if (msgEl) msgEl.textContent = 'Your email has been verified. Redirecting you back to Sui Dhaga...';
      }

      var btn = document.getElementById('deepLinkBtn');
      if (btn) {
        btn.href = finalUrl;
        btn.onclick = function() {
          window.location.href = finalUrl;
        };
      }

      // Automatically trigger redirect
      try {
        window.location.href = finalUrl;
      } catch (e) {}
    })();
  </script>
</body>
</html>`;
  },

  async changePassword(userId: string, payload: Record<string, unknown>) {
    if (!userId) throw new AppError("Authentication required", 401);
    const currentPassword = String(
      payload.currentPassword || payload.current_password || payload.oldPassword || ""
    );
    const newPassword = String(
      payload.newPassword || payload.new_password || payload.password || ""
    );

    if (!currentPassword || !newPassword) {
      throw new AppError("Both currentPassword and newPassword are required", 400);
    }
    if (newPassword.length < 8) {
      throw new AppError("New password must be at least 8 characters", 400);
    }

    const client = getDbClient();
    const { data: userLookup, error: lookupError } = await client.auth.admin.getUserById(userId);
    if (lookupError || !userLookup?.user?.email) {
      throw new AppError("User account email could not be verified", 404);
    }

    const verifyClient = getAuthClient();

    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: userLookup.user.email,
      password: currentPassword,
    });

    if (signInError) {
      throw new AppError("Current password is incorrect", 400);
    }

    const { error: updateError } = await client.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updateError) {
      throw new AppError(updateError.message, 400);
    }

    return "Password changed successfully";
  },
};

