const KEY = "sn_apiKey";

export function getApiKey(): string {
  try {
    return localStorage.getItem(KEY) || "";
  } catch {
    return "";
  }
}

export function setApiKey(v: string) {
  try {
    localStorage.setItem(KEY, v);
  } catch {}
}
