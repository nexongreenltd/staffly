'use client';

import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { User, Briefcase, Clock, Calendar, Mail, Phone, BadgeCheck } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { myProfileApi } from '@/lib/api';
import { cn } from '@/lib/utils';

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

export default function MyProfilePage() {
  const { data: employee, isLoading } = useQuery({
    queryKey: ['my-profile'],
    queryFn: () => myProfileApi.get(),
  });

  if (isLoading) {
    return (
      <div>
        <Header title="My Profile" />
        <div className="p-6">
          <div className="card p-8 text-center text-sm text-gray-400">Loading…</div>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <div>
        <Header title="My Profile" />
        <div className="p-6">
          <div className="card p-8 text-center text-sm text-gray-400">Profile not found.</div>
        </div>
      </div>
    );
  }

  const shift = employee.shift;

  return (
    <div>
      <Header title="My Profile" />
      <div className="p-6 space-y-6">

        {/* Avatar + name banner */}
        <div className="card p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-brand-700 text-xl font-bold shrink-0">
            {employee.firstName?.[0]}{employee.lastName?.[0]}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {employee.firstName} {employee.lastName}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">{employee.designation || 'Employee'}</p>
            <span className={cn(
              'badge text-xs mt-1 capitalize',
              employee.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600',
            )}>
              {employee.status}
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Personal info */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <User className="w-4 h-4 text-brand-600" />
              Personal Information
            </div>
            <Field label="Employee ID" value={employee.employeeCode} />
            <Field label="Email" value={employee.email} />
            <Field label="Phone" value={employee.phone} />
            <Field
              label="Joining Date"
              value={employee.joiningDate ? format(new Date(employee.joiningDate), 'MMMM d, yyyy') : null}
            />
          </div>

          {/* Shift info */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Clock className="w-4 h-4 text-brand-600" />
              Shift Details
            </div>
            {shift ? (
              <>
                <Field label="Shift Name" value={shift.name} />
                <Field
                  label="Working Hours"
                  value={shift.startTime && shift.endTime ? `${shift.startTime} – ${shift.endTime}` : null}
                />
                <Field label="Grace Period" value={shift.gracePeriodMinutes != null ? `${shift.gracePeriodMinutes} minutes` : null} />
                <Field label="Working Days" value={
                  Array.isArray(shift.workingDays)
                    ? shift.workingDays.map((d: string) => d.charAt(0).toUpperCase() + d.slice(1)).join(', ')
                    : null
                } />
              </>
            ) : (
              <p className="text-sm text-gray-400">No shift assigned.</p>
            )}
          </div>
        </div>

        {/* Biometric status */}
        <div className="card p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-4">
            <BadgeCheck className="w-4 h-4 text-brand-600" />
            Biometric Status
          </div>
          <div className="flex items-center gap-3">
            <span className={cn(
              'badge capitalize text-sm',
              employee.biometricStatus === 'enrolled' ? 'bg-green-100 text-green-700' :
              employee.biometricStatus === 'pending'  ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600',
            )}>
              {employee.biometricStatus?.replace('_', ' ')}
            </span>
            {employee.cardNumber && (
              <span className="text-xs text-gray-500 font-mono">Card: {employee.cardNumber}</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
