CREATE TYPE invoice_status_enum AS ENUM (
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'void',
  'overdue',
  'cancelled'
);

CREATE TYPE payment_status_enum AS ENUM (
  'pending',
  'authorized',
  'settled',
  'failed',
  'refunded',
  'voided'
);

CREATE TYPE payment_method_enum AS ENUM (
  'card',
  'ach',
  'wire',
  'cash',
  'check',
  'other'
);

CREATE TYPE expense_status_enum AS ENUM (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'reimbursed'
);

CREATE TYPE expense_claimant_type_enum AS ENUM (
  'employee',
  'subcontractor'
);

CREATE TYPE bill_status_enum AS ENUM (
  'draft',
  'received',
  'approved',
  'scheduled',
  'paid',
  'void'
);

CREATE TYPE purchase_order_status_enum AS ENUM (
  'draft',
  'issued',
  'partially_received',
  'received',
  'closed',
  'cancelled'
);

CREATE TYPE receipt_status_enum AS ENUM (
  'recorded',
  'matched',
  'voided'
);

CREATE TYPE transaction_status_enum AS ENUM (
  'pending',
  'posted',
  'failed',
  'reversed'
);

CREATE TYPE transaction_direction_enum AS ENUM (
  'debit',
  'credit'
);

CREATE TYPE transaction_type_enum AS ENUM (
  'invoice_payment',
  'expense_reimbursement',
  'bill_payment',
  'purchase_order_commitment',
  'receipt_posting',
  'adjustment'
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  status invoice_status_enum NOT NULL DEFAULT 'draft',
  currency_code CHAR(3) NOT NULL,
  issued_at DATE,
  due_at DATE,
  subtotal_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  balance_due_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal', 'customer']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uq_invoices_org_number_active
  ON invoices (organization_id, invoice_number)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_customer_status ON invoices (customer_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_invoices_project_id ON invoices (project_id) WHERE deleted_at IS NULL;

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(6, 4) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  CHECK (quantity >= 0),
  CHECK (unit_amount >= 0),
  CHECK (tax_rate >= 0)
);

CREATE UNIQUE INDEX uq_invoice_items_invoice_line ON invoice_items (invoice_id, line_number);

CREATE TABLE payments (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  payer_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  received_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status payment_status_enum NOT NULL DEFAULT 'pending',
  payment_method payment_method_enum NOT NULL DEFAULT 'other',
  provider_name TEXT,
  provider_reference TEXT,
  currency_code CHAR(3) NOT NULL,
  gross_amount NUMERIC(14, 2) NOT NULL,
  fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  authorized_at TIMESTAMPTZ,
  settled_at TIMESTAMPTZ,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal', 'customer']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX idx_payments_customer_status ON payments (customer_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_provider_reference ON payments (provider_name, provider_reference) WHERE provider_reference IS NOT NULL;

CREATE TABLE payment_allocations (
  id UUID PRIMARY KEY,
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(14, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (allocated_amount > 0)
);

CREATE UNIQUE INDEX uq_payment_allocations_payment_invoice
  ON payment_allocations (payment_id, invoice_id);
CREATE INDEX idx_payment_allocations_invoice_id ON payment_allocations (invoice_id);

CREATE TABLE expenses (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  claimant_type expense_claimant_type_enum NOT NULL,
  claimant_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  claimant_subcontractor_id UUID REFERENCES subcontractors(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  expense_category TEXT NOT NULL,
  description TEXT NOT NULL,
  status expense_status_enum NOT NULL DEFAULT 'draft',
  currency_code CHAR(3) NOT NULL,
  expense_date DATE NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (amount >= 0),
  CHECK (
    (claimant_type = 'employee' AND claimant_employee_id IS NOT NULL AND claimant_subcontractor_id IS NULL) OR
    (claimant_type = 'subcontractor' AND claimant_employee_id IS NULL AND claimant_subcontractor_id IS NOT NULL)
  )
);

CREATE INDEX idx_expenses_project_status ON expenses (project_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_employee_status ON expenses (claimant_employee_id, status) WHERE claimant_employee_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_expenses_subcontractor_status ON expenses (claimant_subcontractor_id, status) WHERE claimant_subcontractor_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  vendor_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  po_number TEXT NOT NULL,
  status purchase_order_status_enum NOT NULL DEFAULT 'draft',
  currency_code CHAR(3) NOT NULL,
  issued_at DATE,
  expected_at DATE,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uq_purchase_orders_org_number_active
  ON purchase_orders (organization_id, po_number)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_purchase_orders_vendor_status ON purchase_orders (vendor_organization_id, status) WHERE deleted_at IS NULL;

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  CHECK (quantity >= 0),
  CHECK (unit_cost >= 0)
);

CREATE UNIQUE INDEX uq_purchase_order_items_po_line
  ON purchase_order_items (purchase_order_id, line_number);

CREATE TABLE bills (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  vendor_organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  bill_number TEXT NOT NULL,
  status bill_status_enum NOT NULL DEFAULT 'draft',
  currency_code CHAR(3) NOT NULL,
  issued_at DATE,
  due_at DATE,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE UNIQUE INDEX uq_bills_org_bill_number_active
  ON bills (organization_id, bill_number)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_bills_vendor_status ON bills (vendor_organization_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_bills_purchase_order_id ON bills (purchase_order_id) WHERE deleted_at IS NULL;

CREATE TABLE bill_items (
  id UUID PRIMARY KEY,
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  purchase_order_item_id UUID REFERENCES purchase_order_items(id) ON DELETE SET NULL,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(12, 2) NOT NULL DEFAULT 1,
  unit_cost NUMERIC(14, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
  CHECK (quantity >= 0),
  CHECK (unit_cost >= 0)
);

CREATE UNIQUE INDEX uq_bill_items_bill_line ON bill_items (bill_id, line_number);

CREATE TABLE receipts (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  bill_id UUID REFERENCES bills(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  issued_to_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  receipt_number TEXT NOT NULL,
  status receipt_status_enum NOT NULL DEFAULT 'recorded',
  currency_code CHAR(3) NOT NULL,
  total_amount NUMERIC(14, 2) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  deleted_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (
    ((payment_id IS NOT NULL)::INTEGER +
     (expense_id IS NOT NULL)::INTEGER +
     (bill_id IS NOT NULL)::INTEGER +
     (purchase_order_id IS NOT NULL)::INTEGER) = 1
  )
);

CREATE UNIQUE INDEX uq_receipts_org_number_active
  ON receipts (organization_id, receipt_number)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_receipts_payment_id ON receipts (payment_id) WHERE payment_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_receipts_expense_id ON receipts (expense_id) WHERE expense_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE transactions (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  payment_id UUID REFERENCES payments(id) ON DELETE RESTRICT,
  expense_id UUID REFERENCES expenses(id) ON DELETE RESTRICT,
  bill_id UUID REFERENCES bills(id) ON DELETE RESTRICT,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  receipt_id UUID REFERENCES receipts(id) ON DELETE RESTRICT,
  entered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  transaction_type transaction_type_enum NOT NULL,
  direction transaction_direction_enum NOT NULL,
  status transaction_status_enum NOT NULL DEFAULT 'pending',
  currency_code CHAR(3) NOT NULL,
  amount NUMERIC(14, 2) NOT NULL,
  effective_at TIMESTAMPTZ NOT NULL,
  external_reference TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (amount >= 0),
  CHECK (
    ((payment_id IS NOT NULL)::INTEGER +
     (expense_id IS NOT NULL)::INTEGER +
     (bill_id IS NOT NULL)::INTEGER +
     (purchase_order_id IS NOT NULL)::INTEGER +
     (receipt_id IS NOT NULL)::INTEGER) = 1
  )
);

CREATE INDEX idx_transactions_org_effective_at ON transactions (organization_id, effective_at DESC);
CREATE INDEX idx_transactions_status_type ON transactions (status, transaction_type, effective_at DESC);
