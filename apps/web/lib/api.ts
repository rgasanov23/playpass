import type { AuthUser } from "@/types/auth";
import type { LoginResponse, RegisterResponse } from "@/types/auth";
import type { ParticipationWithRelations } from "@/types/participation";
import type { Payment } from "@/types/payment";
import type { CreateTrainingPayload, UpdateTrainingPayload } from "@/types/create-training";
import type { Training, TrainingPublic } from "@/types/training";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function messageFromValidationItem(item: unknown): string | undefined {
  if (typeof item === "string") return item;
  if (!item || typeof item !== "object") return undefined;
  const o = item as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  if (o.constraints && typeof o.constraints === "object") {
    const vals = Object.values(o.constraints as Record<string, string>);
    const parts = vals.filter((v) => typeof v === "string") as string[];
    if (parts.length) return parts.join("; ");
  }
  return undefined;
}

function extractMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const msg = (body as { message?: unknown }).message;
  if (typeof msg === "string") return msg;
  if (!Array.isArray(msg)) return undefined;

  const parts: string[] = [];
  for (const item of msg) {
    const s = messageFromValidationItem(item);
    if (s) parts.push(s);
  }
  if (parts.length) return parts.join(", ");

  if (msg.every((m) => typeof m === "string")) {
    return (msg as string[]).join(", ");
  }
  return undefined;
}

export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() ?? "";
  return raw.replace(/\/$/, "");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const base = getApiBaseUrl();
  if (!base) {
    throw new ApiError(
      0,
      "Не задан NEXT_PUBLIC_API_URL. Скопируйте .env.local.example в .env.local.",
    );
  }

  const { token, ...init } = options;
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);

  const isJsonBody =
    typeof init.body === "string" &&
    init.body.length > 0 &&
    !headers.has("Content-Type");
  if (isJsonBody) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let data: unknown;
  if (text) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      data = text;
    }
  } else {
    data = undefined;
  }

  if (!res.ok) {
    const msg =
      extractMessage(data) || (typeof data === "string" ? data : res.statusText);
    throw new ApiError(res.status, msg || "Ошибка запроса", data);
  }

  return data as T;
}

export async function fetchTrainings(): Promise<Training[]> {
  return apiFetch<Training[]>("/trainings");
}

/** Публичный каталог по городу (без авторизации). */
export async function fetchPublicTrainings(
  city?: string,
): Promise<TrainingPublic[]> {
  const q =
    city != null && city.trim() !== ""
      ? `?city=${encodeURIComponent(city.trim())}`
      : "";
  return apiFetch<TrainingPublic[]>(`/trainings/public${q}`);
}

export async function fetchTrainingByJoinToken(
  joinToken: string,
): Promise<Training> {
  return apiFetch<Training>(
    `/trainings/join/${encodeURIComponent(joinToken)}`,
  );
}

export async function createTraining(
  token: string,
  body: CreateTrainingPayload,
): Promise<Training> {
  return apiFetch<Training>("/trainings", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
}

export async function fetchTrainingById(id: string): Promise<Training> {
  return apiFetch<Training>(`/trainings/${encodeURIComponent(id)}`);
}

export async function updateTraining(
  token: string,
  id: string,
  body: UpdateTrainingPayload,
): Promise<Training> {
  return apiFetch<Training>(`/trainings/${encodeURIComponent(id)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(body),
  });
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(body: {
  email: string;
  password: string;
  fullName: string;
  role: "ORGANIZER" | "PLAYER";
}): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function fetchMe(token: string): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me", { token });
}

export async function createParticipation(
  token: string,
  trainingId: string,
): Promise<ParticipationWithRelations> {
  return apiFetch<ParticipationWithRelations>("/participations", {
    method: "POST",
    token,
    body: JSON.stringify({ trainingId }),
  });
}

export async function fetchParticipationsForTraining(
  trainingId: string,
): Promise<ParticipationWithRelations[]> {
  return apiFetch<ParticipationWithRelations[]>(
    `/participations/training/${encodeURIComponent(trainingId)}`,
  );
}

export async function fetchPaymentByParticipation(
  participationId: string,
): Promise<Payment> {
  return apiFetch<Payment>(
    `/payments/participation/${encodeURIComponent(participationId)}`,
  );
}
