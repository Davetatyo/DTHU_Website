// iCalendar (.ics) output for Google, Apple and Outlook calendars.

export const MATCH_DURATION_MINUTES = 60;

export type CalendarEvent = {
  uid: string;
  start: Date;
  title: string;
  description: string;
  url: string;
};

function icsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Lines longer than 75 bytes must be folded (RFC 5545 §3.1).
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let size = 0;
  for (const char of line) {
    const charSize = new TextEncoder().encode(char).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (size + charSize > limit) {
      out.push(current);
      current = "";
      size = 0;
    }
    current += char;
    size += charSize;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildCalendar(name: string, events: CalendarEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//DT Match Organizer//HU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const event of events) {
    const end = new Date(event.start.getTime() + MATCH_DURATION_MINUTES * 60_000);
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${icsDate(now)}`,
      `DTSTART:${icsDate(event.start)}`,
      `DTEND:${icsDate(end)}`,
      `SUMMARY:${escapeText(event.title)}`,
      `DESCRIPTION:${escapeText(event.description)}`,
      `URL:${event.url}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const end = new Date(event.start.getTime() + MATCH_DURATION_MINUTES * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${icsDate(event.start)}/${icsDate(end)}`,
    details: `${event.description}\n${event.url}`,
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Link that makes Google Calendar subscribe to a feed (it refreshes it every few hours). */
export function googleSubscribeUrl(feedUrl: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl.replace(/^https?:/, "webcal:"))}`;
}

export function webcalUrl(feedUrl: string): string {
  return feedUrl.replace(/^https?:/, "webcal:");
}
