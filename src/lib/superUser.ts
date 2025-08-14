export const SUPER_USER_KEY = 'super-secret';

export function isSuperUser(key: string): boolean {
  return key === SUPER_USER_KEY;
}
