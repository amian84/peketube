const BASE = "https://www.googleapis.com/youtube/v3";

export function requireApiKey(): string {
  const k = process.env.YOUTUBE_API_KEY;
  if (!k?.trim()) {
    throw new Error("YOUTUBE_API_KEY is not set");
  }
  return k.trim();
}

export type YoutubeJson = {
  error?: { code?: number; message?: string; errors?: { reason?: string }[] };
  items?: unknown[];
  nextPageToken?: string;
  prevPageToken?: string;
};

export async function youtubeGet(
  endpoint: string,
  params: Record<string, string | undefined>,
): Promise<{ ok: boolean; status: number; json: YoutubeJson }> {
  const key = requireApiKey();
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") usp.set(k, v);
  }
  usp.set("key", key);
  const url = `${BASE}/${endpoint}?${usp.toString()}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = (await res.json()) as YoutubeJson;
  return { ok: res.ok, status: res.status, json };
}

export function isQuotaExceeded(json: YoutubeJson): boolean {
  const reason = json.error?.errors?.[0]?.reason;
  return reason === "quotaExceeded" || json.error?.code === 403;
}
