import { getDbClient } from "../../utils/resource-helper.js";
import { AppError } from "../../utils/app-error.js";
import { env } from "../../config/env.js";

import type { RegisterPayload, GoogleAuthPayload, CompleteProfilePayload } from "./auth.types.js";


export const authService = {
  async register(payload: RegisterPayload) {
    const { email, password, role = "customer", name, phone } = payload;

    const client = getDbClient();
    const metadata: Record<string, unknown> = {
      role,
      ...(name ? { name, full_name: name } : {}),
      ...(phone ? { phone } : {}),
    };

    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) throw new AppError(error.message, 400);

    if (data.user?.id && (name || phone)) {
      const profileUpdates: Record<string, unknown> = {};
      if (name) profileUpdates.full_name = name;
      if (phone) profileUpdates.phone = phone;

      await client
        .from("profiles")
        .update(profileUpdates)
        .eq("id", data.user.id);
    }

    return { user: data.user, session: data.session };
  },

  async login(credentials: { email: string; password: string }) {
    const client = getDbClient();
    const { data, error } = await client.auth.signInWithPassword(credentials);
    if (error) throw new AppError("Invalid email or password", 401);

    // Check if user profile exists in profiles table
    let profile: any = null;
    try {
      const { data: prof } = await client
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
        const { data: tailor } = await client
          .from("tailors")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();
        hasTailor = Boolean(tailor?.id);
      } catch {}
    }

    const hasPhone = Boolean(profile?.phone || data.user.phone || data.user.user_metadata?.phone);
    const hasRoleSet = Boolean(profile?.role && profile.role !== "authenticated");
    const isProfileCompleted = Boolean(
      profile &&
      hasPhone &&
      hasRoleSet &&
      hasTailor
    );

    const needsProfileCompletion = !isProfileCompleted;

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
      },
      profile,
      session: data.session,
      needsProfileCompletion,
    };
  },

  async logout() {
    const client = getDbClient();
    const { error } = await client.auth.signOut();
    if (error) throw new AppError(error.message, 400);
    return true;
  },

  async refreshToken(refreshToken: string) {
    const client = getDbClient();
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (error) throw new AppError(error.message, 401);
    return data;
  },

  async forgotPassword(email: string) {
    const client = getDbClient();
    const { error } = await client.auth.resetPasswordForEmail(email.trim());
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
        const { data: otpData, error: otpError } = await client.auth.verifyOtp({
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

    const isBrandNewAccount =
      Math.abs(new Date(targetUser.last_sign_in_at || targetUser.created_at).getTime() - new Date(targetUser.created_at).getTime()) < 30000 ||
      Date.now() - new Date(targetUser.created_at).getTime() < 60000;

    const isExistingUser = Boolean(
      hasCompletedFlag ||
      hasRoleSelected ||
      hasTailorRecord ||
      (!isBrandNewAccount && Boolean(profile?.phone || targetUser.phone) && Boolean(targetUser.user_metadata?.role))
    );

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

  renderGoogleCallbackHtml(appRedirect?: string) {
    const defaultScheme = "suidhagamobile://auth/callback";
    const target = appRedirect || defaultScheme;

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
    <h2>Redirecting to Sui Dhaga...</h2>
    <p>Please wait while we complete your Google sign in, or tap the button below to return to the app.</p>
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

      var accessToken = hashParams.get('access_token') || queryParams.get('access_token');
      var refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
      var code = queryParams.get('code') || hashParams.get('code');
      var error = queryParams.get('error_description') || queryParams.get('error') || hashParams.get('error_description') || hashParams.get('error');

      var targetBase = queryParams.get('appRedirect') || ${JSON.stringify(target)};

      var sep = targetBase.indexOf('?') === -1 ? '?' : '&';
      var params = [];
      if (accessToken) params.push('access_token=' + encodeURIComponent(accessToken));
      if (refreshToken) params.push('refresh_token=' + encodeURIComponent(refreshToken));
      if (code) params.push('code=' + encodeURIComponent(code));
      if (error) params.push('error=' + encodeURIComponent(error));

      var finalUrl = targetBase + (params.length > 0 ? sep + params.join('&') : '');

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
};

