export type Period = "24h" | "7d" | "30d" | "90d" | "365d";
export type Counts = { visits: number; views: number; visitors: number; plays: number; adminActions: number };
export type SeriesPoint = Counts & { at: string; admins: Record<string, number> };
export type AdminStats = { id: number; username: string; actions: number; logins: number; changes: number; lastAt: string; lastAction: string };
export type SiteStats = {
  period: Period; timezone: string; updatedAt: string; startedAt: string; summary: Counts; series: SeriesPoint[];
  topTracks: { id: number; title: string; artist: string; coverUrl: string; plays: number; deleted: boolean }[];
  admins: AdminStats[];
};
type Capacity = { total: number; used: number; percent: number };
export type ServerStats = {
  at: string; scope: string; uptime: number | null; catalogTracks: number;
  cpu: { percent: number | null; count: number; cores: number[]; load: number[] | null };
  memory: (Capacity & { available: number }) | null;
  swap: Capacity | null;
  disk: (Capacity & { free: number }) | null;
  diskIo: { read: number; write: number } | null;
  network: { received: number; sent: number; interfaces: string[] } | null;
  storage: { audio: { count: number; bytes: number }; images: { count: number; bytes: number }; incomplete: boolean };
};

export const number = (value: number) => new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
export function bytes(value: number | undefined | null) {
  if (value == null) return "—";
  const units = ["Б", "КиБ", "МиБ", "ГиБ", "ТиБ"];
  const index = Math.min(4, Math.max(0, Math.floor(Math.log2(Math.max(value, 1)) / 10)));
  return `${number(value / 1024 ** index)} ${units[index]}`;
}
export function dateTime(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Irkutsk", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
