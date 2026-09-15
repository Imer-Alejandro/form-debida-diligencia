import { createPublicClient } from "@/lib/supabase/server";
import { decryptSecret, encryptSecret } from "@/lib/crypto";

const GRAPH = "https://graph.microsoft.com/v1.0";

export const ONEDRIVE_CONFIG_KEY = "onedrive";
const ONEDRIVE_ROOT = "Due Diligence - Sanchez Business Corp";

export interface OneDriveState {
  configured: boolean;
  account: string;
}

export async function readOneDriveState(): Promise<OneDriveState> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("app_config")
    .select("key, value")
    .eq("key", ONEDRIVE_CONFIG_KEY)
    .maybeSingle();
  if (!data) return { configured: false, account: "" };
  try {
    const parsed = JSON.parse(decryptSecret(data.value));
    return { configured: true, account: parsed.account ?? "" };
  } catch {
    return { configured: true, account: "" };
  }
}

async function readRefreshToken(): Promise<string | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", ONEDRIVE_CONFIG_KEY)
    .maybeSingle();
  if (error || !data) return null;
  try {
    const parsed = JSON.parse(decryptSecret(data.value));
    return parsed.refreshToken ?? null;
  } catch {
    return null;
  }
}

/** Stores a rotated refresh token back in the DB (only possible if the caller
 *  can prove it knows the current encrypted value). */
export async function rotateStoredToken(newEncrypted: string): Promise<boolean> {
  const supabase = createPublicClient();
  const { data: cur } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", ONEDRIVE_CONFIG_KEY)
    .maybeSingle();
  const { data } = await supabase.rpc("rotate_config", {
    p_key: ONEDRIVE_CONFIG_KEY,
    p_old_value: cur?.value ?? "",
    p_new_value: newEncrypted,
  });
  return data === true;
}

export function buildEncryptedConfig(
  refreshToken: string,
  account: string
): string {
  return encryptSecret(JSON.stringify({ refreshToken, account }));
}

const CLIENT_ID = () => process.env.ONEDRIVE_CLIENT_ID ?? "";
const TENANT = () => process.env.ONEDRIVE_TENANT_ID ?? "common";
const SCOPE = "Files.ReadWrite.All offline_access";

export function authUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const redirect = `${base}/api/onedrive/callback`;
  const params = new URLSearchParams({
    client_id: CLIENT_ID(),
    response_type: "code",
    redirect_uri: redirect,
    response_mode: "query",
    scope: SCOPE,
    state: "csb-due-diligence",
    prompt: "consent",
  });
  return `https://login.microsoftonline.com/${TENANT()}/oauth2/v2.0/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  account: string;
}> {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  const body = new URLSearchParams({
    client_id: CLIENT_ID(),
    grant_type: "authorization_code",
    code,
    redirect_uri: `${base}/api/onedrive/callback`,
    scope: SCOPE,
  });
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT()}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description ?? json.error ?? "OAuth error");
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    account: json.email ?? json.unique_name ?? "Cuenta de OneDrive",
  };
}

async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    client_id: CLIENT_ID(),
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    scope: SCOPE,
  });
  // tenant for work accounts may already be part of the token grant; using an explicit tenant
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT()}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description ?? json.error ?? "Token error");
  return {
    accessToken: json.access_token as string,
    refreshToken: (json.refresh_token ?? refreshToken) as string,
  };
}

/** Public entry point used by the upload route: gets a fresh access token and
 *  persists a rotated refresh token if Microsoft issued a new one. */
export async function getAccessToken(): Promise<string> {
  const refresh = await readRefreshToken();
  if (!refresh) throw new OneDriveNotConfiguredError();
  const { accessToken, refreshToken } = await refreshAccessToken(refresh);
  // Persist rotation if it changed (the caller can prove knowledge of the
  // current encrypted value, so this is safe from anon callers).
  try {
    const state = await readOneDriveState();
    await rotateStoredToken(buildEncryptedConfig(refreshToken, state.account));
  } catch {
    // Rotation is best effort; the existing token may still work.
  }
  return accessToken;
}

export class OneDriveNotConfiguredError extends Error {
  constructor() {
    super("OneDrive not configured");
    this.name = "OneDriveNotConfiguredError";
  }
}

export function folderPath(registrationId: string): string {
  return `${ONEDRIVE_ROOT}/${registrationId}`;
}

export function filePath(registrationId: string, ref: string, fileName: string): string {
  const safe = fileName.replace(/[<>:"/\\|?*]/g, "_").replace(/\s+/g, " ");
  return `${folderPath(registrationId)}/${ref}_${safe}`;
}

export interface UploadSession {
  uploadUrl: string;
  expirationDateTime: string;
}

export async function createUploadSession(
  accessToken: string,
  path: string
): Promise<UploadSession> {
  const res = await fetch(
    `${GRAPH}/me/drive/root:/${path}:/createUploadSession`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        item: { "@microsoft.graph.conflictBehavior": "fail" },
      }),
    }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Upload session error");
  return {
    uploadUrl: json.uploadUrl as string,
    expirationDateTime: json.expirationDateTime as string,
  };
}

export async function getItemIdByPath(
  accessToken: string,
  path: string
): Promise<string> {
  const res = await fetch(`${GRAPH}/me/drive/root:/${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? "Item lookup error");
  return json.id as string;
}

export async function createShareLink(
  accessToken: string,
  itemId: string
): Promise<string> {
  const res = await fetch(`${GRAPH}/me/drive/items/${itemId}/createLink`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "view", scope: "business" }),
  });
  const json = await res.json();
  if (!res.ok) {
    if ((json.error?.code ?? "") === "organizationScopePermissionMisconfigured") {
      const res2 = await fetch(`${GRAPH}/me/drive/items/${itemId}/createLink`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ type: "view", scope: "users" }),
      });
      const json2 = await res2.json();
      if (!res2.ok) throw new Error(json2.error?.message ?? "Share link error");
      return json2.link.webUrl as string;
    }
    throw new Error(json.error?.message ?? "Share link error");
  }
  return json.link.webUrl as string;
}

export async function deleteFile(
  accessToken: string,
  itemId: string
): Promise<void> {
  const res = await fetch(`${GRAPH}/me/drive/items/${itemId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Delete failed");
}