"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, fetchTrainingById } from "@/lib/api";
import { CreateTrainingForm } from "../../new/create-training-form";
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

export default function EditTrainingPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const router = useRouter();
  const { user, loading } = useAuth();
  const [training, setTraining] = useState<Training | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingTraining, setLoadingTraining] = useState(true);

  const loginNext = `/organizer/trainings/${id}/edit`;

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(loginNext)}`);
      return;
    }
    if (user.role !== "ORGANIZER") {
      router.replace("/player");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoadingTraining(true);
      setLoadError(null);
      try {
        const t = await fetchTrainingById(id);
        if (cancelled) return;
        setTraining(t);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof ApiError ? e.message : "Не удалось загрузить тренировку.",
          );
          setTraining(null);
        }
      } finally {
        if (!cancelled) setLoadingTraining(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!training || !user || user.role !== "ORGANIZER") return;
    if (training.organizerId !== user.id) {
      router.replace("/organizer");
    }
  }, [training, user, router]);

  useEffect(() => {
    if (!training || typeof window === "undefined") return;
    if (window.location.hash === "#schedule") {
      window.requestAnimationFrame(() => {
        document.getElementById("schedule")?.scrollIntoView({ behavior: "smooth" });
      });
    }
  }, [training]);

  if (loading || !user || user.role !== "ORGANIZER") {
    return <CenteredSpinner message="Проверяем авторизацию…" />;
  }

  if (loadingTraining) {
    return (
      <DashboardShell
        title="Редактирование"
        nav={[
          { href: "/organizer", label: "Кабинет" },
          { href: "/organizer/trainings/new", label: "Создать" },
          { href: "/", label: "Главная" },
        ]}
      >
        <p className="mt-4 text-sm text-zinc-500">Загрузка…</p>
      </DashboardShell>
    );
  }

  if (loadError || !training || training.organizerId !== user.id) {
    return (
      <DashboardShell
        title="Ошибка"
        nav={[{ href: "/organizer", label: "Кабинет" }]}
      >
        <p className="mt-4 text-sm text-red-600">
          {loadError ?? "Тренировка не найдена или нет доступа."}
        </p>
        <Link
          href="/organizer"
          className="mt-4 inline-block text-emerald-700 underline dark:text-emerald-400"
        >
          В кабинет
        </Link>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Редактирование тренировки"
      nav={[
        { href: "/organizer", label: "Кабинет" },
        { href: `/organizer/trainings/${id}/edit`, label: "Редактировать" },
        { href: "/", label: "Главная" },
      ]}
    >
      <p className="mt-2 text-sm text-zinc-500">
        Измените поля и сохраните. Время и длительность можно поменять в блоке
        «Когда».
      </p>
      <CreateTrainingForm
        mode="edit"
        trainingId={id}
        initialTraining={training}
        loginRedirectPath={loginNext}
      />
      <p className="mt-6 text-center text-sm">
        <Link
          href="/organizer"
          className="text-emerald-700 underline dark:text-emerald-400"
        >
          Назад в кабинет
        </Link>
      </p>
    </DashboardShell>
  );
}
