export interface CityNow {
  cityName: string;
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

// Backwards-compat alias
export type NycNow = CityNow;

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

export function getCityNow(options: { cityName: string; timezone: string }, now = new Date()): CityNow {
  const tz = options.timezone || 'UTC';
  const parts = getParts(now, tz);
  const localDate = `${parts.year}-${String(new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    month: '2-digit',
  }).format(now)).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;

  return {
    cityName: options.cityName,
    timezone: tz,
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

// Backwards-compat: defaults to NYC
export function getNycNow(now = new Date()): CityNow {
  return getCityNow({ cityName: 'New York City', timezone: 'America/New_York' }, now);
}

export function isDateTimeQuestion(text: string): boolean {
  const value = text.toLowerCase();
  return /\b(date|day|today|year|time|month|weekday)\b/.test(value) || /what\s+day|what\s+date|what\s+year|today\??/.test(value);
}

export function buildDateTimeReply(text: string, now: CityNow): string {
  const value = text.toLowerCase();
  const asksYear = /\byear\b|what\s+year/.test(value);
  const asksTime = /\btime\b|what\s+time/.test(value);
  const asksDateOrDay = /\bdate\b|\bday\b|today|weekday|month/.test(value);

  if (asksYear && !asksDateOrDay) {
    return `It is ${now.year}. In ${now.cityName} (${now.timezone}), I am tracking live time.`;
  }
  if (asksTime && !asksDateOrDay) {
    return `Right now in ${now.cityName}, it is ${now.localTime} on ${now.readableDate}.`;
  }
  return `Today in ${now.cityName} is ${now.readableDate}. Current local time is ${now.localTime}.`;
}
