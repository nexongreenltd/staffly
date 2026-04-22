import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'green' | 'yellow' | 'red' | 'blue' | 'purple' | 'gray';
}

const COLOR_MAP = {
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600',  text: 'text-green-700'  },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-700' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',       text: 'text-red-700'    },
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',     text: 'text-blue-700'   },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-700' },
  gray:   { bg: 'bg-gray-50',   icon: 'bg-gray-100 text-gray-600',     text: 'text-gray-700'   },
};

export function StatsCard({ title, value, subtitle, icon: Icon, color = 'blue' }: Props) {
  const c = COLOR_MAP[color];
  return (
    <div className={cn('card p-5 flex items-center gap-4', c.bg)}>
      <div className={cn('flex items-center justify-center w-12 h-12 rounded-xl shrink-0', c.icon)}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500 truncate">{title}</p>
        <p className={cn('text-2xl font-bold', c.text)}>{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
