import axios, { AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((cfg) => {
  const token = Cookies.get('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  const slug = Cookies.get('company_slug');
  if (slug) cfg.headers['x-company-slug'] = slug;
  return cfg;
});

// Auto logout on 401
api.interceptors.response.use(
  (r) => r,
  (err: AxiosError) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      Cookies.remove('token');
      Cookies.remove('company_slug');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => r.data),
  getProfile: () => api.get('/auth/profile').then((r) => r.data),
};

// ─── Employees ────────────────────────────────────────────────────────────────
export const employeesApi = {
  list: (params?: Record<string, any>) =>
    api.get('/employees', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/employees/${id}`).then((r) => r.data),
  create: (data: any) => api.post('/employees', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/employees/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/employees/${id}`).then((r) => r.data),
  getDeviceMappings: (id: string) =>
    api.get(`/employees/${id}/device-mappings`).then((r) => r.data),
};

// ─── Devices ─────────────────────────────────────────────────────────────────
export const devicesApi = {
  list: () => api.get('/devices').then((r) => r.data),
  get: (id: string) => api.get(`/devices/${id}`).then((r) => r.data),
  getStats: (id: string) => api.get(`/devices/${id}/stats`).then((r) => r.data),
  create: (data: any) => api.post('/devices', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/devices/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/devices/${id}`).then((r) => r.data),
  sync: (id: string) => api.post(`/devices/${id}/sync`).then((r) => r.data),
  syncAll: () => api.post('/devices/sync').then((r) => r.data),
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceApi = {
  daily: (params: Record<string, any>) =>
    api.get('/attendance/daily', { params }).then((r) => r.data),
  monthlyReport: (params: Record<string, any>) =>
    api.get('/attendance/monthly-report', { params }).then((r) => r.data),
  summary: (date: string) =>
    api.get('/attendance/summary', { params: { date } }).then((r) => r.data),
  correct: (employeeId: string, date: string, data: any) =>
    api.post(`/attendance/correct/${employeeId}/${date}`, data).then((r) => r.data),
};

// ─── Shifts ───────────────────────────────────────────────────────────────────
export const shiftsApi = {
  list: () => api.get('/shifts').then((r) => r.data),
  create: (data: any) => api.post('/shifts', data).then((r) => r.data),
  update: (id: string, data: any) =>
    api.patch(`/shifts/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/shifts/${id}`).then((r) => r.data),
};

// ─── Departments ─────────────────────────────────────────────────────────────
export const departmentsApi = {
  list: () => api.get('/departments').then((r) => r.data),
  create: (name: string) => api.post('/departments', { name }).then((r) => r.data),
};

// ─── My Attendance (Employee Self-Service) ────────────────────────────────────
export const myAttendanceApi = {
  daily: (date: string, page = 1, limit = 30) =>
    api.get('/attendance/my/daily', { params: { date, page, limit } }).then((r) => r.data),
  monthly: (year: number, month: number) =>
    api.get('/attendance/my/monthly', { params: { year, month } }).then((r) => r.data),
};

// ─── My Profile (Employee Self-Service) ──────────────────────────────────────
export const myProfileApi = {
  get: () => api.get('/employees/me').then((r) => r.data),
};

// ─── Holidays ─────────────────────────────────────────────────────────────────
export const holidaysApi = {
  list: (year?: number) =>
    api.get('/holidays', { params: year ? { year } : {} }).then((r) => r.data),
  create: (data: { date: string; name: string; description?: string }) =>
    api.post('/holidays', data).then((r) => r.data),
  remove: (id: string) => api.delete(`/holidays/${id}`).then((r) => r.data),
};

// ─── Leaves ───────────────────────────────────────────────────────────────────
export const leavesApi = {
  list: (params?: Record<string, any>) =>
    api.get('/leaves', { params }).then((r) => r.data),
  approve: (id: string, reviewNote?: string) =>
    api.patch(`/leaves/${id}/approve`, { reviewNote }).then((r) => r.data),
  reject: (id: string, reviewNote?: string) =>
    api.patch(`/leaves/${id}/reject`, { reviewNote }).then((r) => r.data),
};

// ─── My Leaves (Employee Self-Service) ───────────────────────────────────────
export const myLeavesApi = {
  list: (page = 1) => api.get('/leaves/my', { params: { page } }).then((r) => r.data),
  create: (data: { startDate: string; endDate: string; leaveType: string; reason: string }) =>
    api.post('/leaves', data).then((r) => r.data),
  cancel: (id: string) => api.delete(`/leaves/${id}`).then((r) => r.data),
};

// ─── Superadmin ───────────────────────────────────────────────────────────────
export const superadminApi = {
  stats: () => api.get('/superadmin/stats').then((r) => r.data),
  companies: (params?: Record<string, any>) =>
    api.get('/superadmin/companies', { params }).then((r) => r.data),
  company: (id: string) => api.get(`/superadmin/companies/${id}`).then((r) => r.data),
  toggleCompany: (id: string) =>
    api.patch(`/superadmin/companies/${id}/toggle`).then((r) => r.data),
  resetPassword: (id: string, newPassword: string) =>
    api.post(`/superadmin/companies/${id}/reset-password`, { newPassword }).then((r) => r.data),
  activity: () => api.get('/superadmin/activity').then((r) => r.data),
};
