'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Users, UserCheck, UserX, Clock, Monitor, TrendingUp,
  CalendarCheck, AlertCircle,
} from 'lucide-react';
import {
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/ui/StatsCard';
import { attendanceApi, employeesApi, devicesApi, myAttendanceApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getUser } from '@/lib/auth';

const today = format(new Date(), 'yyyy-MM-dd');
const PIE_COLORS = ['#16a34a', '#ca8a04', '#dc2626', '#9333ea', '#2563eb'];

const STATUS_STYLE: Record<string, string> = {
  present:  'bg-green-100 text-green-700',
  late:     'bg-yellow-100 text-yellow-700',
  absent:   'bg-red-100 text-red-700',
  half_day: 'bg-orange-100 text-orange-700',
  on_leave: 'bg-blue-100 text-blue-700',
  holiday:  'bg-purple-100 text-purple-700',
  weekend:  'bg-gray-100 text-gray-500',
};

function EmployeeDashboard() {
  const now = new Date();
  const { data: daily, isLoading } = useQuery({
    queryKey: ['my-daily', today],
    queryFn: () => myAttendanceApi.daily(today),
  });

  const { data: monthly } = useQuery({
    queryKey: ['my-monthly', now.getFullYear(), now.getMonth() + 1],
    queryFn: () => myAttendanceApi.monthly(now.getFullYear(), now.getMonth() + 1),
  });

  const rec = daily?.data?.[0];
  const s = monthly?.summary;

  return (
    <div className="p-6 space-y-6">
      <p className="text-sm text-gray-500">{format(now, 'EEEE, MMMM d, yyyy')}</p>

      {/* Today's status */}
      <div>
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Today</h2>
        {isLoading ? (
          <div className="card p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : rec ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Check In</p>
                <p className="text-lg font-semibold text-gray-900">
                  {rec.checkIn ? format(new Date(rec.checkIn), 'hh:mm a') : '—'}
                </p>
              </div>
            </div>

            <div className="card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Check Out</p>
                <p className="text-lg font-semibold text-gray-900">
                  {rec.checkOut ? format(new Date(rec.checkOut), 'hh:mm a') : '—'}
                </p>
              </div>
            </div>

            <div className="card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Working Hours</p>
                <p className="text-lg font-semibold text-gray-900">
                  {rec.workingMinutes ? `${Math.floor(rec.workingMinutes / 60)}h ${rec.workingMinutes % 60}m` : '—'}
                </p>
              </div>
            </div>

            <div className="card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <span className={cn('badge mt-1 text-xs capitalize', STATUS_STYLE[rec.status] || 'bg-gray-100 text-gray-600')}>
                  {rec.status?.replace('_', ' ')}
                </span>
              </div>
            </div>

            {rec.lateMinutes > 0 && (
              <div className="col-span-full flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                You were {rec.lateMinutes} minutes late today.
              </div>
            )}
            {rec.overtimeMinutes > 0 && (
              <div className="col-span-full flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-4 py-3">
                <TrendingUp className="w-4 h-4 shrink-0" />
                {rec.overtimeMinutes} minutes overtime — great work!
              </div>
            )}
          </div>
        ) : (
          <div className="card p-8 text-center text-sm text-gray-400">
            No attendance record for today yet.
          </div>
        )}
      </div>

      {/* This month summary */}
      {s && (
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            {format(now, 'MMMM yyyy')} Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Present',     value: s.present,   color: 'text-green-600' },
              { label: 'Late',        value: s.late,      color: 'text-yellow-600' },
              { label: 'Absent',      value: s.absent,    color: 'text-red-600' },
              { label: 'Half Day',    value: s.halfDay,   color: 'text-orange-600' },
              { label: 'On Leave',    value: s.onLeave,   color: 'text-blue-600' },
              { label: 'Working Hrs', value: s.totalWorkingHours ? `${s.totalWorkingHours.toFixed(1)}h` : '—', color: 'text-purple-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="card p-4 text-center">
                <p className={cn('text-2xl font-bold', color)}>{value ?? 0}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminDashboard() {
  const { data: summary } = useQuery({
    queryKey: ['attendance-summary', today],
    queryFn: () => attendanceApi.summary(today),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees-count'],
    queryFn: () => employeesApi.list({ limit: 1 }),
  });

  const { data: devices } = useQuery({
    queryKey: ['devices'],
    queryFn: () => devicesApi.list(),
  });

  const { data: dailyData } = useQuery({
    queryKey: ['attendance-daily', today],
    queryFn: () => attendanceApi.daily({ date: today, limit: 5 }),
  });

  const pieData = summary
    ? [
        { name: 'Present', value: summary.present - summary.late },
        { name: 'Late', value: summary.late },
        { name: 'Absent', value: summary.absent },
        { name: 'On Leave', value: summary.onLeave },
        { name: 'Holiday', value: summary.holiday },
      ].filter((d) => d.value > 0)
    : [];

  const total = employees?.total || 0;
  const activeDevices = devices?.filter((d: any) => d.status === 'active').length || 0;

  return (
    <div className="p-6 space-y-6">
      <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="Total Employees" value={total} icon={Users} color="blue" />
        <StatsCard
          title="Present Today"
          value={summary?.present || 0}
          subtitle={`${summary?.late || 0} late`}
          icon={UserCheck}
          color="green"
        />
        <StatsCard title="Absent Today" value={summary?.absent || 0} icon={UserX} color="red" />
        <StatsCard
          title="Active Devices"
          value={activeDevices}
          subtitle={`${devices?.length || 0} total`}
          icon={Monitor}
          color="purple"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Today's Attendance</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-60 flex items-center justify-center text-gray-400 text-sm">
              No data yet for today
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Recent Check-ins</h2>
          <div className="space-y-3">
            {dailyData?.data?.slice(0, 6).map((rec: any) => (
              <div key={rec.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-medium shrink-0">
                    {rec.employee?.firstName?.[0]}{rec.employee?.lastName?.[0]}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {rec.employee?.firstName} {rec.employee?.lastName}
                    </p>
                    <p className="text-xs text-gray-400">{rec.employee?.designation || 'Employee'}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-sm font-mono text-gray-700">
                    {rec.checkIn ? format(new Date(rec.checkIn), 'hh:mm a') : '—'}
                  </p>
                  <span className={`badge text-xs ${rec.status === 'late' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                    {rec.status}
                  </span>
                </div>
              </div>
            ))}
            {!dailyData?.data?.length && (
              <p className="text-sm text-gray-400 text-center py-6">No attendance data today</p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Device Status</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="table-header">Device</th>
                <th className="table-header">IP Address</th>
                <th className="table-header">Location</th>
                <th className="table-header">Status</th>
                <th className="table-header">Last Synced</th>
              </tr>
            </thead>
            <tbody>
              {devices?.map((d: any) => (
                <tr key={d.id} className="border-b border-gray-50">
                  <td className="table-cell font-medium">{d.name}</td>
                  <td className="table-cell font-mono text-xs">{d.ipAddress}</td>
                  <td className="table-cell">{d.location || '—'}</td>
                  <td className="table-cell">
                    <span className={`badge ${
                      d.status === 'active' ? 'bg-green-100 text-green-700' :
                      d.status === 'error'  ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{d.status}</span>
                  </td>
                  <td className="table-cell text-gray-400">
                    {d.lastSyncedAt ? format(new Date(d.lastSyncedAt), 'dd MMM, hh:mm a') : 'Never'}
                  </td>
                </tr>
              ))}
              {!devices?.length && (
                <tr>
                  <td colSpan={5} className="table-cell text-center text-gray-400 py-6">No devices registered</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const user = getUser();
  const isEmployee = user?.role === 'employee';

  return (
    <div>
      <Header title="Dashboard" />
      {isEmployee ? <EmployeeDashboard /> : <AdminDashboard />}
    </div>
  );
}
