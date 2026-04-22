import Cookies from 'js-cookie';

const TOKEN_KEY = 'token';
const USER_KEY = 'hrm_user';
const SLUG_KEY = 'company_slug';

export function saveAuth(token: string, user: any, slug?: string) {
  Cookies.set(TOKEN_KEY, token, { expires: 7, sameSite: 'lax' });
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (slug) Cookies.set(SLUG_KEY, slug, { expires: 7, sameSite: 'lax' });
}

export function getToken(): string | null {
  return Cookies.get(TOKEN_KEY) || null;
}

export function getUser(): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function clearAuth() {
  Cookies.remove(TOKEN_KEY);
  Cookies.remove(SLUG_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
