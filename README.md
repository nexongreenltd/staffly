# Staffly

> Production-ready multi-tenant SaaS HRM/ERP with biometric attendance (ZKTeco K40 and compatible devices).

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         TerraPrime HRM                       │
├──────────────┬──────────────────┬──────────────┬────────────┤
│  Frontend    │    Backend API   │    Worker    │  Database  │
│  Next.js 14  │    NestJS        │  Node.js     │ PostgreSQL │
│  App Router  │    REST + Swagger│  BullMQ      │ Redis      │
│  Tailwind    │    JWT + RBAC    │  ZKTeco TCP  │            │
└──────────────┴──────────────────┴──────────────┴────────────┘
                        Multi-tenant (company_id isolation)
```

---

## Quick Start (Docker)

```bash
# 1. Clone and setup environment
cp .env.example .env
# Edit .env with your values

# 2. Start all services
docker-compose up -d

# 3. Access the application
# Frontend:  http://localhost:3000
# API:       http://localhost:3001/api/v1
# Swagger:   http://localhost:3001/api/docs
```

### Default Credentials
| Role           | Email                    | Password   |
|----------------|--------------------------|------------|
| Super Admin    | superadmin@terraprime.io | Admin@123  |
| Company Admin  | admin@acme.com           | Admin@123  |

---

## Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+
- Redis 7+

### Backend
```bash
cd apps/backend
npm install
cp ../../.env.example .env   # edit as needed
npm run start:dev
```

### Worker
```bash
cd apps/worker
npm install
npm run start:dev
```

### Frontend
```bash
cd apps/frontend
npm install
npm run dev
```

---

## Project Structure

```
terraprime-hrm/
├── apps/
│   ├── backend/                    # NestJS API
│   │   └── src/
│   │       ├── modules/
│   │       │   ├── auth/           # JWT auth, login
│   │       │   ├── companies/      # Tenant management
│   │       │   ├── employees/      # HR records
│   │       │   ├── devices/        # Biometric device registry
│   │       │   ├── attendance/     # Daily + monthly reports
│   │       │   ├── shifts/         # Work shift config
│   │       │   ├── departments/    # Org structure
│   │       │   └── queue/          # BullMQ producers
│   │       ├── database/
│   │       │   └── entities/       # TypeORM entities
│   │       └── common/
│   │           ├── guards/         # JWT + Roles guards
│   │           ├── decorators/     # @CompanyId, @CurrentUser
│   │           ├── middleware/     # Tenant isolation
│   │           └── filters/        # Global exception filter
│   │
│   ├── worker/                     # Background worker service
│   │   └── src/
│   │       ├── zkteco/
│   │       │   ├── zkteco.client.ts  # ZKTeco TCP binary protocol
│   │       │   └── zkteco.types.ts
│   │       ├── workers/
│   │       │   ├── device-sync.worker.ts       # BullMQ processor
│   │       │   └── attendance-processor.worker.ts
│   │       ├── db/                 # Direct PG queries
│   │       └── index.ts            # Scheduler bootstrap
│   │
│   └── frontend/                   # Next.js 14 App Router
│       ├── app/
│       │   ├── (auth)/login/       # Login page
│       │   └── (dashboard)/
│       │       ├── dashboard/      # KPI overview + charts
│       │       ├── employees/      # CRUD + device sync status
│       │       ├── devices/        # Device management + sync
│       │       ├── attendance/     # Daily/monthly + corrections
│       │       └── shifts/         # Shift management
│       ├── components/
│       │   ├── layout/             # Sidebar, Header
│       │   └── ui/                 # Badge, Modal, StatsCard
│       └── lib/
│           ├── api.ts              # Axios instance + API calls
│           ├── auth.ts             # Cookie/localStorage helpers
│           └── utils.ts            # Formatters, CSV export
│
├── database/
│   ├── schema.sql                  # Full PostgreSQL schema
│   └── seed.sql                    # Demo data
├── nginx/
│   └── default.conf                # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

---

## Database Schema

Key tables with `company_id` tenant isolation on every row:

| Table                  | Purpose                                         |
|------------------------|-------------------------------------------------|
| `companies`            | Tenant registry                                 |
| `users`                | Auth accounts (superadmin/company_admin/employee)|
| `employees`            | HR employee records                             |
| `departments`          | Org structure                                   |
| `shifts`               | Work shift configurations                       |
| `devices`              | ZKTeco device registry                          |
| `device_employee_map`  | `device_user_id ↔ employee_id` mapping          |
| `attendance_logs`      | Raw punches from devices (deduped by index)     |
| `daily_attendance`     | Processed per-employee-per-day records          |
| `holidays`             | Company holidays                                |
| `leave_requests`       | Leave management                                |
| `audit_logs`           | Full audit trail                                |

---

## API Reference

### Auth
```http
POST /api/v1/auth/login
GET  /api/v1/auth/profile
```

### Companies (SuperAdmin)
```http
POST   /api/v1/companies
GET    /api/v1/companies
GET    /api/v1/companies/:id
PATCH  /api/v1/companies/:id
PATCH  /api/v1/companies/:id/toggle
```

### Employees
```http
POST   /api/v1/employees
GET    /api/v1/employees?search=&status=&page=&limit=
GET    /api/v1/employees/:id
PATCH  /api/v1/employees/:id
DELETE /api/v1/employees/:id          # deactivates + removes from devices
GET    /api/v1/employees/:id/device-mappings
```

### Devices
```http
POST   /api/v1/devices
GET    /api/v1/devices
GET    /api/v1/devices/:id
GET    /api/v1/devices/:id/stats
PATCH  /api/v1/devices/:id
DELETE /api/v1/devices/:id
POST   /api/v1/devices/sync           # sync all devices
POST   /api/v1/devices/:id/sync       # sync specific device
```

### Attendance
```http
GET  /api/v1/attendance/daily?date=YYYY-MM-DD&status=&employeeId=
GET  /api/v1/attendance/monthly-report?year=&month=&employeeId=
GET  /api/v1/attendance/summary?date=YYYY-MM-DD
POST /api/v1/attendance/process        # trigger manual processing
POST /api/v1/attendance/correct/:employeeId/:date
```

### Shifts, Departments (standard CRUD)
```http
GET|POST|PATCH|DELETE /api/v1/shifts
GET|POST|PATCH|DELETE /api/v1/departments
```

---

## Attendance Engine

```
Raw Logs (attendance_logs)
    └── Worker pulls every 5 min from ZKTeco device
    └── Stored with device_user_id
    └── Mapped to employee_id via device_employee_map

Processing (daily_attendance):
    first punch  → check_in
    last punch   → check_out
    working_hours = (check_out - check_in) in hours

    if check_in > shift_start + grace_minutes:
        late_minutes = (check_in - shift_start) in minutes
        status = 'late'
    else:
        status = 'present'

    if check_out < shift_end:
        early_out_min = (shift_end - check_out) in minutes
        if working_hours < 4: status = 'half_day'

    if check_out > shift_end:
        overtime_min = (check_out - shift_end) in minutes
```

---

## ZKTeco Device Integration

The worker implements the **ZKTeco binary TCP protocol** over port 4370.

### Protocol Overview
```
Packet format (TCP):
  [SIZE:4 bytes LE][CMD:2][CHECKSUM:2][SESSION_ID:2][REPLY_ID:2][DATA:variable]

Key commands:
  CMD_CONNECT      = 1000  → Establish session, get session_id
  CMD_DISABLEDEVICE= 1003  → Disable device during sync
  CMD_GET_ATTLOG   = 13    → Pull all attendance records
  CMD_GET_USERINFO = 9     → Read enrolled users
  CMD_SET_USERINFO = 8     → Push new user to device
  CMD_DELETE_USER  = 18    → Remove user from device
  CMD_ENABLEDEVICE = 1002  → Re-enable device after sync
  CMD_EXIT         = 1001  → Disconnect
```

### Fingerprint Enrollment
Fingerprint templates **cannot be enrolled remotely** via TCP.
Enrollment must be done physically on the device.
After enrollment, the system automatically detects the user on the next sync.

### Supported Models
ZKTeco K40, F22, UA300, and any device supporting the ZKTeco binary TCP SDK on port 4370.

---

## Multi-Tenancy

- All database tables include `company_id`
- `TenantMiddleware` extracts company slug from:
  1. `X-Company-Slug` request header
  2. Subdomain (e.g., `acme.terraprime.io`)
- JWT payload includes `companyId`
- All service queries are scoped to `companyId`
- TypeORM never leaks cross-tenant data

---

## Role-Based Access Control

| Role           | Access                                          |
|----------------|-------------------------------------------------|
| `superadmin`   | All companies, all data, system config          |
| `company_admin`| Own company data only                           |
| `employee`     | Own attendance and profile only                 |

---

## Deployment (Production)

```bash
# With Nginx reverse proxy
docker-compose --profile production up -d

# Scale workers
docker-compose up -d --scale worker=3
```

### Environment Checklist
- [ ] Change `JWT_SECRET` to a 64+ char random string
- [ ] Set `DB_PASS` to a strong password
- [ ] Configure `REDIS_PASS`
- [ ] Set `FRONTEND_URL` to your domain
- [ ] Set `NEXT_PUBLIC_API_URL` to your API domain
- [ ] Configure SSL in nginx
- [ ] Set `NODE_ENV=production`

---

## Bonus Features Implemented

- [x] Multi-device per company
- [x] Manual attendance correction (with reason + audit)
- [x] Audit logs on all critical actions
- [x] CSV export for reports
- [x] Device error tracking with last error message
- [x] Biometric enrollment status tracking
- [x] Shift grace period and overtime calculation
- [ ] Holiday/weekend support (schema ready, mark logic pending)
- [ ] Full leave management UI (backend + DB complete)
