import type { UserRole } from "@/types/auth";

export const TOKEN_STORAGE_KEY = "playpass_access_token";

export function readStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function writeStoredToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/** Защита от open redirect: только относительные пути внутри приложения */
export function safeInternalPath(
  next: string | string[] | null | undefined,
): string {
  const v = Array.isArray(next) ? next[0] : next;
  if (!v || typeof v !== "string") return "/";
  const t = v.trim();
  if (!t.startsWith("/") || t.startsWith("//")) return "/";
  return t;
}

function pathOnly(p: string): string {
  const i = p.indexOf("?");
  return i === -1 ? p : p.slice(0, i);
}

/** После login/register: явный next или кабинет по роли */
export function postAuthRedirectPath(
  nextParam: string | null | undefined,
  role: UserRole,
): string {
  if (nextParam != null && nextParam.trim() !== "") {
    const p = safeInternalPath(nextParam);
    const base = pathOnly(p);
    if (base === "/login" || base === "/register") {
      // игнорируем next на страницы входа/регистрации
    } else if (base === "/organizer" && role !== "ORGANIZER") {
      return "/player";
    } else if (p !== "/") {
      return p;
    }
  }
  if (role === "ORGANIZER") return "/organizer";
  return "/player";
}
