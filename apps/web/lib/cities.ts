/** Список городов MVP — расширяйте массив по мере масштабирования */
export const PLAYPASS_CITIES = ["Петрозаводск", "Сегежа"] as const;

export type PlaypassCity = (typeof PLAYPASS_CITIES)[number];

export const PLAYER_CITY_STORAGE_KEY = "playpass_player_city";
