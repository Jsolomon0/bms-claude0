CREATE TYPE inventory_item_status_enum AS ENUM (
  'active',
  'inactive',
  'discontinued'
);

CREATE TYPE inventory_movement_type_enum AS ENUM (
  'receipt',
  'issue',
  'return',
  'adjustment',
  'transfer',
  'reservation_release'
);

CREATE TYPE material_allocation_status_enum AS ENUM (
  'requested',
  'approved',
  'partially_fulfilled',
  'fulfilled',
  'cancelled'
);

CREATE TYPE message_thread_status_enum AS ENUM (
  'open',
  'closed',
  'archived'
);

CREATE TYPE message_participant_type_enum AS ENUM (
  'user',
  'contact',
  'customer',
  'organization'
);

CREATE TYPE message_participant_status_enum AS ENUM (
  'active',
  'left',
  'removed'
);

CREATE TYPE notification_channel_enum AS ENUM (
  'in_app',
  'email',
  'sms',
  'push'
);

CREATE TYPE notification_status_enum AS ENUM (
  'queued',
  'sent',
  'delivered',
  'read',
  'failed'
);

CREATE TABLE inventory_items (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_of_measure TEXT NOT NULL,
  status inventory_item_status_enum NOT NULL DEFAULT 'active',
  quantity_on_hand NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reorder_point NUMERIC(14, 2),
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

CREATE UNIQUE INDEX uq_inventory_items_org_sku_active
  ON inventory_items (organization_id, sku)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_items_status ON inventory_items (organization_id, status) WHERE deleted_at IS NULL;

CREATE TABLE project_material_allocations (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id UUID REFERENCES phases(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  requested_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status material_allocation_status_enum NOT NULL DEFAULT 'requested',
  quantity_requested NUMERIC(14, 2) NOT NULL,
  quantity_allocated NUMERIC(14, 2) NOT NULL DEFAULT 0,
  quantity_consumed NUMERIC(14, 2) NOT NULL DEFAULT 0,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ,
  archived_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (quantity_requested >= 0),
  CHECK (quantity_allocated >= 0),
  CHECK (quantity_consumed >= 0)
);

CREATE INDEX idx_project_material_allocations_project_status
  ON project_material_allocations (project_id, status);
CREATE INDEX idx_project_material_allocations_inventory_item_id
  ON project_material_allocations (inventory_item_id);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  material_allocation_id UUID REFERENCES project_material_allocations(id) ON DELETE SET NULL,
  entered_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  movement_type inventory_movement_type_enum NOT NULL,
  quantity_delta NUMERIC(14, 2) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (quantity_delta <> 0)
);

CREATE INDEX idx_inventory_movements_item_occurred_at
  ON inventory_movements (inventory_item_id, occurred_at DESC);
CREATE INDEX idx_inventory_movements_project_id
  ON inventory_movements (project_id, occurred_at DESC);

CREATE TABLE message_threads (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  status message_thread_status_enum NOT NULL DEFAULT 'open',
  subject TEXT NOT NULL,
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

CREATE INDEX idx_message_threads_project_id ON message_threads (project_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_message_threads_customer_id ON message_threads (customer_id) WHERE deleted_at IS NULL;

CREATE TABLE message_participants (
  id UUID PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  participant_type message_participant_type_enum NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  status message_participant_status_enum NOT NULL DEFAULT 'active',
  last_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    (participant_type = 'user' AND user_id IS NOT NULL AND contact_id IS NULL AND customer_id IS NULL AND organization_id IS NULL) OR
    (participant_type = 'contact' AND user_id IS NULL AND contact_id IS NOT NULL AND customer_id IS NULL AND organization_id IS NULL) OR
    (participant_type = 'customer' AND user_id IS NULL AND contact_id IS NULL AND customer_id IS NOT NULL AND organization_id IS NULL) OR
    (participant_type = 'organization' AND user_id IS NULL AND contact_id IS NULL AND customer_id IS NULL AND organization_id IS NOT NULL)
  )
);

CREATE INDEX idx_message_participants_thread_id ON message_participants (thread_id);
CREATE INDEX idx_message_participants_user_id ON message_participants (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_message_participants_contact_id ON message_participants (contact_id) WHERE contact_id IS NOT NULL;

CREATE TABLE messages (
  id UUID PRIMARY KEY,
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  body_format TEXT NOT NULL DEFAULT 'plain_text',
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (
    ((sender_user_id IS NOT NULL)::INTEGER + (sender_contact_id IS NOT NULL)::INTEGER) = 1
  )
);

CREATE INDEX idx_messages_thread_created_at ON messages (thread_id, created_at DESC);

CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  recipient_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recipient_contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  thread_id UUID REFERENCES message_threads(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  channel notification_channel_enum NOT NULL,
  status notification_status_enum NOT NULL DEFAULT 'queued',
  notification_type TEXT NOT NULL,
  subject TEXT,
  body_preview TEXT,
  visibility_flags visibility_flag_enum[] NOT NULL DEFAULT ARRAY['internal']::visibility_flag_enum[],
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  retention_locked BOOLEAN NOT NULL DEFAULT FALSE,
  retention_until TIMESTAMPTZ,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (
    ((recipient_user_id IS NOT NULL)::INTEGER + (recipient_contact_id IS NOT NULL)::INTEGER) = 1
  )
);

CREATE INDEX idx_notifications_recipient_user_status
  ON notifications (recipient_user_id, status, queued_at DESC)
  WHERE recipient_user_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_notifications_recipient_contact_status
  ON notifications (recipient_contact_id, status, queued_at DESC)
  WHERE recipient_contact_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_notifications_thread_id
  ON notifications (thread_id, queued_at DESC)
  WHERE thread_id IS NOT NULL AND deleted_at IS NULL;
