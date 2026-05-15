CREATE TYPE pay_period_status_enum AS ENUM (
  'open',
  'closed',
  'processing',
  'paid'
);

CREATE TYPE timesheet_status_enum AS ENUM (
  'open',
  'submitted',
  'approved',
  'rejected',
  'locked'
);

CREATE TYPE time_entry_status_enum AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'paid'
);

CREATE TYPE clock_event_type_enum AS ENUM (
  'clock_in',
  'clock_out',
  'break_start',
  'break_end',
  'manual_adjustment'
);

CREATE TYPE clock_event_source_enum AS ENUM (
  'web',
  'mobile',
  'kiosk',
  'system'
);

CREATE TABLE pay_periods (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  status pay_period_status_enum NOT NULL DEFAULT 'open',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pay_date DATE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  closed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (period_end >= period_start)
);

CREATE UNIQUE INDEX uq_pay_periods_org_dates
  ON pay_periods (organization_id, period_start, period_end);
CREATE INDEX idx_pay_periods_org_status ON pay_periods (organization_id, status);

CREATE TABLE timesheets (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  pay_period_id UUID NOT NULL REFERENCES pay_periods(id) ON DELETE RESTRICT,
  submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status timesheet_status_enum NOT NULL DEFAULT 'open',
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (total_minutes >= 0)
);

CREATE UNIQUE INDEX uq_timesheets_employee_period ON timesheets (employee_id, pay_period_id);
CREATE INDEX idx_timesheets_period_status ON timesheets (pay_period_id, status);

CREATE TABLE clock_events (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type clock_event_type_enum NOT NULL,
  event_source clock_event_source_enum NOT NULL DEFAULT 'web',
  occurred_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_clock_events_employee_occurred_at ON clock_events (employee_id, occurred_at DESC);
CREATE INDEX idx_clock_events_project_task ON clock_events (project_id, task_id, occurred_at DESC);

CREATE TABLE time_entries (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  timesheet_id UUID REFERENCES timesheets(id) ON DELETE SET NULL,
  clock_in_event_id UUID REFERENCES clock_events(id) ON DELETE SET NULL,
  clock_out_event_id UUID REFERENCES clock_events(id) ON DELETE SET NULL,
  submitted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status time_entry_status_enum NOT NULL DEFAULT 'draft',
  work_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  minutes_worked INTEGER NOT NULL,
  is_billable BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (ended_at >= started_at),
  CHECK (minutes_worked >= 0)
);

CREATE INDEX idx_time_entries_employee_date ON time_entries (employee_id, work_date DESC);
CREATE INDEX idx_time_entries_project_status ON time_entries (project_id, status);
CREATE INDEX idx_time_entries_timesheet_id ON time_entries (timesheet_id);
