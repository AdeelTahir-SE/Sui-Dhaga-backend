export interface AppVersionRecord {
  id: string;
  platform: 'android' | 'ios' | 'all';
  latest_version: string;
  min_version: string;
  download_url: string;
  release_notes?: string;
  force_update: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppVersionResponse {
  platform: string;
  latestVersion: string;
  minVersion: string;
  downloadUrl: string;
  releaseNotes?: string;
  forceUpdate: boolean;
  isUpdateAvailable?: boolean;
  isMandatory?: boolean;
}
