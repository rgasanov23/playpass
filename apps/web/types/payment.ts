export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "REFUNDED";

export type Payment = {
  id: string;
  createdAt: string;
  updatedAt: string;
  trainingId: string;
  userId: string;
  amount: string | number;
  currency: string;
  provider: string;
  providerPaymentId: string | null;
  status: PaymentStatus;
  paidAt: string | null;
  metadata: unknown;
  participation?: unknown;
};
