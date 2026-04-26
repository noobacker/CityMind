export interface NycNow {
  timezone: string;
  isoUtc: string;
  localDate: string;
  localTime: string;
  weekday: string;
  month: string;
  day: number;
  year: number;
  readableDate: string;
}

const DEFAULT_TIMEZONE = process.env.CITY_TIMEZONE || 'America/New_York';

function getParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).formatToParts(date);

  const lookup = (type: Intl.DateTimeFormatPartTypes): string => {
    const found = parts.find((part) => part.type === type)?.value;
    return found ?? '';
  };

  return {
    weekday: lookup('weekday'),
    month: lookup('month'),
    day: Number(lookup('day') || 0),
    year: Number(lookup('year') || 0),
    hour: lookup('hour'),
    minute: lookup('minute'),
    second: lookup('second'),
    dayPeriod: lookup('dayPeriod'),
  };
}

export function getNycNow(now = new Date()): NycNow {
  const parts = getParts(now, DEFAULT_TIMEZONE);
  const localDate = `${parts.year}-${String(new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIMEZONE,
    month: '2-digit',
  }).format(now)).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

  return {
    timezone: DEFAULT_TIMEZONE,
    isoUtc: now.toISOString(),
    localDate,
    localTime: `${parts.hour}:${parts.minute}:${parts.second} ${parts.dayPeriod}`,
    weekday: parts.weekday,
    month: parts.month,
    day: parts.day,
    year: parts.year,
    readableDate: `${parts.weekday}, ${parts.month} ${parts.day}, ${parts.year}`,
  };
}

export function isDateTimeQuestion(text: string): boolean {
  const value = text.toLowerCase();
  return /\b(date|day|today|year|time|month|weekday)\b/.test(value) || /what\s+day|what\s+date|what\s+year|today\??/.test(value);
}

export function buildDateTimeReply(text: string, now: NycNow): string {
  const value = text.toLowerCase();
  const asksYear = /\byear\b|what\s+year/.test(value);
  const asksTime = /\btime\b|what\s+time/.test(value);
  const asksDateOrDay = /\bdate\b|\bday\b|today|weekday|month/.test(value);

  if (asksYear && !asksDateOrDay) {
    return `It is ${now.year}. In my timezone (${now.timezone}), I am tracking live time.`;
  }

  if (asksTime && !asksDateOrDay) {
    return `Right now in New York, it is ${now.localTime} on ${now.readableDate}.`;
  }

  return `Today in New York is ${now.readableDate}. Current local time is ${now.localTime}.`;
}