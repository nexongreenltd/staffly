'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, Monitor, CalendarCheck, Clock,
  LogOut, Fingerprint, ChevronRight, UserCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuth, getUser } from '@/lib/auth';
import { useRouter } from 'next/navigation';

const ALL_NAV = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard, roles: ['company_admin', 'employee'] },
  { href: '/employees',     label: 'Employees',    icon: Users,           roles: ['company_admin'] },
  { href: '/devices',       label: 'Devices',      icon: Monitor,         roles: ['company_admin'] },
  { href: '/attendance',    label: 'Attendance',   icon: CalendarCheck,   roles: ['company_admin'] },
  { href: '/shifts',        label: 'Shifts',       icon: Clock,           roles: ['company_admin'] },
  { href: '/my-attendance', label: 'My Attendance', icon: CalendarCheck,  roles: ['employee'] },
  { href: '/my-profile',    label: 'My Profile',   icon: UserCircle,      roles: ['employee'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const user = getUser();
  const role = user?.role ?? 'employee';
  const NAV = ALL_NAV.filter((item) => item.roles.includes(role));

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <aside className="w-64 h-screen flex flex-col bg-gray-900 text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-700">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600">
          <Fingerprint className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm">Staffly</p>
          <p className="text-xs text-gray-400">HRM System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
