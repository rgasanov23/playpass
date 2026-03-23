"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ApiError, loginRequest } from "@/lib/api";
import { postAuthRedirectPath } from "@/lib/auth";
import { useAuth } from "@/components/auth-provider";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nextRaw = searchParams.get("next");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await loginRequest(email.trim(), password);
      await setSession(res.access_token);
      router.push(postAuthRedirectPath(nextRaw, res.user.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Не удалось войти.");
    } finally {
      setLoading(false);
    }
  };

  const registerHref =
    nextRaw != null && nextRaw.trim() !== ""
      ? `/register?next=${encodeURIComponent(nextRaw)}`
      : "/register";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-16">
      <Link
        href="/"
        className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
      >
        ← На главную
      </Link>
      <h1 className="mt-8 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
        Вход
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Нет аккаунта?{" "}
        <Link
          href={registerHref}
          className="font-medium text-emerald-700 underline dark:text-emerald-400"
        >
          Регистрация
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
            Пароль
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm outline-none ring-emerald-600 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white shadow hover:bg-emerald-700 disabled:opacity-60"
        >
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>
    </div>
  );
}
