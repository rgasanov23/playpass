import Link from "next/link";
import { sportTypeLabel } from "@/lib/sport-labels";
import type { TrainingPublic } from "@/types/training";

function formatCardDateTime(iso: string): string {
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

function formatMoney(v: string | number | undefined): string {
  if (v === undefined || v === null) return "—";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function occupancyStatus(
  occupied: number,
  limit: number,
): { label: string; className: string } {
  if (limit <= 0) {
    return {
      label: "Есть места",
      className: "text-emerald-600 dark:text-emerald-400",
    };
  }
  const ratio = occupied / limit;
  if (ratio >= 1) {
    return { label: "Нет мест", className: "text-red-600 dark:text-red-400" };
  }
  if (ratio >= 0.8) {
    return {
      label: "Почти заполнено",
      className: "text-amber-600 dark:text-amber-400",
    };
  }
  return {
    label: "Есть места",
    className: "text-emerald-600 dark:text-emerald-400",
  };
}

export type PublicTrainingCardVariant = "full" | "compact";

export function PublicTrainingCard({
  training: t,
  variant = "full",
}: {
  training: TrainingPublic;
  variant?: PublicTrainingCardVariant;
}) {
  const occupied = t._count.participations;
  const limit = t.participantLimit;
  const fullStatus =
    variant === "full" ? occupancyStatus(occupied, limit) : undefined;
  const href = `/join/${encodeURIComponent(t.joinToken)}`;

  return (
    <li>
      <Link
        href={href}
        className="group block cursor-pointer rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
              {t.city}
            </p>
            <h3 className="mt-1 text-base font-semibold text-zinc-900 group-hover:text-emerald-800 dark:text-zinc-50 dark:group-hover:text-emerald-300">
              {t.title}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {t.placeName}
              {t.address ? ` · ${t.address}` : null}
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {formatCardDateTime(t.startsAt)}
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              {sportTypeLabel(t.sportType)}
            </p>
            {fullStatus ? (
              <>
                <p className="mt-2 text-sm text-zinc-600">
                  Заполненность:{" "}
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {occupied} из {limit} мест
                  </span>
                </p>
                <p className={`mt-1 text-sm font-medium ${fullStatus.className}`}>
                  {fullStatus.label}
                </p>
              </>
            ) : null}
            <p className="mt-3 text-xl font-bold text-zinc-900 dark:text-zinc-50">
              {formatMoney(t.calculatedPricePerParticipant)}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center justify-center self-start rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white group-hover:bg-emerald-700 sm:self-center">
            Подробнее
          </span>
        </div>
      </Link>
    </li>
  );
}
