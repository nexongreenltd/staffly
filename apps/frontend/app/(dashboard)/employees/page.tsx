'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Plus, Search, Pencil, Trash2, Loader2, Fingerprint,
  UserCheck, UserX, AlertTriangle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { employeesApi, shiftsApi, departmentsApi } from '@/lib/api';
import { formatDate, cn } from '@/lib/utils';

type ActionModal =
  | { type: 'deactivate'; emp: any }
  | { type: 'activate';   emp: any }
  | { type: 'terminate';  emp: any }
  | null;

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionModal, setActionModal] = useState<ActionModal>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['employees', page, search],
    queryFn: () => employeesApi.list({ page, limit: 20, search: search || undefined }),
  });

  const { data: shifts } = useQuery({ queryKey: ['shifts'], queryFn: shiftsApi.list });
  useQuery({ queryKey: ['departments'], queryFn: departmentsApi.list });

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      editEmployee ? employeesApi.update(editEmployee.id, d) : employeesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success(editEmployee ? 'Employee updated' : 'Employee created & queued for device sync');
      setShowForm(false);
      setEditEmployee(null);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => employeesApi.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee activated and queued for device sync');
      setActionModal(null);
    },
    onError: () => toast.error('Failed to activate employee'),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => employeesApi.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee deactivated');
      setActionModal(null);
    },
    onError: () => toast.error('Failed to deactivate employee'),
  });

  const terminateMutation = useMutation({
    mutationFn: (id: string) => employeesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee terminated and removed from devices');
      setActionModal(null);
    },
    onError: () => toast.error('Failed to terminate employee'),
  });

  const openEdit = (emp: any) => {
    setEditEmployee(emp);
    reset({
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      email: emp.email,
      phone: emp.phone,
      designation: emp.designation,
      shiftId: emp.shiftId,
      joiningDate: emp.joiningDate,
    });
    setShowForm(true);
  };

  const openCreate = () => {
    setEditEmployee(null);
    reset({});
    setShowForm(true);
  };

  const isBusy = activateMutation.isPending || deactivateMutation.isPending || terminateMutation.isPending;

  return (
    <div>
      <Header title="Employees" />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees..."
              className="input pl-9 w-64"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Employee</th>
                  <th className="table-header">Code</th>
                  <th className="table-header">Designation</th>
                  <th className="table-header">Shift</th>
                  <th className="table-header">Biometric</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Joined</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && (
                  <tr><td colSpan={8} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                  </td></tr>
                )}
                {data?.data?.map((emp: any) => (
                  <tr key={emp.id} className={cn('hover:bg-gray-50/50 transition-colors', emp.status === 'terminated' && 'opacity-60')}>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-medium shrink-0">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</p>
                          <p className="text-xs text-gray-400">{emp.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs">{emp.employeeCode}</td>
                    <td className="table-cell">{emp.designation || '—'}</td>
                    <td className="table-cell">{emp.shift?.name || '—'}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        <Fingerprint className={`w-3.5 h-3.5 ${emp.biometricStatus === 'enrolled' ? 'text-green-500' : 'text-gray-300'}`} />
                        <Badge status={emp.biometricStatus} />
                      </div>
                    </td>
                    <td className="table-cell"><Badge status={emp.status} /></td>
                    <td className="table-cell">{formatDate(emp.joiningDate)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        {/* Edit — always available */}
                        <button
                          title="Edit"
                          className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          onClick={() => openEdit(emp)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        {/* Activate — shown when inactive or terminated */}
                        {(emp.status === 'inactive' || emp.status === 'terminated') && (
                          <button
                            title="Activate"
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            onClick={() => setActionModal({ type: 'activate', emp })}
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Deactivate — shown when active */}
                        {emp.status === 'active' && (
                          <button
                            title="Deactivate"
                            className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                            onClick={() => setActionModal({ type: 'deactivate', emp })}
                          >
                            <UserX className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Terminate — shown when not already terminated */}
                        {emp.status !== 'terminated' && (
                          <button
                            title="Terminate"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => setActionModal({ type: 'terminate', emp })}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && !data?.data?.length && (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                    No employees found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.total > data.limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn-secondary btn-sm" disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditEmployee(null); reset(); }}
        title={editEmployee ? 'Edit Employee' : 'Add Employee'}
        size="lg"
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Employee Code *</label>
              <input className={cn('input', errors.employeeCode && 'border-red-400')} placeholder="EMP-001" {...register('employeeCode', { required: true })} />
            </div>
            <div>
              <label className="label">Designation</label>
              <input className="input" placeholder="Software Engineer" {...register('designation')} />
            </div>
            <div>
              <label className="label">First Name *</label>
              <input className={cn('input', errors.firstName && 'border-red-400')} {...register('firstName', { required: true })} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className={cn('input', errors.lastName && 'border-red-400')} {...register('lastName', { required: true })} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" {...register('email')} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" {...register('phone')} />
            </div>
            <div>
              <label className="label">Shift</label>
              <select className="input" {...register('shiftId')}>
                <option value="">Select shift</option>
                {shifts?.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Joining Date</label>
              <input className="input" type="date" {...register('joiningDate')} />
            </div>
            {!editEmployee && (
              <>
                <div>
                  <label className="label">Login Password (optional)</label>
                  <input className="input" type="password" placeholder="Creates login account" {...register('password')} />
                </div>
                <div>
                  <label className="label">Card Number</label>
                  <input className="input" placeholder="RFID card number" {...register('cardNumber')} />
                </div>
              </>
            )}
          </div>
          {!editEmployee && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <strong>Note:</strong> Fingerprints must be enrolled directly on the device. This employee will start as "Pending Biometric".
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : editEmployee ? 'Update' : 'Create & Sync'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Activate Modal */}
      <Modal
        open={actionModal?.type === 'activate'}
        onClose={() => setActionModal(null)}
        title="Activate Employee"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <UserCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{actionModal?.emp?.firstName} {actionModal?.emp?.lastName}</p>
              <p className="text-sm text-gray-500 mt-1">
                This will set the employee's status to <strong>Active</strong> and re-sync them to all connected devices.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={isBusy}
              onClick={() => activateMutation.mutate(actionModal?.emp?.id)}
            >
              {isBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Activating…</> : 'Activate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Modal */}
      <Modal
        open={actionModal?.type === 'deactivate'}
        onClose={() => setActionModal(null)}
        title="Deactivate Employee"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center shrink-0">
              <UserX className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{actionModal?.emp?.firstName} {actionModal?.emp?.lastName}</p>
              <p className="text-sm text-gray-500 mt-1">
                This will set the employee to <strong>Inactive</strong>. They will not be able to log in and attendance will not be tracked. You can reactivate them at any time.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
            <button
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              disabled={isBusy}
              onClick={() => deactivateMutation.mutate(actionModal?.emp?.id)}
            >
              {isBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Deactivating…</> : 'Deactivate'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Terminate Modal */}
      <Modal
        open={actionModal?.type === 'terminate'}
        onClose={() => setActionModal(null)}
        title="Terminate Employee"
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{actionModal?.emp?.firstName} {actionModal?.emp?.lastName}</p>
              <p className="text-sm text-gray-500 mt-1">
                This will permanently set the employee to <strong>Terminated</strong> and remove them from all connected biometric devices. Their attendance history will be preserved.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setActionModal(null)}>Cancel</button>
            <button
              className="btn-danger"
              disabled={isBusy}
              onClick={() => terminateMutation.mutate(actionModal?.emp?.id)}
            >
              {isBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Terminating…</> : 'Terminate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
