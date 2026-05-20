const GBP_FORMATTER = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
});

const DATETIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: 'short',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatCurrency(amount: number): string {
  return GBP_FORMATTER.format(amount);
}

export function formatDate(isoDate: string | null): string {
  if (isoDate === null || isoDate === '') return '—';
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return '—';
  return DATE_FORMATTER.format(parsed);
}

export function formatDateTime(isoDateTime: string | null | undefined): string {
  if (isoDateTime === null || isoDateTime === undefined || isoDateTime === '') return '—';
  const parsed = new Date(isoDateTime);
  if (Number.isNaN(parsed.getTime())) return '—';
  return DATETIME_FORMATTER.format(parsed);
}

export function titleCaseFromSnake(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map((word) => (word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
    .join(' ');
}
