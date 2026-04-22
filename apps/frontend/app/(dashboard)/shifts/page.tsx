'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Loader2, Clock } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { shiftsApi } from '@/lib/api';

export default function ShiftsPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editShift, setEditShift] = useState<any>(null);
  const { register, handleSubmit, reset } = useForm();

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts'],
    queryFn: shiftsApi.list,
  });

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      editShift ? shiftsApi.update(editShift.id, d) : shiftsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      toast.success(editShift ? 'Shift updated' : 'Shift created');
      setShowModal(false);
      setEditShift(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shiftsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      toast.success('Shift deleted');
    },
  });

  return (
    <div>
      <Header title="Shifts" />
      <div className="p-6">
        <div className="flex justify-end mb-5">
          <button className="btn-primary" onClick={() => { setEditShift(null); reset({}); setShowModal(true); }}>
            <Plus className="w-4 h-4" /> Add Shift
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shifts?.map((s: any) => (
              <div key={s.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{s.name}</p>
                      {s.isDefault && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Default</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Start Time</span>
                    <span className="font-mono font-medium">{s.shiftStartTime?.slice(0, 5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">End Time</span>
                    <span className="font-mono font-medium">{s.shiftEndTime?.slice(0, 5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Grace Period</span>
                    <span>{s.graceMinutes} min</span>
                  </div>
                  {s.overnight && (
                    <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Overnight shift</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    className="btn-secondary flex-1 btn-sm"
                    onClick={() => {
                      setEditShift(s);
                      reset({
                        name: s.name,
                        shiftStartTime: s.shiftStartTime?.slice(0, 5),
                        shiftEndTime: s.shiftEndTime?.slice(0, 5),
                        graceMinutes: s.graceMinutes,
                        overnight: s.overnight,
                        isDefault: s.isDefault,
                      });
                      setShowModal(true);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  {!s.isDefault && (
                    <button
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      onClick={() => {
                        if (confirm(`Delete shift "${s.name}"?`)) deleteMutation.mutate(s.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditShift(null); }}
        title={editShift ? 'Edit Shift' : 'Create Shift'}
        size="sm"
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Shift Name *</label>
            <input className="input" placeholder="Morning Shift" {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Start Time *</label>
              <input className="input" type="time" {...register('shiftStartTime', { required: true })} />
            </div>
            <div>
              <label className="label">End Time *</label>
              <input className="input" type="time" {...register('shiftEndTime', { required: true })} />
            </div>
          </div>
          <div>
            <label className="label">Grace Period (minutes)</label>
            <input className="input" type="number" defaultValue={10} min={0} max={120} {...register('graceMinutes')} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded" {...register('overnight')} />
              Overnight shift
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" className="rounded" {...register('isDefault')} />
              Set as default
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editShift ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
