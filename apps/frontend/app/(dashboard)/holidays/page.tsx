'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, getYear } from 'date-fns';
import { CalendarDays, Plus, Trash2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { holidaysApi } from '@/lib/api';
import { cn } from '@/lib/utils';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const currentYear = getYear(new Date());
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export default function HolidaysPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState(currentYear);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ date: '', name: '', description: '' });
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: holidays = [], isLoading } = useQuery({
    queryKey: ['holidays', year],
    queryFn: () => holidaysApi.list(year),
  });

  const createMutation = useMutation({
    mutationFn: () => holidaysApi.create(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday added');
      setAddModal(false);
      setForm({ date: '', name: '', description: '' });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to add holiday'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => holidaysApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['holidays'] });
      toast.success('Holiday removed');
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to remove holiday'),
  });

  // Group by month
  const byMonth: Record<number, typeof holidays> = {};
  for (const h of holidays) {
    const m = new Date(h.date).getMonth();
    if (!byMonth[m]) byMonth[m] = [];
    byMonth[m].push(h);
  }

  return (
    <div>
      <Header title="Holidays" />
      <div className="p-6 space-y-6">

        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {YEARS.map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={cn(
                  'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  year === y ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                )}
              >
                {y}
              </button>
            ))}
          </div>
          <button className="btn-primary btn-sm" onClick={() => setAddModal(true)}>
            <Plus className="w-4 h-4" /> Add Holiday
          </button>
        </div>

        {/* Summary badge */}
        <p className="text-sm text-gray-500">
          {holidays.length} holiday{holidays.length !== 1 ? 's' : ''} declared in {year}
        </p>

        {isLoading ? (
          <div className="card p-8 text-center text-sm text-gray-400">Loading…</div>
        ) : holidays.length === 0 ? (
          <div className="card p-12 text-center">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No holidays declared for {year}.</p>
            <button className="btn-primary btn-sm mt-4" onClick={() => setAddModal(true)}>
              <Plus className="w-4 h-4" /> Add First Holiday
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(byMonth)
              .sort(([a], [b]) => +a - +b)
              .map(([monthIdx, list]) => (
                <div key={monthIdx} className="card overflow-hidden">
                  <div className="bg-brand-50 px-4 py-2 border-b border-brand-100">
                    <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                      {MONTHS[+monthIdx]}
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {list.map((h: any) => (
                      <div key={h.id} className="flex items-center justify-between px-4 py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{h.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {format(new Date(h.date), 'EEEE, MMMM d')}
                          </p>
                          {h.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{h.description}</p>
                          )}
                        </div>
                        <button
                          onClick={() => setDeleteId(h.id)}
                          className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-2"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Holiday" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Date *</label>
            <input
              type="date"
              className="input"
              value={form.date}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Eid ul-Fitr"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <input
              type="text"
              className="input"
              placeholder="Optional note"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            />
          </div>
          <p className="text-xs text-gray-500 bg-blue-50 rounded-lg px-3 py-2">
            All active employees will be marked as <strong>Holiday</strong> on this date automatically.
          </p>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setAddModal(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!form.date || !form.name || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : 'Add Holiday'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Holiday" size="sm">
        <p className="text-sm text-gray-600 mb-5">
          This will remove the holiday and revert attendance records that were auto-created. Manually corrected records will not be affected.
        </p>
        <div className="flex justify-end gap-3">
          <button className="btn-secondary" onClick={() => setDeleteId(null)}>Cancel</button>
          <button
            className="btn-danger"
            disabled={deleteMutation.isPending}
            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
          >
            {deleteMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Removing…</> : 'Remove'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
