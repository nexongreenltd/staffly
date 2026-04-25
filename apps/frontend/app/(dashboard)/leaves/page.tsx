'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, differenceInCalendarDays, parseISO } from 'date-fns';
import { CheckCircle, XCircle, Loader2, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { leavesApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const STATUS_STYLE: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const LEAVE_TYPE_STYLE: Record<string, string> = {
  casual: 'bg-blue-100 text-blue-700',
  sick:   'bg-orange-100 text-orange-700',
  annual: 'bg-purple-100 text-purple-700',
  unpaid: 'bg-gray-100 text-gray-600',
};

function dayCount(start: string, end: string) {
  return differenceInCalendarDays(parseISO(end), parseISO(start)) + 1;
}

export default function LeavesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');
  const [reviewModal, setReviewModal] = useState<{ id: string; name: string; action: 'approve' | 'reject' } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['leaves', statusFilter],
    queryFn: () => leavesApi.list({ status: statusFilter || undefined, limit: 50 }),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => leavesApi.approve(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Leave approved — attendance updated');
      setReviewModal(null);
    },
    onError: () => toast.error('Failed to approve leave'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => leavesApi.reject(id, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leaves'] });
      toast.success('Leave rejected');
      setReviewModal(null);
    },
    onError: () => toast.error('Failed to reject leave'),
  });

  const isPending = approveMutation.isPending || rejectMutation.isPending;

  const handleReview = () => {
    if (!reviewModal) return;
    const payload = { id: reviewModal.id, note: reviewNote || undefined };
    if (reviewModal.action === 'approve') approveMutation.mutate(payload);
    else rejectMutation.mutate(payload);
  };

  return (
    <div>
      <Header title="Leave Requests" />
      <div className="p-6 space-y-5">

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {(['pending', 'approved', 'rejected', ''] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors capitalize',
                statusFilter === s
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="table-header">Employee</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Dates</th>
                  <th className="table-header">Days</th>
                  <th className="table-header">Reason</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Applied</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                    </td>
                  </tr>
                )}
                {data?.data?.map((r: any) => (
                  <tr key={r.id} className="hover:bg-gray-50/50">
                    <td className="table-cell">
                      <p className="font-medium text-gray-900">
                        {r.employee?.firstName} {r.employee?.lastName}
                      </p>
                      <p className="text-xs text-gray-400">{r.employee?.employeeCode}</p>
                    </td>
                    <td className="table-cell">
                      <span className={cn('badge text-xs capitalize', LEAVE_TYPE_STYLE[r.leaveType] || 'bg-gray-100 text-gray-600')}>
                        {r.leaveType}
                      </span>
                    </td>
                    <td className="table-cell text-xs font-mono">
                      {format(parseISO(r.startDate), 'MMM d')} – {format(parseISO(r.endDate), 'MMM d, yyyy')}
                    </td>
                    <td className="table-cell font-medium">
                      {dayCount(r.startDate, r.endDate)}
                    </td>
                    <td className="table-cell max-w-xs">
                      <p className="truncate text-gray-600">{r.reason}</p>
                    </td>
                    <td className="table-cell">
                      <span className={cn('badge text-xs capitalize', STATUS_STYLE[r.status] || 'bg-gray-100 text-gray-600')}>
                        {r.status}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-gray-400">
                      {format(new Date(r.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="table-cell">
                      {r.status === 'pending' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setReviewModal({ id: r.id, name: `${r.employee?.firstName} ${r.employee?.lastName}`, action: 'approve' }); setReviewNote(''); }}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => { setReviewModal({ id: r.id, name: `${r.employee?.firstName} ${r.employee?.lastName}`, action: 'reject' }); setReviewNote(''); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      {r.status !== 'pending' && r.reviewNote && (
                        <p className="text-xs text-gray-400 italic max-w-[120px] truncate" title={r.reviewNote}>
                          {r.reviewNote}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
                {!isLoading && !data?.data?.length && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-gray-400 text-sm">
                      No {statusFilter} leave requests
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      <Modal
        open={!!reviewModal}
        onClose={() => setReviewModal(null)}
        title={reviewModal?.action === 'approve' ? `Approve Leave – ${reviewModal?.name}` : `Reject Leave – ${reviewModal?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          {reviewModal?.action === 'approve' && (
            <p className="text-sm text-gray-600 bg-green-50 rounded-lg px-3 py-2">
              Approving this leave will automatically mark the employee's attendance as <strong>On Leave</strong> for each day in the requested range.
            </p>
          )}
          <div>
            <label className="label">Note (optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Optional note to the employee..."
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setReviewModal(null)}>Cancel</button>
            <button
              className={cn('btn-primary', reviewModal?.action === 'reject' && 'btn-danger')}
              disabled={isPending}
              onClick={handleReview}
            >
              {isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
                : reviewModal?.action === 'approve' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
