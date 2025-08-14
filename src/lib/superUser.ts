export const SUPER_USER_KEY = (import.meta.env.VITE_SUPER_USER_KEY || "").trim();
export function isSuperUser(key?: string | null): boolean {
  return !!key && key === SUPER_USER_KEY && SUPER_USER_KEY.length > 0;
}
