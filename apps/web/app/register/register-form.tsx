"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError, registerRequest } from "@/lib/api";
import { postAuthRedirectPath } from "@/lib/auth";
import { useAuth } from "@/components/auth-provider";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"PLAYER" | "ORGANIZER">("PLAYER");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextRaw = searchParams.get("next");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await registerRequest({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        role,
      });
      await setSession(res.access_token);
      router.push(postAuthRedirectPath(nextRaw, res.user.role));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Не удалось зарегистрироваться.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loginHref =
    nextRaw != null && nextRaw.trim() !== ""
      ? `/login?next=${encodeURIComponent(nextRaw)}`
      : "/login";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <Link
        href="/"
        className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
      >
        ← На главную
      </Link>
      <h1 className="mt-8 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Регистрация
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Уже есть аккаунт?{" "}
        <Link
          href={loginHref}
          className="font-medium text-emerald-700 underline dark:text-emerald-400"
        >
          Войти
        </Link>
      </p>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
            {error}
          </p>
        ) : null}
        <div>
          <label
            htmlFor="fullName"
            className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Имя
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Пароль (мин. 8 символов)
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <div>
          <label
            htmlFor="role"
            className="block text-xs font-medium uppercase tracking-wide text-zinc-500"
          >
            Роль
          </label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "PLAYER" | "ORGANIZER")
            }
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="PLAYER">Игрок</option>
            <option value="ORGANIZER">Организатор</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Создаём аккаунт…" : "Зарегистрироваться"}
        </button>
      </form>
    </div>
  );
}
