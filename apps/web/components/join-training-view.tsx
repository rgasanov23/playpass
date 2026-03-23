"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  createParticipation,
  fetchParticipationsForTraining,
  fetchPaymentByParticipation,
  fetchTrainingByJoinToken,
} from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import type { Payment } from "@/types/payment";
import type { ParticipationWithRelations } from "@/types/participation";
import { sportTypeLabel } from "@/lib/sport-labels";
import type { Training } from "@/types/training";

const PAYMENT_LABELS: Record<string, string> = {
  PENDING: "Ожидает оплаты",
  SUCCEEDED: "Оплачено",
  FAILED: "Ошибка оплаты",
  CANCELED: "Отменено",
  REFUNDED: "Возврат",
};

function formatMoney(v: string | number | undefined): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 2,
  }).format(n);
}

/** «25 мар, 21:00» */
function formatShortTrainingStart(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const datePart = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  }).format(d);
  const timePart = new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `${datePart.replace(/\.$/, "")}, ${timePart}`;
}

function formatTimeOnly(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

function sameCalendarDay(aIso: string, bIso: string): boolean {
  const a = new Date(aIso);
  const b = new Date(bIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function paymentLoadErrorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  return "Не удалось загрузить данные оплаты.";
}

function participantDisplayName(p: ParticipationWithRelations): string {
  const u = p.user;
  if (u && typeof u === "object" && "fullName" in u && u.fullName) {
    return String(u.fullName);
  }
  return "Участник";
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length > 0) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "?";
}

function participationBadge(status: string): { label: string; className: string } {
  switch (status) {
    case "PENDING_PAYMENT":
      return {
        label: "Ожидает оплаты",
        className:
          "bg-amber-100 text-amber-950 ring-1 ring-amber-300/80 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-700/60",
      };
    case "CONFIRMED":
      return {
        label: "Подтверждено",
        className:
          "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-300/80 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-700/60",
      };
    case "EXPIRED":
      return {
        label: "Истекло",
        className:
          "bg-zinc-200 text-zinc-800 ring-1 ring-zinc-400/60 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600",
      };
    case "CANCELLED":
      return {
        label: "Отменено",
        className:
          "bg-red-50 text-red-900 ring-1 ring-red-200 dark:bg-red-950/40 dark:text-red-100 dark:ring-red-800/60",
      };
    default:
      return {
        label: status,
        className:
          "bg-zinc-100 text-zinc-800 ring-1 ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-200",
      };
  }
}

function useHoldCountdown(holdExpiresAt: string | null | undefined): number | null {
  const [leftMs, setLeftMs] = useState<number | null>(null);

  useEffect(() => {
    if (!holdExpiresAt) {
      setLeftMs(null);
      return;
    }
    const end = new Date(holdExpiresAt).getTime();
    if (Number.isNaN(end)) {
      setLeftMs(null);
      return;
    }
    const tick = () => {
      const ms = end - Date.now();
      setLeftMs(ms <= 0 ? 0 : ms);
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [holdExpiresAt]);

  return leftMs;
}

const AVATAR_MAX = 8;

export function JoinTrainingView({ joinToken }: { joinToken: string }) {
  const { user, loading: authLoading, token, logout } = useAuth();
  const [training, setTraining] = useState<Training | null>(null);
  const [trainingLoading, setTrainingLoading] = useState(true);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  const [roster, setRoster] = useState<ParticipationWithRelations[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [participation, setParticipation] =
    useState<ParticipationWithRelations | null>(null);
  const [payment, setPayment] = useState<Payment | null>(null);
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const nextPath = `/join/${encodeURIComponent(joinToken)}`;

  const loadRoster = useCallback(async (trainingId: string) => {
    setRosterLoading(true);
    try {
      const list = await fetchParticipationsForTraining(trainingId);
      setRoster(list);
    } catch {
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setTrainingLoading(true);
    setTrainingError(null);
    void (async () => {
      try {
        const t = await fetchTrainingByJoinToken(joinToken);
        if (!cancelled) setTraining(t);
      } catch (e) {
        if (!cancelled) {
          if (e instanceof ApiError && e.status === 404) {
            setTrainingError("Тренировка не найдена по этой ссылке.");
          } else if (e instanceof ApiError) {
            setTrainingError(e.message);
          } else {
            setTrainingError("Не удалось загрузить тренировку.");
          }
          setTraining(null);
        }
      } finally {
        if (!cancelled) setTrainingLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [joinToken]);

  useEffect(() => {
    if (!training?.id) return;
    void loadRoster(training.id);
  }, [training?.id, loadRoster]);

  const occupiedCount = useMemo(() => {
    return roster.filter(
      (p) =>
        p.status === "PENDING_PAYMENT" || p.status === "CONFIRMED",
    ).length;
  }, [roster]);

  const rosterVisible = useMemo(() => {
    return roster
      .filter(
        (p) =>
          p.status === "PENDING_PAYMENT" || p.status === "CONFIRMED",
      )
      .slice()
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      );
  }, [roster]);

  const syncMineFromServer = useCallback(async (): Promise<boolean> => {
    if (!training || !user) return false;
    const list = await fetchParticipationsForTraining(training.id);
    setRoster(list);
    const mine = list.find(
      (p) =>
        p.userId === user.id &&
        (p.status === "PENDING_PAYMENT" || p.status === "CONFIRMED"),
    );
    if (mine) {
      setParticipation(mine);
      setPaymentError(null);
      try {
        const pay = await fetchPaymentByParticipation(mine.id);
        setPayment(pay);
      } catch (e) {
        setPayment(null);
        setPaymentError(paymentLoadErrorMessage(e));
      }
      return true;
    }
    setParticipation(null);
    setPayment(null);
    setPaymentError(null);
    return false;
  }, [training, user]);

  useEffect(() => {
    if (!training || authLoading) return;
    if (!user) {
      setParticipation(null);
      setPayment(null);
      setPaymentError(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await syncMineFromServer();
      } catch {
        if (!cancelled) {
          setParticipation(null);
          setPayment(null);
          setPaymentError(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [training, user, authLoading, syncMineFromServer]);

  const shouldPollPayment = useMemo(() => {
    if (!participation || !payment) return false;
    return (
      participation.status === "PENDING_PAYMENT" && payment.status === "PENDING"
    );
  }, [participation, payment]);

  useEffect(() => {
    if (!shouldPollPayment || !participation || !training?.id) return;
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const pay = await fetchPaymentByParticipation(participation.id);
          setPayment(pay);
          setPaymentError(null);
          if (pay.status !== "PENDING") {
            await loadRoster(training.id);
          }
        } catch (e) {
          setPaymentError(paymentLoadErrorMessage(e));
        }
      })();
    }, 4000);
    return () => window.clearInterval(id);
  }, [shouldPollPayment, participation, training?.id, loadRoster]);

  const holdLeftMs = useHoldCountdown(participation?.holdExpiresAt ?? undefined);

  const handleJoin = async () => {
    if (!token || !training) return;
    setJoinLoading(true);
    setJoinError(null);
    setPaymentError(null);
    try {
      const p = await createParticipation(token, training.id);
      setParticipation(p);
      await loadRoster(training.id);
      try {
        const pay = await fetchPaymentByParticipation(p.id);
        setPayment(pay);
      } catch (e) {
        setPayment(null);
        setPaymentError(paymentLoadErrorMessage(e));
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        try {
          const synced = await syncMineFromServer();
          if (!synced) {
            setJoinError("Вы уже записаны на эту тренировку.");
          }
        } catch {
          setJoinError("Вы уже записаны на эту тренировку.");
        }
      } else {
        setJoinError(
          e instanceof ApiError ? e.message : "Не удалось записаться.",
        );
      }
    } finally {
      setJoinLoading(false);
    }
  };

  if (trainingLoading) {
    return (
      <div className="mx-auto flex max-w-lg flex-1 flex-col items-center justify-center px-4 py-16">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        <p className="mt-4 text-sm text-zinc-500">Загружаем тренировку…</p>
      </div>
    );
  }

  if (trainingError || !training) {
    return (
      <div className="mx-auto max-w-lg flex-1 px-4 py-16">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
          <h1 className="text-lg font-semibold">Не получилось открыть ссылку</h1>
          <p className="mt-2 text-sm opacity-90">
            {trainingError ?? "Тренировка недоступна."}
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-emerald-700 underline dark:text-emerald-400"
          >
            На главную
          </Link>
        </div>
      </div>
    );
  }

  const showHoldTimer =
    participation?.status === "PENDING_PAYMENT" &&
    participation.holdExpiresAt != null &&
    participation.holdExpiresAt !== "" &&
    holdLeftMs !== null;

  const limit = training.participantLimit;
  const remaining = Math.max(0, limit - occupiedCount);
  const ratio = limit > 0 ? occupiedCount / limit : 0;
  const isFull = occupiedCount >= limit;
  const almostFull = !isFull && ratio >= 0.8;

  const endsLine =
    training.endsAt &&
    (sameCalendarDay(training.startsAt, training.endsAt) ? (
      <span className="mt-0.5 block text-xs font-normal text-zinc-500">
        {formatTimeOnly(training.startsAt)}–{formatTimeOnly(training.endsAt)}
      </span>
    ) : (
      <span className="mt-0.5 block text-xs font-normal text-zinc-500">
        до {formatShortTrainingStart(training.endsAt)}
      </span>
    ));

  const holdMmSs =
    holdLeftMs != null && holdLeftMs > 0
      ? `${Math.floor(holdLeftMs / 60000)}:${String(
          Math.floor((holdLeftMs % 60000) / 1000),
        ).padStart(2, "0")}`
      : null;

  const badge = participation ? participationBadge(participation.status) : null;

  const showStickyCta = !participation;

  return (
    <div
      className={`mx-auto w-full max-w-lg flex-1 px-4 ${showStickyCta ? "pb-32" : "pb-10"} pt-6`}
    >
      <header className="mb-6 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="text-sm font-medium text-emerald-700 dark:text-emerald-400"
        >
          ← PlayPass
        </Link>
        {user && (
          <button
            type="button"
            onClick={() => logout()}
            className="text-sm text-zinc-500 underline hover:text-zinc-800 dark:hover:text-zinc-300"
          >
            Выйти
          </button>
        )}
      </header>

      <article className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-md dark:border-zinc-800 dark:bg-zinc-950">
        <div className="bg-gradient-to-br from-emerald-600 to-teal-800 px-6 pb-8 pt-8 text-white">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-100/90">
            Тренировка
          </p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight">
            {training.title}
          </h1>
          <p className="mt-3 text-base text-emerald-50/95">
            {[training.city, training.placeName].filter(Boolean).join(" · ")}
          </p>
          {training.description ? (
            <p className="mt-4 text-sm leading-relaxed text-emerald-50/90">
              {training.description}
            </p>
          ) : null}

          <div className="mt-6 rounded-xl bg-white/15 px-4 py-3 backdrop-blur-sm ring-1 ring-white/20">
            <p className="text-sm font-semibold text-white">
              👉{" "}
              {rosterLoading ? (
                <span className="opacity-80">Считаем места…</span>
              ) : isFull ? (
                <>Мест нет</>
              ) : (
                <>
                  Осталось{" "}
                  <span className="text-lg">{remaining}</span>{" "}
                  {remaining === 1 ? "место" : remaining < 5 ? "места" : "мест"}
                </>
              )}
            </p>
            {!rosterLoading && !isFull && almostFull ? (
              <p className="mt-1 text-sm font-medium text-amber-200">
                Почти заполнено
              </p>
            ) : null}
            {!rosterLoading && isFull ? (
              <p className="mt-1 text-sm font-medium text-red-200">
                Запись закрыта
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4 px-6 py-6 text-sm">
          {training.city ? (
            <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
              <span className="text-zinc-500">Город</span>
              <span className="text-right font-medium text-zinc-900 dark:text-zinc-100">
                {training.city}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <span className="text-zinc-500">Где</span>
            <span className="text-right font-medium text-zinc-900 dark:text-zinc-100">
              {training.placeName}
              {training.address ? (
                <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                  {training.address}
                </span>
              ) : null}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <span className="text-zinc-500">Когда</span>
            <span className="text-right font-semibold text-zinc-900 dark:text-zinc-100">
              {formatShortTrainingStart(training.startsAt)}
              {endsLine}
            </span>
          </div>
          <div className="flex justify-between gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <span className="text-zinc-500">Вид спорта</span>
            <span className="font-medium">
              {sportTypeLabel(training.sportType)}
            </span>
          </div>
          <div className="flex flex-col gap-1 border-b border-zinc-100 pb-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-zinc-500">Взнос с человека</span>
            <span className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              {formatMoney(training.calculatedPricePerParticipant)}
            </span>
          </div>
        </div>
      </article>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Уже идут на тренировку
        </h2>
        {rosterLoading ? (
          <p className="mt-3 text-sm text-zinc-500">Загружаем список…</p>
        ) : rosterVisible.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-white/60 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950/40">
            Пока никто не записался — будьте первым.
          </p>
        ) : (
          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              {rosterVisible.slice(0, AVATAR_MAX).map((p) => {
                const name = participantDisplayName(p);
                return (
                  <div
                    key={p.id}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white shadow ring-2 ring-white dark:ring-zinc-900"
                    title={name}
                  >
                    {initialsFromName(name)}
                  </div>
                );
              })}
            </div>
            {rosterVisible.length > AVATAR_MAX ? (
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                + ещё {rosterVisible.length - AVATAR_MAX}{" "}
                {rosterVisible.length - AVATAR_MAX === 1
                  ? "участник"
                  : "участников"}
              </p>
            ) : null}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Участие
        </h2>

        {authLoading ? (
          <p className="mt-4 text-sm text-zinc-500">Проверяем вход…</p>
        ) : !user ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Войдите или зарегистрируйтесь, чтобы записаться на тренировку.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/login?next=${encodeURIComponent(nextPath)}`}
                className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-700"
              >
                Войти
              </Link>
              <Link
                href={`/register?next=${encodeURIComponent(nextPath)}`}
                className="inline-flex items-center justify-center rounded-full border border-zinc-300 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
              >
                Регистрация
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Вы вошли как{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {user.fullName}
              </span>
              {user.email ? (
                <span className="text-zinc-500"> ({user.email})</span>
              ) : null}
            </p>

            {!participation ? (
              <>
                {joinError ? (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {joinError}
                  </p>
                ) : null}
                <p className="text-xs text-zinc-500 md:hidden">
                  Кнопка записи закреплена внизу экрана.
                </p>
              </>
            ) : (
              <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-950">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Статус участия
                  </span>
                  {badge ? (
                    <span
                      className={`inline-flex w-fit rounded-full px-3 py-1 text-sm font-semibold ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  ) : null}
                </div>

                {showHoldTimer ? (
                  <div className="rounded-xl bg-yellow-100 px-4 py-3 text-sm text-yellow-950 ring-1 ring-yellow-300/80 dark:bg-yellow-950/50 dark:text-yellow-50 dark:ring-yellow-700/50">
                    {holdLeftMs === 0 ? (
                      <span>Время брони истекло. Обновите страницу.</span>
                    ) : holdMmSs ? (
                      <span>
                        У вас есть <strong>{holdMmSs}</strong>, чтобы оплатить и
                        занять место.
                      </span>
                    ) : null}
                  </div>
                ) : participation.status === "PENDING_PAYMENT" &&
                  !participation.holdExpiresAt ? (
                  <p className="text-xs text-zinc-500">
                    Таймер брони недоступен для этой записи.
                  </p>
                ) : null}

                {payment ? (
                  <div className="flex flex-col gap-1 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                    <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Оплата
                    </span>
                    <span className="font-semibold">
                      {PAYMENT_LABELS[payment.status] ?? payment.status}
                    </span>
                    <span className="text-xs text-zinc-500">
                      Платёж #{payment.id.slice(0, 8)}… ·{" "}
                      {formatMoney(payment.amount)}
                    </span>
                  </div>
                ) : paymentError ? (
                  <p className="border-t border-zinc-100 pt-3 text-sm text-red-600 dark:border-zinc-800 dark:text-red-400">
                    {paymentError}
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500">
                    Данные оплаты загружаются…
                  </p>
                )}

                {shouldPollPayment ? (
                  <p className="text-xs text-zinc-400">
                    Статус обновляется автоматически каждые несколько секунд.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        )}
      </section>

      {showStickyCta ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200/80 bg-white/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/95">
          <div className="mx-auto flex w-full max-w-lg justify-center pb-[env(safe-area-inset-bottom)]">
            {!user ? (
              <div className="flex w-full max-w-md flex-wrap gap-2">
                <Link
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
                >
                  Войти, чтобы записаться
                </Link>
                <Link
                  href={`/register?next=${encodeURIComponent(nextPath)}`}
                  className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl border border-zinc-300 bg-white px-6 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  Регистрация
                </Link>
              </div>
            ) : (
              <button
                type="button"
                disabled={joinLoading || isFull}
                onClick={() => void handleJoin()}
                className="w-full max-w-md min-h-[52px] rounded-2xl bg-emerald-600 px-8 text-base font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-400 disabled:opacity-90 dark:disabled:bg-zinc-600"
              >
                {isFull
                  ? "Нет свободных мест"
                  : joinLoading
                    ? "Записываем..."
                    : "Иду на тренировку"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
