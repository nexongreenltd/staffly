'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Building2, LogOut, Shield, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { clearAuth } from '@/lib/auth';

const NAV = [
  { href: '/superadmin/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/superadmin/companies',  label: 'Companies',  icon: Building2 },
];

export function SuperadminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <aside className="w-64 h-screen flex flex-col bg-slate-900 text-white shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-600">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm">Staffly</p>
          <p className="text-xs text-violet-400 font-medium">Super Admin</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* Role badge + logout */}
      <div className="p-3 border-t border-slate-700 space-y-2">
        <div className="px-3 py-2 rounded-lg bg-slate-800">
          <p className="text-xs text-slate-400">Logged in as</p>
          <p className="text-xs font-semibold text-violet-300">Super Administrator</p>
        </div>
        <button
          onClick={() => { clearAuth(); router.push('/login'); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
