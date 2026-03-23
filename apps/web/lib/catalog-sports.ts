/**
 * Фильтры каталога по виду спорта (клиентская фильтрация по training.sportType).
 * Расширяйте массив при появлении новых видов в API.
 *
 * «Танцы» в MVP сопоставлены с enum OTHER — при появлении отдельного типа в бэкенде
 * замените value.
 */
export const CATALOG_SPORT_FILTERS: {
  label: string;
  value: string | null;
}[] = [
  { label: "Все", value: null },
  { label: "Волейбол", value: "VOLLEYBALL" },
  { label: "Баскетбол", value: "BASKETBALL" },
  { label: "Футбол", value: "FOOTBALL" },
  { label: "Танцы", value: "OTHER" },
  { label: "Теннис", value: "TENNIS" },
];
