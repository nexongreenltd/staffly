import { clsx, type ClassValue } from 'clsx';
import { format, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date | null): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy');
  } catch { return '—'; }
}

export function formatTime(date: string | Date | null): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'hh:mm a');
  } catch { return '—'; }
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy, hh:mm a');
  } catch { return '—'; }
}

export function formatHours(hours: number | null): string {
  if (hours == null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

export const STATUS_COLORS: Record<string, string> = {
  present:  'bg-green-100 text-green-800',
  late:     'bg-yellow-100 text-yellow-800',
  absent:   'bg-red-100 text-red-800',
  half_day: 'bg-orange-100 text-orange-800',
  holiday:  'bg-blue-100 text-blue-800',
  weekend:  'bg-gray-100 text-gray-600',
  on_leave: 'bg-purple-100 text-purple-800',
  active:   'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-600',
  error:    'bg-red-100 text-red-800',
  pending:  'bg-yellow-100 text-yellow-800',
  enrolled: 'bg-green-100 text-green-800',
  disabled: 'bg-red-100 text-red-800',
};

export function exportToCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const rows = [
    headers.join(','),
    ...data.map((row) =>
      headers.map((h) => JSON.stringify(row[h] ?? '')).join(','),
    ),
  ].join('\n');
  const blob = new Blob([rows], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
