/** Тело POST /trainings — совпадает с CreateTrainingDto в Nest */
export type CreateTrainingSportType =
  | "VOLLEYBALL"
  | "FOOTBALL"
  | "BASKETBALL"
  | "TENNIS"
  | "PADEL"
  | "OTHER";

export type CreateTrainingPayload = {
  title: string;
  description?: string;
  sportType: CreateTrainingSportType;
  city: string;
  placeName: string;
  address?: string;
  startsAt: string;
  endsAt?: string;
  participantLimit: number;
  courtPriceTotal: number;
  serviceFeePerParticipant: number;
  acquiringPercent: number;
  visibility?: "PUBLIC" | "PRIVATE";
};

export type UpdateTrainingPayload = Partial<CreateTrainingPayload> & {
  status?: "CANCELLED";
};
