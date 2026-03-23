"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, fetchPublicTrainings } from "@/lib/api";
import { CATALOG_SPORT_FILTERS } from "@/lib/catalog-sports";
import {
  PLAYER_CITY_STORAGE_KEY,
  PLAYPASS_CITIES,
} from "@/lib/cities";
import { DashboardShell } from "@/components/dashboard-shell";
import { PublicTrainingCard } from "@/components/public-training-card";
import { useAuth } from "@/components/auth-provider";
import type { TrainingPublic } from "@/types/training";

function CenteredSpinner({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      <p className="text-center text-sm text-zinc-500">{message}</p>
    </div>
  );
}

function localDayKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function dayKeyFromIso(iso: string): string {
  return localDayKey(new Date(iso));
}

export default function PlayerPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const citySelectRef = useRef<HTMLSelectElement>(null);

  const [city, setCity] = useState<string>(PLAYPASS_CITIES[0]);
  const [cityReady, setCityReady] = useState(false);
  const [list, setList] = useState<TrainingPublic[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  /** null = все дни; иначе YYYY-MM-DD локальный день */
  const [dayFilterKey, setDayFilterKey] = useState<string | null>(null);
  /** null = все виды спорта */
  const [sportFilter, setSportFilter] = useState<string | null>(null);

  const handleLogout = () => {
    logout();
    router.replace("/");
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PLAYER_CITY_STORAGE_KEY);
      if (
        stored &&
        PLAYPASS_CITIES.includes(stored as (typeof PLAYPASS_CITIES)[number])
      ) {
        setCity(stored);
      }
    } catch {
      /* ignore */
    }
    setCityReady(true);
  }, []);

  const loadList = useCallback(async (c: string) => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await fetchPublicTrainings(c);
      const sorted = [...data].sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
      setList(sorted);
    } catch (e) {
      setListError(
        e instanceof ApiError ? e.message : "Не удалось загрузить тренировки.",
      );
      setList([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!cityReady || !user) return;
    void loadList(city);
  }, [city, cityReady, user, loadList]);

  const onCityChange = (next: string) => {
    setCity(next);
    try {
      window.localStorage.setItem(PLAYER_CITY_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const filteredBySport = useMemo(() => {
    if (sportFilter == null) return list;
    return list.filter((t) => t.sportType === sportFilter);
  }, [list, sportFilter]);

  const filtered = useMemo(() => {
    if (dayFilterKey == null) return filteredBySport;
    return filteredBySport.filter(
      (t) => dayKeyFromIso(t.startsAt) === dayFilterKey,
    );
  }, [filteredBySport, dayFilterKey]);

  const { today, tomorrow, later } = useMemo(() => {
    const now = new Date();
    const todayK = localDayKey(now);
    const tm = new Date(now);
    tm.setDate(tm.getDate() + 1);
    const tomorrowK = localDayKey(tm);

    const todayL: TrainingPublic[] = [];
    const tomorrowL: TrainingPublic[] = [];
    const laterL: TrainingPublic[] = [];

    for (const t of filtered) {
      const k = dayKeyFromIso(t.startsAt);
      if (k === todayK) todayL.push(t);
      else if (k === tomorrowK) tomorrowL.push(t);
      else laterL.push(t);
    }

    return { today: todayL, tomorrow: tomorrowL, later: laterL };
  }, [filtered]);

  const calendarDays = useMemo(() => {
    const out: { key: string; label: string; weekday: string }[] = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    for (let i = 0; i < 8; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const key = localDayKey(d);
      const weekday = new Intl.DateTimeFormat("ru-RU", {
        weekday: "short",
      }).format(d);
      const dayNum = d.getDate();
      const label = i === 0 ? "Сегодня" : i === 1 ? "Завтра" : String(dayNum);
      out.push({ key, label, weekday });
    }
    return out;
  }, []);

  const renderSection = (title: string, items: TrainingPublic[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mt-8">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </h3>
        <ul className="mt-3 space-y-4">
          {items.map((t) => (
            <PublicTrainingCard key={t.id} training={t} variant="full" />
          ))}
        </ul>
      </div>
    );
  };

  if (loading) {
    return <CenteredSpinner message="Проверяем авторизацию…" />;
  }

  if (!user) {
    return <CenteredSpinner message="Перенаправляем…" />;
  }

  const isEmptyNoCity =
    !listLoading && !listError && list.length === 0;
  const isEmptySport =
    !listLoading &&
    !listError &&
    list.length > 0 &&
    filteredBySport.length === 0 &&
    sportFilter != null;
  const isEmptyFilteredDay =
    !listLoading &&
    !listError &&
    list.length > 0 &&
    filteredBySport.length > 0 &&
    filtered.length === 0 &&
    dayFilterKey != null;

  return (
    <DashboardShell
      title="Кабинет игрока"
      nav={[{ href: "/", label: "Главная" }]}
    >
      {user.role === "ORGANIZER" ? (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Вы вошли как организатор.{" "}
          <Link
            href="/organizer"
            className="font-medium text-emerald-700 underline dark:text-emerald-400"
          >
            Перейти в кабинет организатора
          </Link>
        </p>
      ) : null}

      <div className="mt-8 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {user.fullName}
        </p>
        {user.email ? (
          <p className="mt-1 text-sm text-zinc-500">{user.email}</p>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-white dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Выйти
        </button>
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Доступные тренировки
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Сначала город, затем вид спорта и дата — список обновится.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
            Город
          </label>
          <select
            ref={citySelectRef}
            value={city}
            onChange={(e) => onCityChange(e.target.value)}
            className="mt-1 w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {PLAYPASS_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {!listLoading && !listError && list.length > 0 ? (
          <div className="mt-5">
            <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
              Вид спорта
            </label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CATALOG_SPORT_FILTERS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setSportFilter(f.value)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                    sportFilter === f.value
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                      : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!listLoading && !listError && list.length > 0 ? (
          <div className="mt-6 overflow-x-auto pb-1">
            <div className="flex min-w-0 gap-2">
              <button
                type="button"
                onClick={() => setDayFilterKey(null)}
                className={`shrink-0 rounded-2xl border px-4 py-2.5 text-left text-sm transition ${
                  dayFilterKey === null
                    ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                    : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                }`}
              >
                Все
              </button>
              {calendarDays.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDayFilterKey(d.key)}
                  className={`shrink-0 rounded-2xl border px-4 py-2.5 text-left text-sm transition ${
                    dayFilterKey === d.key
                      ? "border-emerald-600 bg-emerald-50 font-semibold text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
                      : "border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                }`}
                >
                  <span className="block text-xs uppercase text-zinc-500">
                    {d.weekday}
                  </span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {d.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {listLoading ? (
          <p className="mt-6 text-sm text-zinc-500">Загрузка…</p>
        ) : listError ? (
          <p className="mt-6 text-sm text-red-600 dark:text-red-400">
            {listError}
          </p>
        ) : isEmptySport ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center transition-opacity duration-300 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Нет тренировок по выбранному виду спорта
            </p>
            <button
              type="button"
              onClick={() => setSportFilter(null)}
              className="mt-4 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Показать все виды
            </button>
          </div>
        ) : isEmptyFilteredDay ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center transition-opacity duration-300 dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              На выбранную дату нет тренировок.
            </p>
            <button
              type="button"
              onClick={() => setDayFilterKey(null)}
              className="mt-4 rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Показать все дни
            </button>
          </div>
        ) : isEmptyNoCity ? (
          <div className="mt-6 rounded-2xl border border-dashed border-zinc-300 px-4 py-10 text-center dark:border-zinc-700">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              В вашем городе пока нет тренировок
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => citySelectRef.current?.focus()}
                className="rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Сменить город
              </button>
              {user.role === "ORGANIZER" ? (
                <Link
                  href="/organizer/trainings/new"
                  className="inline-flex rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Создать тренировку
                </Link>
              ) : null}
            </div>
          </div>
        ) : (
          <div
            key={`${city}-${sportFilter ?? "all"}-${dayFilterKey ?? "alldays"}`}
            className="transition-opacity duration-300 ease-out"
          >
            {renderSection("Сегодня", today)}
            {renderSection("Завтра", tomorrow)}
            {renderSection("Ближайшие", later)}
          </div>
        )}
      </section>

      <section className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-6 dark:border-zinc-700 dark:bg-zinc-950/40">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Мои записи
        </h2>
        <p className="mt-2 text-sm text-zinc-500">
          Скоро здесь появится список ваших тренировок.
        </p>
      </section>
    </DashboardShell>
  );
}
