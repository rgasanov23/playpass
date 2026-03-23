"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CreateTrainingForm } from "./create-training-form";
import { DashboardShell } from "@/components/dashboard-shell";
import { useAuth } from "@/components/auth-provider";

function CenteredSpinner({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-16">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      <p className="text-center text-sm text-zinc-500">{message}</p>
    </div>
  );
}

export default function NewTrainingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

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
      title="Новая тренировка"
      nav={[
        { href: "/organizer", label: "Кабинет" },
        { href: "/organizer/trainings/new", label: "Создать" },
        { href: "/", label: "Главная" },
      ]}
    >
      <p className="mt-2 text-sm text-zinc-500">
        Заполните поля — тренировка будет привязана к вашему аккаунту. После
        создания вы получите ссылку для игроков.
      </p>
      <CreateTrainingForm />
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
