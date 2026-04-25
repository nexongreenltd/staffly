'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday } from 'date-fns';
import { CalendarCheck, Clock, TrendingUp, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { myAttendanceApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  present:  'bg-green-100 text-green-700',
  late:     'bg-yellow-100 text-yellow-700',
  absent:   'bg-red-100 text-red-700',
  half_day: 'bg-orange-100 text-orange-700',
  on_leave: 'bg-blue-100 text-blue-700',
  holiday:  'bg-purple-100 text-purple-700',
  weekend:  'bg-gray-100 text-gray-500',
};

export default function MyAttendancePage() {
  const [tab, setTab] = useState<'daily' | 'monthly'>('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [month, setMonth] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1 });

  const { data: daily, isLoading: dailyLoading } = useQuery({
    queryKey: ['my-daily', date],
    queryFn: () => myAttendanceApi.daily(date),
    enabled: tab === 'daily',
  });

  const { data: monthly, isLoading: monthlyLoading } = useQuery({
    queryKey: ['my-monthly', month.year, month.month],
    queryFn: () => myAttendanceApi.monthly(month.year, month.month),
    enabled: tab === 'monthly',
  });

  const prevMonth = () => setMonth((m) => {
    const d = new Date(m.year, m.month - 2, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const nextMonth = () => setMonth((m) => {
    const d = new Date(m.year, m.month, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const rec = daily?.data?.[0];

  return (
    <div>
      <Header title="My Attendance" />
      <div className="p-6 space-y-6">

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {(['daily', 'monthly'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
                tab === t ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t === 'daily' ? 'Today' : 'Monthly'}
            </button>
          ))}
        </div>

        {/* ── Daily view ── */}
        {tab === 'daily' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={format(new Date(), 'yyyy-MM-dd')}
                className="input text-sm"
              />
            </div>

            {dailyLoading ? (
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
                No attendance record for {format(new Date(date), 'MMMM d, yyyy')}.
              </div>
            )}
          </div>
        )}

        {/* ── Monthly view ── */}
        {tab === 'monthly' && (
          <div className="space-y-4">
            {/* Month picker */}
            <div className="flex items-center gap-3">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-medium w-36 text-center">
                {format(new Date(month.year, month.month - 1, 1), 'MMMM yyyy')}
              </span>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {monthlyLoading ? (
              <div className="card p-8 text-center text-sm text-gray-400">Loading…</div>
            ) : monthly?.summary ? (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { label: 'Present',  value: monthly.summary.present,  color: 'text-green-600' },
                    { label: 'Late',     value: monthly.summary.late,     color: 'text-yellow-600' },
                    { label: 'Absent',   value: monthly.summary.absent,   color: 'text-red-600' },
                    { label: 'Half Day', value: monthly.summary.halfDay,  color: 'text-orange-600' },
                    { label: 'On Leave', value: monthly.summary.onLeave,  color: 'text-blue-600' },
                    { label: 'Working Hrs', value: monthly.summary.totalWorkingHours ? `${monthly.summary.totalWorkingHours.toFixed(1)}h` : '—', color: 'text-purple-600' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="card p-4 text-center">
                      <p className={cn('text-2xl font-bold', color)}>{value ?? 0}</p>
                      <p className="text-xs text-gray-500 mt-1">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Daily breakdown table */}
                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="table-header">Date</th>
                        <th className="table-header">Check In</th>
                        <th className="table-header">Check Out</th>
                        <th className="table-header">Hours</th>
                        <th className="table-header">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthly.records?.map((r: any) => (
                        <tr key={r.date} className={cn('border-b border-gray-50', isToday(new Date(r.date)) && 'bg-brand-50')}>
                          <td className="table-cell font-medium">
                            {format(new Date(r.date), 'EEE, MMM d')}
                          </td>
                          <td className="table-cell font-mono text-xs">
                            {r.checkIn ? format(new Date(r.checkIn), 'hh:mm a') : '—'}
                          </td>
                          <td className="table-cell font-mono text-xs">
                            {r.checkOut ? format(new Date(r.checkOut), 'hh:mm a') : '—'}
                          </td>
                          <td className="table-cell text-xs">
                            {r.workingMinutes ? `${Math.floor(r.workingMinutes / 60)}h ${r.workingMinutes % 60}m` : '—'}
                          </td>
                          <td className="table-cell">
                            <span className={cn('badge text-xs capitalize', STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-600')}>
                              {r.status?.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="card p-8 text-center text-sm text-gray-400">
                No records for {format(new Date(month.year, month.month - 1, 1), 'MMMM yyyy')}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
