-- FMLE customer portal data layer
-- Maps Supabase Auth users to BMS users/customers and exposes only customer-scoped data.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS uq_users_auth_user_id
  ON users (auth_user_id)
  WHERE auth_user_id IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS fmle_tax_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL CHECK (tax_year BETWEEN 2000 AND 2200),
  return_type TEXT NOT NULL DEFAULT 'individual',
  status TEXT NOT NULL DEFAULT 'intake'
    CHECK (status IN (
      'intake',
      'documents_needed',
      'in_preparation',
      'client_review',
      'ready_to_file',
      'filed',
      'accepted',
      'action_required',
      'completed'
    )),
  status_message TEXT,
  filed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, tax_year, return_type)
);

CREATE INDEX IF NOT EXISTS idx_fmle_tax_returns_customer_year
  ON fmle_tax_returns (customer_id, tax_year DESC);

CREATE OR REPLACE FUNCTION fmle_current_customer_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mapped_user AS (
    SELECT u.id
    FROM users u
    WHERE u.auth_user_id = auth.uid()
      AND u.deleted_at IS NULL
      AND u.status = 'active'
    LIMIT 1
  ),
  owned_customer AS (
    SELECT c.id
    FROM customers c
    JOIN mapped_user mu ON c.owner_user_id = mu.id
    WHERE c.deleted_at IS NULL
      AND c.status IN ('active', 'retained_legal')
    ORDER BY c.created_at ASC
    LIMIT 1
  ),
  membership_customer AS (
    SELECT urm.customer_id AS id
    FROM user_role_memberships urm
    JOIN mapped_user mu ON urm.user_id = mu.id
    JOIN customers c ON c.id = urm.customer_id
    WHERE urm.active = TRUE
      AND urm.customer_id IS NOT NULL
      AND (urm.starts_at IS NULL OR urm.starts_at <= NOW())
      AND (urm.ends_at IS NULL OR urm.ends_at > NOW())
      AND c.deleted_at IS NULL
      AND c.status IN ('active', 'retained_legal')
    ORDER BY urm.created_at ASC
    LIMIT 1
  )
  SELECT COALESCE(
    (SELECT id FROM owned_customer),
    (SELECT id FROM membership_customer)
  );
$$;

CREATE OR REPLACE FUNCTION fmle_customer_portal_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_result JSONB;
BEGIN
  v_customer_id := fmle_current_customer_id();

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_not_linked' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'customerId', v_customer_id,

    'appointments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'status', c.status,
        'scheduledStartAt', c.scheduled_start_at,
        'scheduledEndAt', c.scheduled_end_at,
        'notes', c.notes,
        'createdAt', c.created_at
      ) ORDER BY COALESCE(c.scheduled_start_at, c.created_at) DESC)
      FROM consultations c
      WHERE c.customer_id = v_customer_id
        AND c.deleted_at IS NULL
        AND 'customer' = ANY(c.visibility_flags)
    ), '[]'::jsonb),

    'taxReturns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', tr.id,
        'taxYear', tr.tax_year,
        'returnType', tr.return_type,
        'status', tr.status,
        'statusMessage', tr.status_message,
        'filedAt', tr.filed_at,
        'acceptedAt', tr.accepted_at,
        'completedAt', tr.completed_at,
        'updatedAt', tr.updated_at
      ) ORDER BY tr.tax_year DESC, tr.updated_at DESC)
      FROM fmle_tax_returns tr
      WHERE tr.customer_id = v_customer_id
    ), '[]'::jsonb),

    'documents', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id,
        'title', d.title,
        'category', d.document_category,
        'status', d.status,
        'updatedAt', d.updated_at,
        'versionId', dv.id,
        'versionNumber', dv.version_number,
        'fileName', dv.file_name,
        'contentType', dv.content_type,
        'byteSize', dv.byte_size,
        'downloadable', EXISTS (
          SELECT 1
          FROM document_access_rules ar2
          WHERE ar2.document_id = d.id
            AND ar2.principal_type = 'customer'
            AND ar2.principal_customer_id = v_customer_id
            AND ar2.effect = 'allow'
            AND ar2.access_level IN ('download', 'manage')
        )
      ) ORDER BY d.updated_at DESC)
      FROM documents d
      LEFT JOIN LATERAL (
        SELECT v.*
        FROM document_versions v
        WHERE v.document_id = d.id
          AND v.status = 'current'
        ORDER BY v.version_number DESC
        LIMIT 1
      ) dv ON TRUE
      WHERE d.customer_id = v_customer_id
        AND d.deleted_at IS NULL
        AND d.status = 'active'
        AND 'customer' = ANY(d.visibility_flags)
        AND EXISTS (
          SELECT 1
          FROM document_access_rules ar
          WHERE ar.document_id = d.id
            AND ar.principal_type = 'customer'
            AND ar.principal_customer_id = v_customer_id
            AND ar.effect = 'allow'
            AND ar.access_level IN ('view', 'download', 'manage')
        )
    ), '[]'::jsonb),

    'invoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'invoiceNumber', i.invoice_number,
        'status', i.status,
        'currencyCode', i.currency_code,
        'issuedAt', i.issued_at,
        'dueAt', i.due_at,
        'totalAmount', i.total_amount,
        'balanceDueAmount', i.balance_due_amount
      ) ORDER BY COALESCE(i.issued_at, i.created_at::date) DESC)
      FROM invoices i
      WHERE i.customer_id = v_customer_id
        AND i.deleted_at IS NULL
        AND 'customer' = ANY(i.visibility_flags)
        AND i.status <> 'draft'
    ), '[]'::jsonb),

    'payments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'status', p.status,
        'paymentMethod', p.payment_method,
        'currencyCode', p.currency_code,
        'grossAmount', p.gross_amount,
        'netAmount', p.net_amount,
        'authorizedAt', p.authorized_at,
        'settledAt', p.settled_at,
        'createdAt', p.created_at
      ) ORDER BY COALESCE(p.settled_at, p.authorized_at, p.created_at) DESC)
      FROM payments p
      WHERE p.customer_id = v_customer_id
        AND p.deleted_at IS NULL
        AND 'customer' = ANY(p.visibility_flags)
    ), '[]'::jsonb),

    'messageThreads', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', mt.id,
        'subject', mt.subject,
        'status', mt.status,
        'updatedAt', mt.updated_at,
        'messages', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', m.id,
            'body', m.body,
            'createdAt', m.created_at,
            'fromStaff', m.sender_user_id IS NOT NULL
          ) ORDER BY m.created_at ASC)
          FROM messages m
          WHERE m.thread_id = mt.id
            AND 'customer' = ANY(m.visibility_flags)
        ), '[]'::jsonb)
      ) ORDER BY mt.updated_at DESC)
      FROM message_threads mt
      WHERE mt.deleted_at IS NULL
        AND mt.status <> 'archived'
        AND 'customer' = ANY(mt.visibility_flags)
        AND (
          mt.customer_id = v_customer_id
          OR EXISTS (
            SELECT 1
            FROM message_participants mp
            WHERE mp.thread_id = mt.id
              AND mp.participant_type = 'customer'
              AND mp.customer_id = v_customer_id
              AND mp.status = 'active'
          )
        )
    ), '[]'::jsonb)
  )
  INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fmle_customer_document_download(p_document_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_result JSONB;
BEGIN
  v_customer_id := fmle_current_customer_id();

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_not_linked' USING ERRCODE = 'P0001';
  END IF;

  SELECT jsonb_build_object(
    'documentId', d.id,
    'title', d.title,
    'versionId', dv.id,
    'fileName', dv.file_name,
    'contentType', dv.content_type,
    'storageKey', dv.storage_key
  )
  INTO v_result
  FROM documents d
  JOIN LATERAL (
    SELECT v.*
    FROM document_versions v
    WHERE v.document_id = d.id
      AND v.status = 'current'
    ORDER BY v.version_number DESC
    LIMIT 1
  ) dv ON TRUE
  WHERE d.id = p_document_id
    AND d.customer_id = v_customer_id
    AND d.deleted_at IS NULL
    AND d.status = 'active'
    AND 'customer' = ANY(d.visibility_flags)
    AND EXISTS (
      SELECT 1
      FROM document_access_rules ar
      WHERE ar.document_id = d.id
        AND ar.principal_type = 'customer'
        AND ar.principal_customer_id = v_customer_id
        AND ar.effect = 'allow'
        AND ar.access_level IN ('download', 'manage')
    );

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'document_not_available' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION fmle_current_customer_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION fmle_customer_portal_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION fmle_customer_document_download(UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION fmle_current_customer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION fmle_customer_portal_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION fmle_customer_document_download(UUID) TO authenticated;
