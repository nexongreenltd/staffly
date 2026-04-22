'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import {
  Plus, RefreshCw, Trash2, Pencil, Loader2, Wifi, WifiOff, AlertCircle,
} from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { devicesApi } from '@/lib/api';

export default function DevicesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editDevice, setEditDevice] = useState<any>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data: devices, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: devicesApi.list,
  });

  const { register, handleSubmit, reset } = useForm();

  const saveMutation = useMutation({
    mutationFn: (d: any) =>
      editDevice ? devicesApi.update(editDevice.id, d) : devicesApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      toast.success(editDevice ? 'Device updated' : 'Device added');
      setShowModal(false);
      reset();
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || 'Failed'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => devicesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      toast.success('Device removed');
    },
  });

  const handleSync = async (id: string) => {
    setSyncingId(id);
    try {
      await devicesApi.sync(id);
      toast.success('Sync job queued');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const handleSyncAll = async () => {
    try {
      const res = await devicesApi.syncAll();
      toast.success(res.message);
    } catch {
      toast.error('Failed to queue sync');
    }
  };

  const openEdit = (device: any) => {
    setEditDevice(device);
    reset({
      name: device.name,
      ipAddress: device.ipAddress,
      port: device.port,
      location: device.location,
      syncInterval: device.syncInterval,
    });
    setShowModal(true);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === 'active')   return <Wifi className="w-4 h-4 text-green-500" />;
    if (status === 'error')    return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <WifiOff className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div>
      <Header title="Biometric Devices" />
      <div className="p-6">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <p className="text-sm text-gray-500">
            {devices?.length || 0} device(s) registered
          </p>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={handleSyncAll}>
              <RefreshCw className="w-4 h-4" /> Sync All
            </button>
            <button className="btn-primary" onClick={() => { setEditDevice(null); reset({}); setShowModal(true); }}>
              <Plus className="w-4 h-4" /> Add Device
            </button>
          </div>
        </div>

        {/* Device cards */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {devices?.map((device: any) => (
              <div key={device.id} className="card p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <StatusIcon status={device.status} />
                    <div>
                      <p className="font-semibold text-gray-900">{device.name}</p>
                      <p className="text-xs text-gray-400">{device.model}</p>
                    </div>
                  </div>
                  <Badge status={device.status} />
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">IP Address</span>
                    <span className="font-mono text-gray-700">{device.ipAddress}:{device.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Location</span>
                    <span className="text-gray-700">{device.location || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sync Interval</span>
                    <span className="text-gray-700">{device.syncInterval}m</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Synced</span>
                    <span className="text-gray-700">
                      {device.lastSyncedAt
                        ? format(new Date(device.lastSyncedAt), 'dd MMM, HH:mm')
                        : 'Never'}
                    </span>
                  </div>
                  {device.lastError && (
                    <div className="mt-2 p-2 bg-red-50 rounded-lg text-xs text-red-600 break-words">
                      {device.lastError}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    className="btn-secondary flex-1 btn-sm"
                    onClick={() => handleSync(device.id)}
                    disabled={syncingId === device.id}
                  >
                    {syncingId === device.id ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing</>
                    ) : (
                      <><RefreshCw className="w-3.5 h-3.5" /> Sync Now</>
                    )}
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                    onClick={() => openEdit(device)}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    onClick={() => {
                      if (confirm(`Remove ${device.name}?`)) deleteMutation.mutate(device.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {!devices?.length && (
              <div className="col-span-3 py-20 text-center">
                <WifiOff className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No devices registered yet</p>
                <button className="btn-primary mt-4" onClick={() => setShowModal(true)}>
                  <Plus className="w-4 h-4" /> Add First Device
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Device Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditDevice(null); }}
        title={editDevice ? 'Edit Device' : 'Add Biometric Device'}
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Device Name *</label>
            <input className="input" placeholder="Main Entrance" {...register('name', { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">IP Address *</label>
              <input className="input" placeholder="192.168.1.100" {...register('ipAddress', { required: true })} />
            </div>
            <div>
              <label className="label">Port</label>
              <input className="input" type="number" defaultValue={4370} {...register('port')} />
            </div>
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" placeholder="Main gate, Floor 2..." {...register('location')} />
          </div>
          <div>
            <label className="label">Sync Interval (minutes)</label>
            <input className="input" type="number" defaultValue={5} min={1} max={60} {...register('syncInterval')} />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <strong>Note:</strong> Ensure the device is reachable on the network before saving.
            Default ZKTeco port is 4370.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : editDevice ? 'Update' : 'Add Device'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
