import { getDbClient } from "../../utils/resource-helper.js";
import type { AppVersionResponse } from "./app-version.types.js";

/**
 * Compare two semver strings: returns -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parse = (v: string) =>
    v
      .replace(/^v/i, "")
      .trim()
      .split(".")
      .map((part) => parseInt(part, 10) || 0);

  const parts1 = parse(v1);
  const parts2 = parse(v2);
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] ?? 0;
    const num2 = parts2[i] ?? 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export const appVersionService = {
  /**
   * Fetch the latest active version config for the requested platform.
   * Gracefully falls back to default values if database table is not yet set up.
   */
  async getLatestVersion(platform = "android", clientVersion?: string): Promise<AppVersionResponse> {
    const normalizedPlatform = platform.toLowerCase();

    try {
      const client = getDbClient();
      const { data, error } = await client
        .from("app_versions")
        .select("*")
        .eq("is_active", true)
        .or(`platform.eq.${normalizedPlatform},platform.eq.all`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const latestVersion = data.latest_version;
        const minVersion = data.min_version;
        const forceUpdate = Boolean(data.force_update);

        let isUpdateAvailable = false;
        let isMandatory = false;

        if (clientVersion) {
          isUpdateAvailable = compareVersions(clientVersion, latestVersion) < 0;
          isMandatory = forceUpdate || compareVersions(clientVersion, minVersion) < 0;
        }

        return {
          platform: data.platform,
          latestVersion,
          minVersion,
          downloadUrl: data.download_url,
          releaseNotes: data.release_notes ?? "",
          forceUpdate,
          isUpdateAvailable,
          isMandatory,
        };
      }
    } catch (err) {
      console.warn("[AppVersionService] Could not read app_versions table, using fallback:", err);
    }

    // Default fallback in case the database table is empty or pending migration
    const defaultLatest = "1.0.0";
    const defaultMin = "1.0.0";
    return {
      platform: normalizedPlatform,
      latestVersion: defaultLatest,
      minVersion: defaultMin,
      downloadUrl: "https://github.com/your-org/sui-dhaga/releases/latest",
      releaseNotes: "Performance improvements and bug fixes.",
      forceUpdate: false,
      isUpdateAvailable: clientVersion ? compareVersions(clientVersion, defaultLatest) < 0 : false,
      isMandatory: clientVersion ? compareVersions(clientVersion, defaultMin) < 0 : false,
    };
  },
};
