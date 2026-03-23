import type { Payment } from "./payment";
import type { AuthUser } from "./auth";
import type { Training } from "./training";

export type ParticipationStatus =
  | "PENDING_PAYMENT"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED";

export type ParticipationWithRelations = {
  id: string;
  createdAt: string;
  updatedAt: string;
  trainingId: string;
  userId: string;
  status: ParticipationStatus;
  paymentId: string | null;
  joinedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  /** ISO datetime от backend; может отсутствовать у старых записей */
  holdExpiresAt?: string | null;
  source?: string;
  user?: AuthUser | { id: string; fullName: string; email?: string | null };
  training?: Training;
  payment?: Payment | null;
};
