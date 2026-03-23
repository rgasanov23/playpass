const SPORT_LABELS: Record<string, string> = {
  VOLLEYBALL: "Волейбол",
  FOOTBALL: "Футбол",
  BASKETBALL: "Баскетбол",
  TENNIS: "Теннис",
  PADEL: "Падел",
  OTHER: "Другое",
};

export function sportTypeLabel(code: string): string {
  return SPORT_LABELS[code] ?? code;
}
