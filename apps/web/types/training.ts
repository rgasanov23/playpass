/** Поля, которые отдаёт Prisma через Nest (JSON). Decimal приходят строками. */
export type Training = {
  id: string;
  createdAt: string;
  updatedAt: string;
  organizerId: string;
  title: string;
  description: string | null;
  city: string;
  sportType: string;
  placeName: string;
  address: string | null;
  startsAt: string;
  endsAt: string | null;
  participantLimit: number;
  courtPriceTotal: string | number;
  serviceFeePerParticipant: string | number;
  acquiringPercent: string | number;
  calculatedPricePerParticipant: string | number;
  status: string;
  visibility: string;
  joinToken: string;
};

/** Ответ GET /trainings/public — с подсчётом активных участников */
export type TrainingPublic = Training & {
  _count: { participations: number };
};
