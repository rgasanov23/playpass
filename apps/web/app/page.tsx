"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, fetchPublicTrainings } from "@/lib/api";
import { PublicTrainingCard } from "@/components/public-training-card";
import { useAuth } from "@/components/auth-provider";
import {
  PLAYER_CITY_STORAGE_KEY,
  PLAYPASS_CITIES,
} from "@/lib/cities";
import type { TrainingPublic } from "@/types/training";

function AuthSpinner() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      <p className="text-sm text-zinc-500">Проверяем авторизацию…</p>
    </div>
  );
}

const btnPrimary =
  "inline-flex min-w-[12rem] items-center justify-center rounded-full bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700";
const btnOutline =
  "inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-6 py-3.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900";
const btnHeader =
  "inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700";
const btnHeaderOutline =
  "inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [catalog, setCatalog] = useState<TrainingPublic[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setCatalogLoading(true);
      setCatalogError(null);
      try {
        let city: string = PLAYPASS_CITIES[0];
        try {
          const stored = window.localStorage.getItem(PLAYER_CITY_STORAGE_KEY);
          if (
            stored &&
            PLAYPASS_CITIES.includes(
              stored as (typeof PLAYPASS_CITIES)[number],
            )
          ) {
            city = stored;
          }
        } catch {
          /* ignore */
        }
        const data = await fetchPublicTrainings(city);
        const sorted = [...data].sort(
          (a, b) =>
            new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
        );
        if (!cancelled) setCatalog(sorted.slice(0, 5));
      } catch (e) {
        if (!cancelled) {
          setCatalogError(
            e instanceof ApiError
              ? e.message
              : "Не удалось загрузить тренировки.",
          );
          setCatalog([]);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  if (loading) {
    return <AuthSpinner />;
  }

  const cabinetHref = user?.role === "ORGANIZER" ? "/organizer" : "/player";

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {user ? (
        <header className="border-b border-zinc-200/80 bg-white/90 py-5 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Привет, {user.fullName}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Link href={cabinetHref} className={btnHeader}>
                Мой кабинет
              </Link>
              {user.role === "ORGANIZER" ? (
                <Link href="/organizer/trainings/new" className={btnHeaderOutline}>
                  Создать тренировку
                </Link>
              ) : null}
            </div>
          </div>
        </header>
      ) : null}

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-24 pt-16 sm:pt-20">
        <section className="text-center sm:text-left">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            Записывайся на тренировки в своём городе
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-zinc-600 sm:mx-0 dark:text-zinc-400">
            Без чатов и договорённостей — выбрал, нажал и пришёл
          </p>
          <div className="mt-12 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-4 md:justify-start">
            <Link href="/player" className={btnPrimary}>
              Найти тренировку
            </Link>
            {user ? (
              user.role === "ORGANIZER" ? (
                <Link href="/organizer/trainings/new" className={btnOutline}>
                  Создать тренировку
                </Link>
              ) : null
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/login" className={btnOutline}>
                  Войти
                </Link>
                <Link href="/register" className={btnOutline}>
                  Регистрация
                </Link>
              </div>
            )}
          </div>
        </section>

        <section className="mt-28 sm:mt-32">
          <h2 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Как это работает
          </h2>
          <div className="mt-14 grid gap-8 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                1
              </p>
              <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Найди тренировку
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Выбери город, вид спорта и время — в каталоге видно всё сразу.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                2
              </p>
              <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Запишись
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Нажми «Иду» и займи место — без переписок в мессенджерах.
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                3
              </p>
              <h3 className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                Приходи играть
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Без согласований и ручного поиска людей — просто приходи на площадку.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-28 sm:mt-32">
          <h2 className="text-center text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            Для кого
          </h2>
          <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-12">
            <div className="rounded-2xl border border-dashed border-emerald-200/80 bg-emerald-50/50 p-8 dark:border-emerald-900/40 dark:bg-emerald-950/20">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Игрокам
              </h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400">—</span>
                  находи игры рядом с собой;
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400">—</span>
                  не ищи людей вручную — места видны в каталоге.
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-8 dark:border-zinc-700 dark:bg-zinc-900/40">
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Организаторам
              </h3>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
                <li className="flex gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400">—</span>
                  создавай тренировку за пару минут;
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600 dark:text-emerald-400">—</span>
                  собирай игроков по одной ссылке.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-28 sm:mt-32">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 sm:text-3xl">
                Ближайшие тренировки
              </h2>
              <p className="mt-2 text-sm text-zinc-500">
                В вашем городе из настроек каталога
              </p>
            </div>
            <Link
              href="/player"
              className="shrink-0 self-start rounded-full border border-emerald-600 bg-transparent px-6 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-950/40 sm:self-auto"
            >
              Смотреть все
            </Link>
          </div>

          {catalogLoading ? (
            <p className="mt-10 text-sm text-zinc-500">Загрузка…</p>
          ) : catalogError ? (
            <p className="mt-10 text-sm text-red-600 dark:text-red-400">
              {catalogError}
            </p>
          ) : catalog.length === 0 ? (
            <div className="mt-10 rounded-2xl border border-dashed border-zinc-300 bg-white/60 px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-950/40">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Пока нет ближайших тренировок в этом городе.
              </p>
              <Link
                href="/player"
                className="mt-6 inline-flex rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Открыть каталог
              </Link>
            </div>
          ) : (
            <ul className="mt-10 space-y-5 transition-opacity duration-300">
              {catalog.map((t) => (
                <PublicTrainingCard key={t.id} training={t} variant="compact" />
              ))}
            </ul>
          )}
        </section>

        <section className="mt-20 border-t border-zinc-200 pt-12 dark:border-zinc-800">
          <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
            Есть ссылка от организатора? Откройте в браузере путь{" "}
            <code className="rounded-md bg-zinc-200 px-2 py-0.5 text-xs dark:bg-zinc-800">
              /join/…
            </code>
          </p>
          {user ? (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full border border-zinc-300 px-6 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Выйти
              </button>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
