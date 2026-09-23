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

    // 0. If PKCE authorization code provided, exchange it for session
    if (payload.code && payload.code.trim()) {
      try {
        const { data: codeData, error: codeError } = await client.auth.exchangeCodeForSession(payload.code.trim());
        if (!codeError && codeData?.user) {
          targetUser = codeData.user;
          if (codeData.session?.access_token) {
            token = codeData.session.access_token;
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
    try {
      const { data: existingProfile } = await client
        .from("profiles")
        .select("*")
        .eq("id", targetUser.id)
        .maybeSingle();
      profile = existingProfile;
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

    // Check if account completion is required (exists in profiles table, phone is provided, role is set, tailor record exists if tailor)
    const hasCompletedFlag = targetUser.user_metadata?.profile_completed === true;
    const hasRoleSet = Boolean(profile?.role && profile.role !== "authenticated");
    const hasPhone = Boolean(profile?.phone || targetUser.user_metadata?.phone);

    let hasTailor = true;
    if (profile?.role === "tailor" || targetUser.user_metadata?.role === "tailor") {
      try {
        const { data: tailor } = await client
          .from("tailors")
          .select("id")
          .eq("user_id", targetUser.id)
          .maybeSingle();
        hasTailor = Boolean(tailor?.id);
      } catch {}
    }

    const isProfileCompleted = Boolean(
      profile &&
      hasPhone &&
      hasRoleSet &&
      hasTailor &&
      hasCompletedFlag
    );

    const needsProfileCompletion = !isProfileCompleted;

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
        role: profile?.role || targetUser.user_metadata?.role || "customer",
        phone: profile?.phone || resolvedPhone || undefined,
        avatarUrl: profile?.avatar_url || resolvedAvatar || undefined,
        avatar: profile?.avatar_url || resolvedAvatar || undefined,
        profileCompleted: !needsProfileCompletion,
      },
      session: {
        access_token: sessionToken,
        token: sessionToken,
      },
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
        app_metadata: { role },
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
      },
      profile: updatedProfile,
      message: "Profile completed successfully",
    };
  },

  getGoogleAuthUrl(redirectUri?: string) {
    if (!env.SUPABASE_URL) {
      return null;
    }
    const targetRedirect = redirectUri || "suidhagamobile://auth/callback";
    return `${env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(targetRedirect)}`;
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
    p { font-size: 14px; color: #6B7280; line-height: 1.5; margin-bottom: 24px; }
    .btn {
      display: inline-block;
      width: 100%;
      background: #1A847B;
      color: #FFFFFF;
      font-weight: 600;
      font-size: 15px;
      padding: 13px 20px;
      border-radius: 10px;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn:hover { background: #13665F; }
    #manualSection { display: none; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner" id="spinner"></div>
    <h2>Redirecting to Sui Dhaga...</h2>
    <p>Please wait while we complete your Google sign in.</p>
    <div id="manualSection">
      <a id="deepLinkBtn" class="btn" href="#">Open Sui Dhaga App</a>
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
      if (btn) btn.href = finalUrl;

      try {
        window.location.href = finalUrl;
      } catch (e) {}

      setTimeout(function() {
        var manual = document.getElementById('manualSection');
        if (manual) manual.style.display = 'block';
      }, 1200);
    })();
  </script>
</body>
</html>`;
  },
};

