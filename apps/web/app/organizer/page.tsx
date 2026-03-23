"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ApiError, fetchTrainings, updateTraining } from "@/lib/api";
import { sportTypeLabel } from "@/lib/sport-labels";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/components/auth-provider";
import type { Training } from "@/types/training";

function CenteredSpinner({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      <p className="text-center text-sm text-zinc-500">{message}</p>
    </div>
  );
}

function formatShortStart(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function OrganizerPage() {
  const { user, loading, logout, token } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.replace("/");
  };
  const [mine, setMine] = useState<Training[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== "ORGANIZER") {
      router.replace("/player");
    }
  }, [loading, user, router, pathname]);

  const loadMine = useCallback(async () => {
    if (!user || user.role !== "ORGANIZER") return;
    setListLoading(true);
    setListError(null);
    try {
      const all = await fetchTrainings();
      const filtered = all.filter((t) => t.organizerId === user.id);
      filtered.sort(
        (a, b) =>
          new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      );
      setMine(filtered);
    } catch (e) {
      setListError(
        e instanceof ApiError ? e.message : "Не удалось загрузить тренировки.",
      );
      setMine([]);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user || user.role !== "ORGANIZER") return;
    void loadMine();
  }, [user, loadMine]);

  const cancelTraining = async (id: string) => {
    if (!token) return;
    if (
      !window.confirm(
        "Отменить тренировку? Она исчезнет из каталога, ссылка для игроков перестанет работать для новых записей.",
      )
    ) {
      return;
    }
    setActionId(id);
    try {
      await updateTraining(token, id, { status: "CANCELLED" });
      await loadMine();
    } catch (e) {
      window.alert(
        e instanceof ApiError ? e.message : "Не удалось отменить тренировку.",
      );
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return <CenteredSpinner message="Проверяем авторизацию…" />;
  }

  if (!user) {
    return <CenteredSpinner message="Перенаправляем…" />;
  }

  if (user.role !== "ORGANIZER") {
    return <CenteredSpinner message="Перенаправляем…" />;
  }

  return (
    <DashboardShell
      title="Кабинет организатора"
      nav={[
        { href: "/organizer", label: "Кабинет" },
        { href: "/organizer/trainings/new", label: "Создать тренировку" },
        { href: "/player", label: "Кабинет игрока" },
        { href: "/", label: "Главная" },
      ]}
    >
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/organizer/trainings/new"
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
        >
          Создать тренировку
        </Link>
      </div>

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
          Мои тренировки
        </h2>
        {listLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Загрузка…</p>
        ) : listError ? (
          <p className="mt-4 text-sm text-red-600 dark:text-red-400">
            {listError}
          </p>
        ) : mine.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Пока нет тренировок. Создайте первую.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {mine.map((t) => {
              const cancelled = t.status === "CANCELLED";
              return (
                <li
                  key={t.id}
                  className={`rounded-2xl border p-5 shadow-sm ${
                    cancelled
                      ? "border-zinc-200 bg-zinc-100/80 opacity-80 dark:border-zinc-700 dark:bg-zinc-900/50"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
                  }`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {t.title}
                        </h3>
                        {cancelled ? (
                          <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                            Отменена
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {t.city} · {sportTypeLabel(t.sportType)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                        {formatShortStart(t.startsAt)}
                      </p>
                      <Link
                        href={`/join/${encodeURIComponent(t.joinToken)}`}
                        className="mt-2 inline-block text-sm text-emerald-700 underline dark:text-emerald-400"
                      >
                        Ссылка для игроков
                      </Link>
                    </div>
                    {!cancelled ? (
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/organizer/trainings/${encodeURIComponent(t.id)}/edit`}
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          title="Редактировать"
                        >
                          ✏️ Редактировать
                        </Link>
                        <Link
                          href={`/organizer/trainings/${encodeURIComponent(t.id)}/edit#schedule`}
                          className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          title="Перенести"
                        >
                          ⏱ Перенести
                        </Link>
                        <button
                          type="button"
                          disabled={actionId === t.id || !token}
                          onClick={() => void cancelTraining(t.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-50 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/60"
                          title="Удалить (отменить)"
                        >
                          🗑 Удалить
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </DashboardShell>
  );
}
