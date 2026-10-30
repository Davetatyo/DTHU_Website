// Time zone helpers built on Intl, so no date library is needed.

export const DEFAULT_TIMEZONE = "Europe/Budapest";

function offsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Converts a `datetime-local` value ("2026-10-28T20:00") in the given zone to a UTC Date. */
export function wallTimeToUtc(local: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local);
  if (!match) throw new Error(`Érvénytelen időpont: ${local}`);
  const [, y, mo, d, h, mi] = match.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = offsetMs(new Date(guess), timeZone);
  const second = offsetMs(new Date(guess - first), timeZone);
  return new Date(guess - second);
}

/** Converts a UTC instant to a `datetime-local` value in the given zone. */
export function utcToWallTime(date: Date, timeZone: string): string {
  const shifted = new Date(date.getTime() + offsetMs(date, timeZone));
  return shifted.toISOString().slice(0, 16);
}

/** "okt. 28., kedd 20:00" */
export function formatDateTime(value: string | Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone,
    month: "short",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** "október 28., szerda" */
export function formatDay(value: string | Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("hu-HU", {
    timeZone,
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(value));
}

export function formatTime(value: string | Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("hu-HU", { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

/** "okt. 30., P" (date without time, for compact rows). */
export function formatShortDate(value: string | Date, timeZone = DEFAULT_TIMEZONE): string {
  return new Intl.DateTimeFormat("hu-HU", { timeZone, month: "short", day: "numeric", weekday: "short" }).format(new Date(value));
}

/** Time left until a deadline: "2 nap 21 óra", "5 óra", or "lejárt". */
export function timeLeft(deadline: string | Date, now: Date = new Date()): string {
  const ms = new Date(deadline).getTime() - now.getTime();
  if (ms <= 0) return "lejárt";
  const hours = Math.floor(ms / 3600_000);
  const days = Math.floor(hours / 24);
  return days > 0 ? `${days} nap ${hours % 24} óra` : `${hours} óra`;
}

export function dayKey(value: string | Date, timeZone = DEFAULT_TIMEZONE): string {
  return utcToWallTime(new Date(value), timeZone).slice(0, 10);
}

export type PickerDay = { key: string; weekday: string; day: number; month: string; label: string };

const MAX_PICKER_DAYS = 21;

/** Calendar days between two wall times ("2026-10-27T18:00"), labelled in Hungarian, for the slot picker. */
export function pickerDays(minWall: string, maxWall: string): PickerDay[] {
  const toUtcDay = (wall: string) => Date.parse(`${wall.slice(0, 10)}T00:00:00Z`);
  const days: PickerDay[] = [];
  for (let t = toUtcDay(minWall); t <= toUtcDay(maxWall) && days.length < MAX_PICKER_DAYS; t += 86_400_000) {
    const date = new Date(t);
    const fmt = (options: Intl.DateTimeFormatOptions) =>
      new Intl.DateTimeFormat("hu-HU", { timeZone: "UTC", ...options }).format(date);
    days.push({
      key: date.toISOString().slice(0, 10),
      weekday: fmt({ weekday: "short" }),
      day: date.getUTCDate(),
      month: fmt({ month: "short" }),
      label: fmt({ month: "short", day: "numeric", weekday: "long" }),
    });
  }
  return days;
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}
