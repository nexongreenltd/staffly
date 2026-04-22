'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format, startOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import { Download, Search, Filter, Loader2, Pencil } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { attendanceApi } from '@/lib/api';
import { formatTime, formatHours, exportToCSV } from '@/lib/utils';

type ViewMode = 'daily' | 'monthly';

export default function AttendancePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('daily');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [correctModal, setCorrectModal] = useState<any>(null);
  const [correctionForm, setCorrectionForm] = useState({ checkIn: '', checkOut: '', reason: '' });

  const dailyQuery = useQuery({
    queryKey: ['attendance-daily', date, statusFilter, page],
    queryFn: () =>
      attendanceApi.daily({
        date,
        status: statusFilter || undefined,
        page,
        limit: 30,
      }),
    enabled: viewMode === 'daily',
  });

  const monthlyQuery = useQuery({
    queryKey: ['attendance-monthly', year, month],
    queryFn: () => attendanceApi.monthlyReport({ year, month }),
    enabled: viewMode === 'monthly',
  });

  const correctMutation = useMutation({
    mutationFn: (d: any) =>
      attendanceApi.correct(d.employeeId, d.date, {
        checkIn: d.checkIn || undefined,
        checkOut: d.checkOut || undefined,
        reason: d.reason,
      }),
    onSuccess: () => {
      dailyQuery.refetch();
      toast.success('Attendance corrected');
      setCorrectModal(null);
    },
    onError: () => toast.error('Failed to correct attendance'),
  });

  const exportDaily = () => {
    const rows = dailyQuery.data?.data?.map((r: any) => ({
      Employee: `${r.employee?.firstName} ${r.employee?.lastName}`,
      Code: r.employee?.employeeCode,
      Date: r.date,
      CheckIn: r.checkIn ? format(new Date(r.checkIn), 'HH:mm') : '',
      CheckOut: r.checkOut ? format(new Date(r.checkOut), 'HH:mm') : '',
      WorkingHours: r.workingHours || 0,
      LateMinutes: r.lateMinutes || 0,
      Status: r.status,
    }));
    exportToCSV(rows || [], `attendance-${date}`);
  };

  const summary = dailyQuery.data?.summary;

  return (
    <div>
      <Header title="Attendance" />
      <div className="p-6 space-y-5">
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['daily', 'monthly'] as const).map((m) => (
              <button
                key={m}
                className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                  viewMode === m
                    ? 'bg-brand-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
                onClick={() => setViewMode(m)}
              >
                {m}
              </button>
            ))}
          </div>

          {viewMode === 'daily' ? (
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="input"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">All statuses</option>
                {['present', 'late', 'absent', 'half_day', 'on_leave', 'holiday'].map((s) => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <button className="btn-secondary btn-sm" onClick={exportDaily}>
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <select value={year} onChange={(e) => setYear(+e.target.value)} className="input">
                {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={month} onChange={(e) => setMonth(+e.target.value)} className="input">
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {format(new Date(2024, i, 1), 'MMMM')}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Daily summary cards */}
        {viewMode === 'daily' && summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Present', val: summary.present, color: 'bg-green-50 text-green-700' },
              { label: 'Late',    val: summary.late,    color: 'bg-yellow-50 text-yellow-700' },
              { label: 'Absent',  val: summary.absent,  color: 'bg-red-50 text-red-700' },
              { label: 'Half Day',val: summary.halfDay, color: 'bg-orange-50 text-orange-700' },
              { label: 'On Leave',val: summary.onLeave, color: 'bg-purple-50 text-purple-700' },
              { label: 'Holiday', val: summary.holiday, color: 'bg-blue-50 text-blue-700' },
            ].map(({ label, val, color }) => (
              <div key={label} className={`card p-4 text-center ${color}`}>
                <p className="text-2xl font-bold">{val}</p>
                <p className="text-xs mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Daily Table */}
        {viewMode === 'daily' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Employee</th>
                    <th className="table-header">Check In</th>
                    <th className="table-header">Check Out</th>
                    <th className="table-header">Working Hrs</th>
                    <th className="table-header">Late (min)</th>
                    <th className="table-header">OT (min)</th>
                    <th className="table-header">Status</th>
                    <th className="table-header">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dailyQuery.isLoading && (
                    <tr><td colSpan={8} className="py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                    </td></tr>
                  )}
                  {dailyQuery.data?.data?.map((rec: any) => (
                    <tr key={rec.id} className="hover:bg-gray-50/50">
                      <td className="table-cell">
                        <p className="font-medium text-gray-900">
                          {rec.employee?.firstName} {rec.employee?.lastName}
                        </p>
                        <p className="text-xs text-gray-400">{rec.employee?.employeeCode}</p>
                      </td>
                      <td className="table-cell font-mono text-sm">
                        {rec.checkIn ? formatTime(rec.checkIn) : '—'}
                        {rec.isManual && <span className="ml-1 text-xs text-orange-500" title="Manually corrected">✎</span>}
                      </td>
                      <td className="table-cell font-mono text-sm">{rec.checkOut ? formatTime(rec.checkOut) : '—'}</td>
                      <td className="table-cell">{formatHours(rec.workingHours)}</td>
                      <td className="table-cell text-yellow-600">{rec.lateMinutes || 0}</td>
                      <td className="table-cell text-blue-600">{rec.overtimeMin || 0}</td>
                      <td className="table-cell"><Badge status={rec.status} /></td>
                      <td className="table-cell">
                        <button
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          onClick={() => {
                            setCorrectModal({ employeeId: rec.employeeId, date: rec.date, name: `${rec.employee?.firstName} ${rec.employee?.lastName}` });
                            setCorrectionForm({
                              checkIn: rec.checkIn ? format(new Date(rec.checkIn), "yyyy-MM-dd'T'HH:mm") : '',
                              checkOut: rec.checkOut ? format(new Date(rec.checkOut), "yyyy-MM-dd'T'HH:mm") : '',
                              reason: '',
                            });
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!dailyQuery.isLoading && !dailyQuery.data?.data?.length && (
                    <tr><td colSpan={8} className="py-10 text-center text-gray-400 text-sm">No records for this date</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Monthly Report */}
        {viewMode === 'monthly' && (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="table-header">Employee</th>
                    <th className="table-header">Present</th>
                    <th className="table-header">Late</th>
                    <th className="table-header">Absent</th>
                    <th className="table-header">Half Day</th>
                    <th className="table-header">Total Hrs</th>
                    <th className="table-header">OT (min)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthlyQuery.isLoading && (
                    <tr><td colSpan={7} className="py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                    </td></tr>
                  )}
                  {monthlyQuery.data?.data?.map((r: any) => (
                    <tr key={r.employee.id} className="hover:bg-gray-50/50">
                      <td className="table-cell">
                        <p className="font-medium text-gray-900">{r.employee.name}</p>
                        <p className="text-xs text-gray-400">{r.employee.code}</p>
                      </td>
                      <td className="table-cell text-green-600 font-medium">{r.present}</td>
                      <td className="table-cell text-yellow-600">{r.late}</td>
                      <td className="table-cell text-red-600">{r.absent}</td>
                      <td className="table-cell text-orange-600">{r.halfDay}</td>
                      <td className="table-cell">{formatHours(r.totalWorkingHours)}</td>
                      <td className="table-cell text-blue-600">{r.totalOvertimeMin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Manual Correction Modal */}
      <Modal
        open={!!correctModal}
        onClose={() => setCorrectModal(null)}
        title={`Correct Attendance – ${correctModal?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Check In</label>
            <input
              type="datetime-local"
              className="input"
              value={correctionForm.checkIn}
              onChange={(e) => setCorrectionForm((p) => ({ ...p, checkIn: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Check Out</label>
            <input
              type="datetime-local"
              className="input"
              value={correctionForm.checkOut}
              onChange={(e) => setCorrectionForm((p) => ({ ...p, checkOut: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Reason *</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Reason for correction..."
              value={correctionForm.reason}
              onChange={(e) => setCorrectionForm((p) => ({ ...p, reason: e.target.value }))}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setCorrectModal(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!correctionForm.reason || correctMutation.isPending}
              onClick={() =>
                correctMutation.mutate({
                  employeeId: correctModal.employeeId,
                  date: correctModal.date,
                  ...correctionForm,
                })
              }
            >
              {correctMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Correction'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
