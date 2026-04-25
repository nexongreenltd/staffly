'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { Plus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { myLeavesApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const LEAVE_TYPES = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick',   label: 'Sick Leave' },
  { value: 'annual', label: 'Annual Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
];

function dayCount(start: string, end: string) {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
}

export default function MyLeavesPage() {
  const qc = useQueryClient();
  const [addModal, setAddModal] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    leaveType: 'casual',
    reason: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['my-leaves'],
    queryFn: () => myLeavesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => myLeavesApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      toast.success('Leave request submitted');
      setAddModal(false);
      setForm({ startDate: '', endDate: '', leaveType: 'casual', reason: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to submit request'),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => myLeavesApi.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-leaves'] });
      toast.success('Leave request cancelled');
      setCancelId(null);
    },
    onError: () => toast.error('Failed to cancel request'),
  });

  const days = form.startDate && form.endDate && form.endDate >= form.startDate
    ? dayCount(form.startDate, form.endDate)
    : 0;

  return (
    <div>
      <Header title="My Leaves" />
      <div className="p-6 space-y-5">

        <div className="flex justify-end">
          <button className="btn-primary btn-sm" onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4" /> Apply for Leave
          </button>
        </div>

        {/* Leave history */}
        {isLoading ? (
          <div className="card p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : !data?.data?.length ? (
          <div className="card p-12 text-center">
            <p className="text-sm text-gray-400">You haven't applied for any leave yet.</p>
            <button className="btn-primary btn-sm mt-4" onClick={() => setAddModal(true)}>
              <Plus className="w-4 h-4" /> Apply for Leave
            </button>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="table-header">Type</th>
                  <th className="table-header">Dates</th>
                  <th className="table-header">Days</th>
                  <th className="table-header">Reason</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Note</th>
                  <th className="table-header">Applied</th>
                  <th className="table-header"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.data.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="table-cell">
                      <span className="badge text-xs capitalize bg-blue-100 text-blue-700">
                        {r.leaveType}
                      </span>
                    </td>
                    <td className="table-cell text-xs font-mono">
                      {format(parseISO(r.startDate), 'MMM d')} – {format(parseISO(r.endDate), 'MMM d, yyyy')}
                    </td>
                    <td className="table-cell font-medium">{dayCount(r.startDate, r.endDate)}</td>
                    <td className="table-cell max-w-xs">
                      <p className="truncate text-gray-600">{r.reason}</p>
                    </td>
                    <td className="table-cell">
                      <span className={cn('badge text-xs capitalize', STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-600')}>
                        {r.status}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-400 italic">
                      {r.reviewNote || '—'}
                    </td>
                    <td className="table-cell text-xs text-gray-400">
                      {format(new Date(r.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="table-cell">
                      {r.status === 'pending' && (
                        <button
                          onClick={() => setCancelId(r.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Cancel request"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Apply for Leave" size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start Date *</label>
              <input
                type="date"
                className="input"
                min={format(new Date(), 'yyyy-MM-dd')}
                value={form.startDate}
                onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">End Date *</label>
              <input
                type="date"
                className="input"
                min={form.startDate || format(new Date(), 'yyyy-MM-dd')}
                value={form.endDate}
                onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
              />
            </div>
          </div>
          {days > 0 && (
            <p className="text-xs text-brand-600 font-medium">{days} day{days !== 1 ? 's' : ''} selected</p>
          )}
          <div>
            <label className="label">Leave Type *</label>
            <select
              className="input"
              value={form.leaveType}
              onChange={(e) => setForm((p) => ({ ...p, leaveType: e.target.value }))}
            >
              {LEAVE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Reason *</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Briefly describe the reason for your leave..."
              value={form.reason}
              onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
            />
          </div>
          <p className="text-xs text-gray-500 bg-yellow-50 rounded-lg px-3 py-2">
            Your request will be reviewed by your HR admin. You'll see the status update here once reviewed.
          </p>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!form.startDate || !form.endDate || !form.reason || form.endDate < form.startDate || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : 'Submit Request'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel confirm */}
      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel Leave Request" size="sm">
        <p className="text-sm text-gray-600 mb-5">Are you sure you want to cancel this leave request?</p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setCancelId(null)}>Keep it</button>
          <button
            className="btn-danger"
            disabled={cancelMutation.isPending}
            onClick={() => cancelId && cancelMutation.mutate(cancelId)}
          >
            {cancelMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Cancelling…</> : 'Cancel Request'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
