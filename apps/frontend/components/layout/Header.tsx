'use client';

import { Bell, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getUser } from '@/lib/auth';

interface Props { title: string; }

export function Header({ title }: Props) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => { setUser(getUser()); }, []);

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 w-52"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* Avatar */}
        {user && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-medium">
              {user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-medium text-gray-700 leading-none">{user.email}</p>
              <p className="text-xs text-gray-400 capitalize mt-0.5">{user.role?.replace('_', ' ')}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
