const BASE = "https://www.googleapis.com/youtube/v3";

export type YoutubeJson = {
  error?: { code?: number; message?: string; errors?: { reason?: string }[] };
  items?: unknown[];
  nextPageToken?: string;
  prevPageToken?: string;
};

/** YouTube Data API v3 con OAuth del usuario (sin API key). */
export async function youtubeGetBearer(
  accessToken: string,
  endpoint: string,
  params: Record<string, string | undefined>,
): Promise<{ ok: boolean; status: number; json: YoutubeJson }> {
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, v);
  }
  const url = `${BASE}/${endpoint}?${usp.toString()}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as YoutubeJson;
  return { ok: res.ok, status: res.status, json };
}

/** YouTube Data API v3 con API key del proyecto (modo invitado). */
export async function youtubeGetApiKey(
  apiKey: string,
  endpoint: string,
  params: Record<string, string | undefined>,
): Promise<{ ok: boolean; status: number; json: YoutubeJson }> {
  const usp = new URLSearchParams({ key: apiKey });
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, v);
  }
  const url = `${BASE}/${endpoint}?${usp.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as YoutubeJson;
  return { ok: res.ok, status: res.status, json };
}

export function isQuotaExceeded(json: YoutubeJson): boolean {
  const reason = json.error?.errors?.[0]?.reason;
  return reason === "quotaExceeded" || json.error?.code === 403;
}
