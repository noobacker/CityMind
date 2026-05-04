type FetchStatus = 'cache-hit' | 'live' | 'fallback' | 'error' | 'synthetic';

interface FetchLogDetails {
  source: string;
  status: FetchStatus;
  detail?: string;
  count?: number;
}

export function logFetcher(details: FetchLogDetails): void {
  const message = `[citymind][${details.source}] ${details.status}` +
    (details.detail ? ` - ${details.detail}` : '') +
    (typeof details.count === 'number' ? ` (count=${details.count})` : '');

  if (details.status === 'error' || details.status === 'fallback') {
    console.warn(message);
    return;
  }

  console.info(message);
}