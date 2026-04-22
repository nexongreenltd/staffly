'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Building2, Users, Monitor, Database,
  CheckCircle, XCircle, TrendingUp, Activity,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/ui/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { superadminApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

export default function SuperadminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['superadmin-stats'],
    queryFn: superadminApi.stats,
    refetchInterval: 30_000,
  });

  const { data: recent } = useQuery({
    queryKey: ['superadmin-activity'],
    queryFn: superadminApi.activity,
  });

  const subData = stats
    ? Object.entries(stats.companies.bySubscription).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        count: value,
      }))
    : [];

  return (
    <div>
      <Header title="System Overview" />
      <div className="p-6 space-y-6">

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Companies"
            value={stats?.companies.total ?? '—'}
            subtitle={`${stats?.companies.active ?? 0} active`}
            icon={Building2}
            color="purple"
          />
          <StatsCard
            title="Total Employees"
            value={stats?.employees.total ?? '—'}
            subtitle="across all tenants"
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Biometric Devices"
            value={stats?.devices.total ?? '—'}
            subtitle={`${stats?.devices.active ?? 0} connected`}
            icon={Monitor}
            color="green"
          />
          <StatsCard
            title="Attendance Logs"
            value={stats?.attendanceLogs.total ?? '—'}
            subtitle="total raw punches"
            icon={Database}
            color="yellow"
          />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-5 flex items-center gap-4 bg-green-50">
            <CheckCircle className="w-10 h-10 text-green-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-green-700">{stats?.companies.active ?? '—'}</p>
              <p className="text-sm text-green-600">Active Companies</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4 bg-red-50">
            <XCircle className="w-10 h-10 text-red-400 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-red-700">{stats?.companies.inactive ?? '—'}</p>
              <p className="text-sm text-red-600">Inactive Companies</p>
            </div>
          </div>
          <div className="card p-5 flex items-center gap-4 bg-blue-50">
            <TrendingUp className="w-10 h-10 text-blue-500 shrink-0" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{stats?.companies.newThisMonth ?? '—'}</p>
              <p className="text-sm text-blue-600">New This Month</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Subscriptions bar chart */}
          <div className="card p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Companies by Subscription</h2>
            {subData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={subData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-300 text-sm">
                No data yet
              </div>
            )}
          </div>

          {/* Recent companies */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700">Recently Registered</h2>
              <Activity className="w-4 h-4 text-gray-400" />
            </div>
            <div className="space-y-3">
              {recent?.recentCompanies?.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-bold shrink-0">
                      {c.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{c.slug}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <Badge status={c.isActive ? 'active' : 'inactive'} />
                    <p className="text-xs text-gray-400 mt-0.5">{formatDate(c.createdAt)}</p>
                  </div>
                </div>
              ))}
              {!recent?.recentCompanies?.length && (
                <p className="text-sm text-gray-400 text-center py-6">No companies yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
