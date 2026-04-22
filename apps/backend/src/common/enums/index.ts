export enum UserRole {
  SUPERADMIN = 'superadmin',
  COMPANY_ADMIN = 'company_admin',
  EMPLOYEE = 'employee',
}

export enum EmployeeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TERMINATED = 'terminated',
}

export enum BiometricStatus {
  PENDING = 'pending',
  ENROLLED = 'enrolled',
  DISABLED = 'disabled',
}

export enum DeviceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
}

export enum AttendanceStatus {
  PRESENT = 'present',
  LATE = 'late',
  ABSENT = 'absent',
  HALF_DAY = 'half_day',
  HOLIDAY = 'holiday',
  WEEKEND = 'weekend',
  ON_LEAVE = 'on_leave',
}

export enum PunchType {
  CHECK_IN = 0,
  CHECK_OUT = 1,
  OT_IN = 4,
  OT_OUT = 5,
}

export enum VerifyType {
  PASSWORD = 0,
  FINGERPRINT = 1,
  CARD = 4,
  FACE = 8,
}

export enum QueueName {
  DEVICE_SYNC = 'device-sync',
  ATTENDANCE_PROCESS = 'attendance-process',
}
