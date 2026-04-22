'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Users, UserCheck, UserX, Clock, Monitor, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/ui/StatsCard';
import { attendanceApi, employeesApi, devicesApi } from '@/lib/api';
import { formatHours } from '@/lib/utils';

const today = format(new Date(), 'yyyy-MM-dd');

const PIE_COLORS = ['#16a34a', '#ca8a04', '#dc2626', '#9333ea', '#2563eb'];

export default function DashboardPage() {
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
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Date badge */}
        <p className="text-sm text-gray-500">
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Employees"
            value={total}
            icon={Users}
            color="blue"
          />
          <StatsCard
            title="Present Today"
            value={summary?.present || 0}
            subtitle={`${summary?.late || 0} late`}
            icon={UserCheck}
            color="green"
          />
          <StatsCard
            title="Absent Today"
            value={summary?.absent || 0}
            icon={UserX}
            color="red"
          />
          <StatsCard
            title="Active Devices"
            value={activeDevices}
            subtitle={`${devices?.length || 0} total`}
            icon={Monitor}
            color="purple"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Pie chart */}
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

          {/* Recent attendance */}
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

        {/* Device status */}
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
    </div>
  );
}
