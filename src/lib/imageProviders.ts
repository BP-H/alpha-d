export type FeedImage = {
  id: string;
  src: string;         // display src (optimized for width ~1200)
  thumb: string;       // small preview
  author?: string;
  link?: string;
  width?: number;
  height?: number;
};

export type ProviderName = "picsum" | "unsplash" | "pexels";

type FetchArgs = {
  provider?: ProviderName;
  page: number;
  perPage: number;
  query?: string;
};

/**
 * Read API keys from Vite env first, then fall back to localStorage
 * (so you don’t need env vars to test)
 */
function getKey(name: string) {
  const envMap: Record<string, string | undefined> = {
    unsplash: import.meta.env.VITE_UNSPLASH_KEY,
    pexels: import.meta.env.VITE_PEXELS_KEY,
  };
  const envKey = envMap[name];
  if (envKey) return envKey;
  try { return JSON.parse(localStorage.getItem("sn.keys") || "{}")[name]; } catch { return undefined; }
}

/** PICSUM — no key needed */
async function fetchPicsum(page: number, perPage: number): Promise<FeedImage[]> {
  const url = `https://picsum.photos/v2/list?page=${page}&limit=${perPage}`;
  const res = await fetch(url);
  const list = await res.json() as any[];
  return list.map((x) => {
    const w = 1200;
    // height scaled to maintain aspect; picsum endpoint takes fixed w/h; we’ll let browser scale
    return {
      id: String(x.id),
      src: `https://picsum.photos/id/${x.id}/${w}/800`,
      thumb: `https://picsum.photos/id/${x.id}/200/140`,
      author: x.author,
      link: x.url,
      width: x.width, height: x.height,
    } as FeedImage;
  });
}

/** UNSPLASH (optional) — needs access key (store as localStorage.sn.keys.unsplash) */
async function fetchUnsplash(page: number, perPage: number, query?: string): Promise<FeedImage[]> {
  const key = getKey("unsplash");
  if (!key) return []; // fall back to picsum in caller when empty
  const base = query ? "https://api.unsplash.com/search/photos" : "https://api.unsplash.com/photos";
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    orientation: "landscape",
    query: query || "",
  });
  const res = await fetch(`${base}?${params.toString()}`, { headers: { Authorization: `Client-ID ${key}` } });
  const json = await res.json();
  const items = query ? (json.results || []) : json;
  return items.map((x: any) => ({
    id: x.id,
    src: x.urls?.regular || x.urls?.full,
    thumb: x.urls?.small,
    author: x.user?.name,
    link: x.links?.html,
    width: x.width, height: x.height,
  } as FeedImage));
}

/** PEXELS (optional) — needs key (store as localStorage.sn.keys.pexels) */
async function fetchPexels(page: number, perPage: number, query?: string): Promise<FeedImage[]> {
  const key = getKey("pexels");
  if (!key) return [];
  const base = query ? "https://api.pexels.com/v1/search" : "https://api.pexels.com/v1/curated";
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(perPage),
    query: query || "",
  });
  const res = await fetch(`${base}?${params.toString()}`, { headers: { Authorization: key } });
  const json = await res.json();
  const items = json.photos || [];
  return items.map((x: any) => ({
    id: String(x.id),
    src: x.src?.large2x || x.src?.large || x.src?.original,
    thumb: x.src?.tiny || x.src?.small,
    author: x.photographer,
    link: x.url,
    width: x.width, height: x.height,
  } as FeedImage));
}

/** Main entry */
export async function fetchImages({ provider = "picsum", page, perPage, query }: FetchArgs): Promise<FeedImage[]> {
  if (provider === "unsplash") {
    const r = await fetchUnsplash(page, perPage, query);
    if (r.length) return r;
  }
  if (provider === "pexels") {
    const r = await fetchPexels(page, perPage, query);
    if (r.length) return r;
  }
  return fetchPicsum(page, perPage);
}
