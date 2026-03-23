"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiError, createTraining, updateTraining } from "@/lib/api";
import { PLAYPASS_CITIES } from "@/lib/cities";
import {
  ACQUIRING_PERCENT,
  SERVICE_FEE_PER_PARTICIPANT,
} from "@/lib/training-pricing";
import { useAuth } from "@/components/auth-provider";
import type {
  CreateTrainingPayload,
  CreateTrainingSportType,
} from "@/types/create-training";
import type { Training } from "@/types/training";

const SPORT_OPTIONS: { value: CreateTrainingSportType; label: string }[] = [
  { value: "VOLLEYBALL", label: "Волейбол" },
  { value: "FOOTBALL", label: "Футбол" },
  { value: "BASKETBALL", label: "Баскетбол" },
  { value: "TENNIS", label: "Теннис" },
  { value: "PADEL", label: "Падел" },
  { value: "OTHER", label: "Другое" },
];

const DURATION_MINUTES_OPTIONS = [60, 90, 120, 180] as const;

export type CreateTrainingFormProps = {
  mode?: "create" | "edit";
  trainingId?: string;
  initialTraining?: Training | null;
  /** Для редиректа на login при отсутствии token */
  loginRedirectPath?: string;
};

function todayDatetimeLocal(): string {
  const d = new Date();
  d.setHours(19, 0, 0, 0);
  return toDatetimeLocalValue(d.toISOString());
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function deriveDurationMinutes(
  startsAt: string,
  endsAt: string | null,
): (typeof DURATION_MINUTES_OPTIONS)[number] {
  if (!endsAt) return 90;
  const ms = new Date(endsAt).getTime() - new Date(startsAt).getTime();
  const mins = Math.round(ms / 60000);
  if (mins === 60 || mins === 90 || mins === 120 || mins === 180) {
    return mins;
  }
  return 90;
}

function calculatePricePerParticipant(
  courtPriceTotal: number,
  participantLimit: number,
  serviceFeePerParticipant: number,
  acquiringPercent: number,
): number {
  const baseTotal =
    courtPriceTotal + serviceFeePerParticipant * participantLimit;
  const totalWithAcquiring = baseTotal * (1 + acquiringPercent / 100);
  return Math.ceil(totalWithAcquiring / participantLimit);
}

const money = new Intl.NumberFormat("ru-RU", {
  style: "currency",
  currency: "RUB",
  maximumFractionDigits: 0,
});

export function CreateTrainingForm({
  mode = "create",
  trainingId,
  initialTraining,
  loginRedirectPath = "/organizer/trainings/new",
}: CreateTrainingFormProps) {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sportType, setSportType] =
    useState<CreateTrainingSportType>("OTHER");
  const [city, setCity] = useState<string>(PLAYPASS_CITIES[0]);
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [startsAtLocal, setStartsAtLocal] = useState(todayDatetimeLocal);
  const [durationMinutes, setDurationMinutes] =
    useState<(typeof DURATION_MINUTES_OPTIONS)[number]>(90);
  const [participantLimit, setParticipantLimit] = useState("10");
  const [courtPriceTotal, setCourtPriceTotal] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Training | null>(null);
  const [saved, setSaved] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  useEffect(() => {
    if (!initialTraining) return;
    setTitle(initialTraining.title);
    setDescription(initialTraining.description ?? "");
    setSportType(initialTraining.sportType as CreateTrainingSportType);
    const c = initialTraining.city;
    setCity(
      PLAYPASS_CITIES.includes(c as (typeof PLAYPASS_CITIES)[number])
        ? c
        : PLAYPASS_CITIES[0],
    );
    setPlaceName(initialTraining.placeName);
    setAddress(initialTraining.address ?? "");
    setStartsAtLocal(toDatetimeLocalValue(initialTraining.startsAt));
    setDurationMinutes(
      deriveDurationMinutes(
        initialTraining.startsAt,
        initialTraining.endsAt,
      ),
    );
    setParticipantLimit(String(initialTraining.participantLimit));
    setCourtPriceTotal(String(initialTraining.courtPriceTotal));
    setVisibility(
      initialTraining.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
    );
  }, [initialTraining]);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(loginRedirectPath)}`);
    }
  }, [authLoading, token, router, loginRedirectPath]);

  const preview = useMemo(() => {
    const limit = Math.floor(Number(participantLimit));
    const court = Number(courtPriceTotal);
    if (
      !Number.isFinite(limit) ||
      limit < 2 ||
      !Number.isFinite(court) ||
      court < 0
    ) {
      return null;
    }
    const serviceTotal = SERVICE_FEE_PER_PARTICIPANT * limit;
    const baseTotal = court + serviceTotal;
    const totalWithAcquiring =
      baseTotal * (1 + ACQUIRING_PERCENT / 100);
    const perParticipant = calculatePricePerParticipant(
      court,
      limit,
      SERVICE_FEE_PER_PARTICIPANT,
      ACQUIRING_PERCENT,
    );
    return {
      limit,
      court,
      serviceTotal,
      baseTotal,
      totalWithAcquiring,
      perParticipant,
    };
  }, [participantLimit, courtPriceTotal]);

  const joinPath =
    created != null
      ? `/join/${encodeURIComponent(created.joinToken)}`
      : "";

  const fullJoinUrl =
    typeof window !== "undefined" && created != null
      ? `${window.location.origin}${joinPath}`
      : "";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Вы не авторизованы. Войдите снова.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const startsAt = new Date(startsAtLocal);
      if (Number.isNaN(startsAt.getTime())) {
        setError("Укажите корректную дату и время начала.");
        setLoading(false);
        return;
      }

      const limit = Math.floor(Number(participantLimit));
      if (!Number.isFinite(limit) || limit < 2) {
        setError("Лимит участников — целое число не меньше 2.");
        setLoading(false);
        return;
      }

      if (!city.trim()) {
        setError("Выберите город.");
        setLoading(false);
        return;
      }

      const endsAt = new Date(
        startsAt.getTime() + durationMinutes * 60 * 1000,
      );

      const basePayload: CreateTrainingPayload = {
        title: title.trim(),
        sportType,
        city: city.trim(),
        placeName: placeName.trim(),
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        participantLimit: limit,
        courtPriceTotal: Number(courtPriceTotal),
        serviceFeePerParticipant: SERVICE_FEE_PER_PARTICIPANT,
        acquiringPercent: ACQUIRING_PERCENT,
        visibility,
      };

      if (description.trim()) basePayload.description = description.trim();
      if (address.trim()) basePayload.address = address.trim();

      if (isEdit && trainingId) {
        await updateTraining(token, trainingId, basePayload);
        setSaved(true);
        setCreated(null);
      } else {
        const t = await createTraining(token, basePayload);
        setCreated(t);
        setSaved(false);
        setCopyDone(false);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : isEdit
            ? "Не удалось сохранить изменения."
            : "Не удалось создать тренировку.",
      );
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!fullJoinUrl) return;
    try {
      await navigator.clipboard.writeText(fullJoinUrl);
      setCopyDone(true);
      window.setTimeout(() => setCopyDone(false), 2000);
    } catch {
      setCopyDone(false);
    }
  };

  if (saved && isEdit) {
    return (
      <div className="mt-8 space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <p className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
          Изменения сохранены
        </p>
        <Link
          href="/organizer"
          className="inline-flex rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          В кабинет организатора
        </Link>
      </div>
    );
  }

  if (created && !isEdit) {
    return (
      <div className="mt-8 space-y-6 rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 dark:border-emerald-900/40 dark:bg-emerald-950/30">
        <p className="text-base font-semibold text-emerald-950 dark:text-emerald-100">
          Тренировка создана
        </p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          <span className="font-medium">Название:</span> {created.title}
        </p>
        {created.city ? (
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-medium">Город:</span> {created.city}
          </p>
        ) : null}
        <div className="text-sm">
          <p className="font-medium text-zinc-700 dark:text-zinc-300">
            Токен ссылки (joinToken)
          </p>
          <code className="mt-1 block break-all rounded bg-white/80 px-2 py-2 text-xs dark:bg-zinc-900">
            {created.joinToken}
          </code>
        </div>
        <div className="text-sm">
          <p className="font-medium text-zinc-700 dark:text-zinc-300">
            Ссылка для игроков
          </p>
          <code className="mt-1 block break-all rounded bg-white/80 px-2 py-2 text-xs dark:bg-zinc-900">
            {fullJoinUrl || joinPath}
          </code>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void copyLink()}
            className="rounded-full bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            {copyDone ? "Скопировано" : "Копировать ссылку"}
          </button>
          <Link
            href={joinPath}
            className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-5 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-white dark:border-zinc-600 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Открыть страницу записи
          </Link>
          <Link
            href="/organizer"
            className="inline-flex items-center justify-center text-sm font-medium text-emerald-700 underline dark:text-emerald-400"
          >
            В кабинет
          </Link>
        </div>
      </div>
    );
  }

  if (!authLoading && !token) {
    return (
      <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/90 p-6 text-sm text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">Вы не авторизованы</p>
        <p className="mt-2 text-amber-900/90 dark:text-amber-200/90">
          Войдите, чтобы продолжить.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(loginRedirectPath)}`}
          className="mt-4 inline-block font-semibold text-emerald-800 underline dark:text-emerald-400"
        >
          Перейти ко входу
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mt-8 space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
    >
      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Название *
        </label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Тренировка по волейболу"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Описание
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Коротко опишите формат игры и уровень участников"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Вид спорта *
        </label>
        <select
          required
          value={sportType}
          onChange={(e) =>
            setSportType(e.target.value as CreateTrainingSportType)
          }
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {SPORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Город *
        </label>
        <select
          required
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {initialTraining &&
          initialTraining.city &&
          !PLAYPASS_CITIES.includes(
            initialTraining.city as (typeof PLAYPASS_CITIES)[number],
          ) ? (
            <option value={initialTraining.city}>{initialTraining.city}</option>
          ) : null}
          {PLAYPASS_CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Кто видит тренировку
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setVisibility("PUBLIC")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              visibility === "PUBLIC"
                ? "bg-emerald-600 text-white shadow"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            }`}
          >
            Публичная
          </button>
          <button
            type="button"
            onClick={() => setVisibility("PRIVATE")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              visibility === "PRIVATE"
                ? "bg-emerald-600 text-white shadow"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-200"
            }`}
          >
            По ссылке
          </button>
        </div>
        <p className="mt-2 text-xs text-zinc-500">
          Публичная — в каталоге по городу. По ссылке — только для тех, у кого
          есть ссылка.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Место *
        </label>
        <input
          required
          value={placeName}
          onChange={(e) => setPlaceName(e.target.value)}
          placeholder="Название зала или комплекса"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
        />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Адрес
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Например: г. Петрозаводск, ул. Ленина, 10"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
        />
      </div>

      <div
        id="schedule"
        className="rounded-2xl border border-zinc-100 bg-zinc-50/90 p-5 dark:border-zinc-800 dark:bg-zinc-900/50"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Когда
        </p>
        <div className="mt-3">
          <label className="block text-xs text-zinc-500">
            Дата и время начала *
          </label>
          <input
            type="datetime-local"
            required
            value={startsAtLocal}
            onChange={(e) => setStartsAtLocal(e.target.value)}
            className="mt-2 w-full max-w-md rounded-2xl border-2 border-zinc-200 bg-white px-4 py-3.5 text-base text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
        <div className="mt-5">
          <label className="block text-xs text-zinc-500">
            Продолжительность *
          </label>
          <select
            value={durationMinutes}
            onChange={(e) =>
              setDurationMinutes(
                Number(e.target.value) as (typeof DURATION_MINUTES_OPTIONS)[number],
              )
            }
            className="mt-2 w-full max-w-xs rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            {DURATION_MINUTES_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m} мин
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Лимит участников * (≥ 2)
        </label>
        <input
          type="number"
          required
          min={2}
          step={1}
          value={participantLimit}
          onChange={(e) => setParticipantLimit(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      <div>
        <label className="block text-xs font-medium uppercase tracking-wide text-zinc-500">
          Стоимость корта всего *
        </label>
        <input
          type="number"
          required
          min={0}
          step="0.01"
          value={courtPriceTotal}
          onChange={(e) => setCourtPriceTotal(e.target.value)}
          placeholder="Сумма аренды корта на всех"
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-600"
        />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm dark:border-zinc-700 dark:bg-zinc-900/60">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          Расчёт для участников
        </p>
        {preview ? (
          <ul className="mt-3 space-y-2 text-zinc-800 dark:text-zinc-200">
            <li className="flex justify-between gap-4">
              <span>Сервисный сбор платформы</span>
              <span className="text-right font-medium">
                {money.format(SERVICE_FEE_PER_PARTICIPANT)} с участника
                <span className="block text-xs font-normal text-zinc-500">
                  всего {money.format(preview.serviceTotal)}
                </span>
              </span>
            </li>
            <li className="flex justify-between gap-4 border-t border-zinc-200 pt-2 dark:border-zinc-700">
              <span>Итог к оплате</span>
              <span className="font-semibold">
                {money.format(Math.ceil(preview.totalWithAcquiring))}
              </span>
            </li>
            <li className="flex justify-between gap-4 text-base font-semibold text-emerald-800 dark:text-emerald-300">
              <span>Сумма с участника</span>
              <span>{money.format(preview.perParticipant)}</span>
            </li>
          </ul>
        ) : (
          <p className="mt-2 text-zinc-500">
            Укажите лимит участников (≥ 2) и стоимость корта — появится
            предпросмотр.
          </p>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Включая комиссию эквайринга. Менять эти параметры в форме не нужно —
          они задаются платформой.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || authLoading || !token}
        className="w-full rounded-full bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
      >
        {loading
          ? isEdit
            ? "Сохраняем…"
            : "Создаём…"
          : isEdit
            ? "Сохранить изменения"
            : "Создать тренировку"}
      </button>
    </form>
  );
}
