import { cn, STATUS_COLORS } from '@/lib/utils';

interface Props {
  status: string;
  className?: string;
}

export function Badge({ status, className }: Props) {
  const colors = STATUS_COLORS[status] || 'bg-gray-100 text-gray-700';
  return (
    <span className={cn('badge', colors, className)}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
