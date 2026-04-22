'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  Search, Plus, Eye, ToggleLeft, ToggleRight,
  KeyRound, Loader2, Users, Monitor, Building2,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { superadminApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';

// Add to lib/api if not already — the public POST /companies endpoint
const companiesApi2 = {
  create: (data: any) =>
    import('@/lib/api').then((m) => m.api.post('/companies', data).then((r) => r.data)),
};

export default function SuperadminCompaniesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState(false);
  const [resetModal, setResetModal] = useState<{ id: string; name: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['superadmin-companies', page, search],
    queryFn: () => superadminApi.companies({ page, limit: 20, search: search || undefined }),
  });

  const { data: detail } = useQuery({
    queryKey: ['superadmin-company-detail', detailId],
    queryFn: () => superadminApi.company(detailId!),
    enabled: !!detailId,
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => superadminApi.toggleCompany(id),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['superadmin-companies'] });
      qc.invalidateQueries({ queryKey: ['superadmin-company-detail', res.id] });
      toast.success(`Company ${res.isActive ? 'activated' : 'deactivated'}`);
    },
  });

  const resetMutation = useMutation({
    mutationFn: ({ id, pwd }: { id: string; pwd: string }) =>
      superadminApi.resetPassword(id, pwd),
    onSuccess: () => {
      toast.success('Admin password reset');
      setResetModal(null);
      setNewPassword('');
    },
    onError: () => toast.error('Failed to reset password'),
  });

  const createMutation = useMutation({
    mutationFn: (d: any) => companiesApi2.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin-companies'] });
      qc.invalidateQueries({ queryKey: ['superadmin-stats'] });
      toast.success('Company created');
      setCreateModal(false);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  return (
    <div>
      <Header title="Companies" />
      <div className="p-6">

        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              placeholder="Search companies..."
              className="input pl-9 w-72"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <button className="btn-primary" style={{ background: '#7c3aed' }}
            onClick={() => { reset({}); setCreateModal(true); }}>
            <Plus className="w-4 h-4" /> New Company
          </button>
        </div>

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="table-header">Company</th>
                  <th className="table-header">Slug</th>
                  <th className="table-header">Employees</th>
                  <th className="table-header">Devices</th>
                  <th className="table-header">Subscription</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Created</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {isLoading && (
                  <tr><td colSpan={8} className="py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-300" />
                  </td></tr>
                )}
                {data?.data?.map((c: any) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center text-sm font-bold shrink-0">
                          {c.name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.name}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell font-mono text-xs text-gray-500">{c.slug}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {c.employeeCount}
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Monitor className="w-3.5 h-3.5 text-gray-400" />
                        {c.deviceCount}
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="badge bg-violet-100 text-violet-700 capitalize">
                        {c.subscription}
                      </span>
                    </td>
                    <td className="table-cell">
                      <Badge status={c.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="table-cell text-gray-400 text-xs">{formatDate(c.createdAt)}</td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1">
                        {/* View detail */}
                        <button
                          className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          title="View detail"
                          onClick={() => setDetailId(c.id)}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {/* Toggle active */}
                        <button
                          className={`p-1.5 rounded-lg transition-colors ${c.isActive ? 'text-green-500 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={c.isActive ? 'Deactivate' : 'Activate'}
                          onClick={() => toggleMutation.mutate(c.id)}
                          disabled={toggleMutation.isPending}
                        >
                          {c.isActive
                            ? <ToggleRight className="w-4 h-4" />
                            : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        {/* Reset password */}
                        <button
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Reset admin password"
                          onClick={() => setResetModal({ id: c.id, name: c.name })}
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!isLoading && !data?.data?.length && (
                  <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">
                    No companies found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.total > data.limit && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                {(page - 1) * data.limit + 1}–{Math.min(page * data.limit, data.total)} of {data.total}
              </p>
              <div className="flex gap-2">
                <button className="btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
                <button className="btn-secondary btn-sm" disabled={page * data.limit >= data.total} onClick={() => setPage(p => p + 1)}>Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Company Detail Modal ────────────────────────────────── */}
      <Modal open={!!detailId} onClose={() => setDetailId(null)} title="Company Details" size="lg">
        {detail ? (
          <div className="space-y-5">
            {/* Header info */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl font-bold shrink-0">
                {detail.name[0]}
              </div>
              <div>
                <p className="font-semibold text-lg text-gray-900">{detail.name}</p>
                <p className="text-sm text-gray-500">{detail.email} · {detail.timezone}</p>
              </div>
              <Badge status={detail.isActive ? 'active' : 'inactive'} className="ml-auto" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Employees', val: detail.stats.employees, color: 'text-blue-600' },
                { label: 'Devices', val: detail.stats.devices, color: 'text-green-600' },
                { label: 'Active Devices', val: detail.stats.activeDevices, color: 'text-green-500' },
                { label: 'Att. Logs', val: detail.stats.attendanceLogs, color: 'text-purple-600' },
              ].map(({ label, val, color }) => (
                <div key={label} className="card p-3 text-center">
                  <p className={`text-xl font-bold ${color}`}>{val}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Admin accounts */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Admin Accounts</p>
              {detail.admins?.length > 0 ? (
                <div className="space-y-2">
                  {detail.admins.map((admin: any) => (
                    <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium">{admin.email}</p>
                        <p className="text-xs text-gray-400">
                          Last login: {admin.lastLoginAt ? formatDate(admin.lastLoginAt) : 'Never'}
                        </p>
                      </div>
                      <Badge status={admin.isActive ? 'active' : 'inactive'} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No admin accounts</p>
              )}
            </div>

            {/* Devices */}
            {detail.devices?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Devices</p>
                <div className="space-y-2">
                  {detail.devices.map((d: any) => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
                      <span className="font-medium">{d.name}</span>
                      <span className="font-mono text-xs text-gray-500">{d.ipAddress}:{d.port}</span>
                      <Badge status={d.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <button
                className="btn btn-sm border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg px-3"
                onClick={() => { setDetailId(null); setResetModal({ id: detail.id, name: detail.name }); }}
              >
                <KeyRound className="w-3.5 h-3.5" /> Reset Admin Password
              </button>
              <button
                className={`btn btn-sm rounded-lg px-3 ${detail.isActive ? 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'}`}
                onClick={() => { toggleMutation.mutate(detail.id); setDetailId(null); }}
              >
                {detail.isActive ? <ToggleLeft className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                {detail.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
          </div>
        )}
      </Modal>

      {/* ── Reset Password Modal ─────────────────────────────────── */}
      <Modal
        open={!!resetModal}
        onClose={() => { setResetModal(null); setNewPassword(''); }}
        title={`Reset Admin Password — ${resetModal?.name}`}
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
            This will reset the company admin password. Share the new password securely.
          </div>
          <div>
            <label className="label">New Password</label>
            <input
              className="input"
              type="password"
              placeholder="Min 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3">
            <button className="btn-secondary" onClick={() => setResetModal(null)}>Cancel</button>
            <button
              className="btn text-white rounded-lg px-4 py-2 text-sm"
              style={{ background: '#d97706' }}
              disabled={newPassword.length < 8 || resetMutation.isPending}
              onClick={() => resetMutation.mutate({ id: resetModal!.id, pwd: newPassword })}
            >
              {resetMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Create Company Modal ─────────────────────────────────── */}
      <Modal open={createModal} onClose={() => { setCreateModal(false); reset(); }} title="Create New Company" size="lg">
        <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name *</label>
              <input className="input" placeholder="Acme Corp" {...register('name', { required: true })} />
            </div>
            <div>
              <label className="label">Slug * <span className="text-gray-400 font-normal">(subdomain)</span></label>
              <input className="input" placeholder="acme" {...register('slug', { required: true })} />
            </div>
            <div>
              <label className="label">Admin Email *</label>
              <input className="input" type="email" {...register('email', { required: true })} />
            </div>
            <div>
              <label className="label">Admin Password *</label>
              <input className="input" type="password" placeholder="Min 8 chars" {...register('adminPassword', { required: true, minLength: 8 })} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" {...register('phone')} />
            </div>
            <div>
              <label className="label">Timezone</label>
              <select className="input" {...register('timezone')}>
                <option value="UTC">UTC</option>
                <option value="Asia/Dhaka">Asia/Dhaka (BST)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setCreateModal(false)}>Cancel</button>
            <button type="submit" className="btn text-white rounded-lg px-4 py-2 text-sm" style={{ background: '#7c3aed' }}
              disabled={createMutation.isPending}>
              {createMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Create Company'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
