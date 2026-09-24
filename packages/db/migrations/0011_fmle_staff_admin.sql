-- FMLE staff/admin workspace
-- Only BMS owner/administrator roles may execute these functions.

CREATE OR REPLACE FUNCTION fmle_current_staff_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id
  FROM users u
  WHERE u.auth_user_id = auth.uid()
    AND u.deleted_at IS NULL
    AND u.status = 'active'
    AND EXISTS (
      SELECT 1
      FROM user_role_memberships urm
      JOIN roles r ON r.id = urm.role_id
      WHERE urm.user_id = u.id
        AND urm.active = TRUE
        AND (urm.starts_at IS NULL OR urm.starts_at <= NOW())
        AND (urm.ends_at IS NULL OR urm.ends_at > NOW())
        AND r.key IN ('owner', 'administrator')
    )
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION fmle_require_staff_user_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := fmle_current_staff_user_id();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'staff_access_denied' USING ERRCODE = 'P0001';
  END IF;
  RETURN v_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION fmle_staff_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_user_id UUID;
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  v_staff_user_id := fmle_require_staff_user_id();
  SELECT tenant_id INTO v_tenant_id FROM users WHERE id = v_staff_user_id;

  SELECT jsonb_build_object(
    'customers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'accountNumber', c.account_number,
        'status', c.status,
        'customerType', c.customer_type,
        'displayName', COALESCE(o.display_name, ct.full_name, c.account_number, c.id::text),
        'email', COALESCE(ct.email, u.email),
        'phone', ct.phone,
        'authLinked', u.auth_user_id IS NOT NULL,
        'updatedAt', c.updated_at
      ) ORDER BY COALESCE(o.display_name, ct.full_name, c.account_number, c.id::text))
      FROM customers c
      LEFT JOIN organizations o ON o.id = c.organization_id
      LEFT JOIN contacts ct ON ct.id = c.primary_contact_id
      LEFT JOIN users u ON u.id = c.owner_user_id
      WHERE c.tenant_id = v_tenant_id
        AND c.deleted_at IS NULL
        AND c.status <> 'archived'
    ), '[]'::jsonb),
    'taxReturns', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', tr.id,
        'customerId', tr.customer_id,
        'taxYear', tr.tax_year,
        'returnType', tr.return_type,
        'status', tr.status,
        'statusMessage', tr.status_message,
        'updatedAt', tr.updated_at
      ) ORDER BY tr.updated_at DESC)
      FROM fmle_tax_returns tr
      WHERE tr.tenant_id = v_tenant_id
    ), '[]'::jsonb),
    'recentInvoices', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id,
        'customerId', i.customer_id,
        'invoiceNumber', i.invoice_number,
        'status', i.status,
        'currencyCode', i.currency_code,
        'totalAmount', i.total_amount,
        'balanceDueAmount', i.balance_due_amount,
        'issuedAt', i.issued_at,
        'dueAt', i.due_at
      ) ORDER BY i.created_at DESC)
      FROM (
        SELECT * FROM invoices
        WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 50
      ) i
    ), '[]'::jsonb),
    'recentPayments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id,
        'customerId', p.customer_id,
        'status', p.status,
        'paymentMethod', p.payment_method,
        'currencyCode', p.currency_code,
        'grossAmount', p.gross_amount,
        'settledAt', p.settled_at,
        'createdAt', p.created_at
      ) ORDER BY p.created_at DESC)
      FROM (
        SELECT * FROM payments
        WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 50
      ) p
    ), '[]'::jsonb),
    'recentDocuments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', d.id,
        'customerId', d.customer_id,
        'title', d.title,
        'category', d.document_category,
        'status', d.status,
        'updatedAt', d.updated_at
      ) ORDER BY d.updated_at DESC)
      FROM (
        SELECT * FROM documents
        WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        ORDER BY updated_at DESC LIMIT 50
      ) d
    ), '[]'::jsonb),
    'recentThreads', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', mt.id,
        'customerId', mt.customer_id,
        'subject', mt.subject,
        'status', mt.status,
        'updatedAt', mt.updated_at
      ) ORDER BY mt.updated_at DESC)
      FROM (
        SELECT * FROM message_threads
        WHERE tenant_id = v_tenant_id AND deleted_at IS NULL
        ORDER BY updated_at DESC LIMIT 50
      ) mt
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION fmle_staff_upsert_tax_return(
  p_customer_id UUID,
  p_tax_year INTEGER,
  p_return_type TEXT,
  p_status TEXT,
  p_status_message TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_user_id UUID;
  v_tenant_id UUID;
  v_id UUID;
BEGIN
  v_staff_user_id := fmle_require_staff_user_id();
  SELECT tenant_id INTO v_tenant_id FROM users WHERE id = v_staff_user_id;

  IF NOT EXISTS (
    SELECT 1 FROM customers
    WHERE id = p_customer_id AND tenant_id = v_tenant_id AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'customer_not_found' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO fmle_tax_returns (
    tenant_id, customer_id, tax_year, return_type, status, status_message,
    created_by_user_id, updated_by_user_id
  )
  VALUES (
    v_tenant_id, p_customer_id, p_tax_year, p_return_type, p_status, NULLIF(BTRIM(p_status_message), ''),
    v_staff_user_id, v_staff_user_id
  )
  ON CONFLICT (customer_id, tax_year, return_type)
  DO UPDATE SET
    status = EXCLUDED.status,
    status_message = EXCLUDED.status_message,
    updated_by_user_id = v_staff_user_id,
    updated_at = NOW(),
    filed_at = CASE WHEN EXCLUDED.status IN ('filed','accepted','completed') AND fmle_tax_returns.filed_at IS NULL THEN NOW() ELSE fmle_tax_returns.filed_at END,
    accepted_at = CASE WHEN EXCLUDED.status IN ('accepted','completed') AND fmle_tax_returns.accepted_at IS NULL THEN NOW() ELSE fmle_tax_returns.accepted_at END,
    completed_at = CASE WHEN EXCLUDED.status = 'completed' AND fmle_tax_returns.completed_at IS NULL THEN NOW() ELSE fmle_tax_returns.completed_at END
  RETURNING id INTO v_id;

  INSERT INTO audit_logs (tenant_id, actor_user_id, event_type, resource_type, resource_id, visibility_flags, outcome, metadata)
  VALUES (v_tenant_id, v_staff_user_id, 'fmle.tax_return.updated', 'fmle_tax_return', v_id::text,
    ARRAY['internal']::visibility_flag_enum[], 'success',
    jsonb_build_object('customerId', p_customer_id, 'taxYear', p_tax_year, 'status', p_status));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION fmle_staff_create_invoice(
  p_customer_id UUID,
  p_description TEXT,
  p_amount NUMERIC,
  p_due_at DATE,
  p_tax_amount NUMERIC DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_user_id UUID;
  v_tenant_id UUID;
  v_org_id UUID;
  v_invoice_id UUID := gen_random_uuid();
  v_number TEXT;
  v_total NUMERIC(14,2);
BEGIN
  v_staff_user_id := fmle_require_staff_user_id();
  SELECT tenant_id INTO v_tenant_id FROM users WHERE id = v_staff_user_id;

  SELECT COALESCE(
    c.organization_id,
    (SELECT urm.organization_id FROM user_role_memberships urm WHERE urm.user_id = v_staff_user_id AND urm.active AND urm.organization_id IS NOT NULL LIMIT 1),
    (SELECT o.id FROM organizations o WHERE o.tenant_id = v_tenant_id AND o.organization_type = 'internal' AND o.deleted_at IS NULL LIMIT 1)
  ) INTO v_org_id
  FROM customers c
  WHERE c.id = p_customer_id AND c.tenant_id = v_tenant_id AND c.deleted_at IS NULL;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_not_configured' USING ERRCODE = 'P0001';
  END IF;
  IF p_amount < 0 OR p_tax_amount < 0 THEN
    RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001';
  END IF;

  v_total := ROUND(p_amount + p_tax_amount, 2);
  v_number := 'FMLE-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || UPPER(SUBSTRING(REPLACE(v_invoice_id::text,'-','') FROM 1 FOR 8));

  INSERT INTO invoices (
    id, tenant_id, organization_id, customer_id, owner_user_id,
    invoice_number, status, currency_code, issued_at, due_at,
    subtotal_amount, tax_amount, total_amount, balance_due_amount,
    visibility_flags
  )
  VALUES (
    v_invoice_id, v_tenant_id, v_org_id, p_customer_id, v_staff_user_id,
    v_number, 'issued', 'USD', CURRENT_DATE, p_due_at,
    ROUND(p_amount,2), ROUND(p_tax_amount,2), v_total, v_total,
    ARRAY['internal','customer']::visibility_flag_enum[]
  );

  INSERT INTO invoice_items (
    id, invoice_id, line_number, description, quantity, unit_amount, tax_rate, total_amount
  )
  VALUES (
    gen_random_uuid(), v_invoice_id, 1, BTRIM(p_description), 1, ROUND(p_amount,2),
    CASE WHEN p_amount > 0 THEN ROUND(p_tax_amount / p_amount, 4) ELSE 0 END, v_total
  );

  INSERT INTO audit_logs (tenant_id, organization_id, actor_user_id, event_type, resource_type, resource_id, visibility_flags, outcome, metadata)
  VALUES (v_tenant_id, v_org_id, v_staff_user_id, 'fmle.invoice.created', 'invoice', v_invoice_id::text,
    ARRAY['internal']::visibility_flag_enum[], 'success',
    jsonb_build_object('customerId', p_customer_id, 'invoiceNumber', v_number, 'total', v_total));

  RETURN v_invoice_id;
END;
$$;

CREATE OR REPLACE FUNCTION fmle_staff_record_payment(
  p_customer_id UUID,
  p_amount NUMERIC,
  p_payment_method TEXT,
  p_invoice_id UUID DEFAULT NULL,
  p_reference TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_user_id UUID;
  v_tenant_id UUID;
  v_org_id UUID;
  v_contact_id UUID;
  v_payment_id UUID := gen_random_uuid();
  v_allocation NUMERIC(14,2);
  v_balance NUMERIC(14,2);
BEGIN
  v_staff_user_id := fmle_require_staff_user_id();
  SELECT tenant_id INTO v_tenant_id FROM users WHERE id = v_staff_user_id;

  SELECT COALESCE(
    c.organization_id,
    (SELECT urm.organization_id FROM user_role_memberships urm WHERE urm.user_id = v_staff_user_id AND urm.active AND urm.organization_id IS NOT NULL LIMIT 1),
    (SELECT o.id FROM organizations o WHERE o.tenant_id = v_tenant_id AND o.organization_type = 'internal' AND o.deleted_at IS NULL LIMIT 1)
  ), c.primary_contact_id
  INTO v_org_id, v_contact_id
  FROM customers c
  WHERE c.id = p_customer_id AND c.tenant_id = v_tenant_id AND c.deleted_at IS NULL;

  IF v_org_id IS NULL THEN RAISE EXCEPTION 'organization_not_configured' USING ERRCODE = 'P0001'; END IF;
  IF p_amount <= 0 THEN RAISE EXCEPTION 'invalid_amount' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO payments (
    id, tenant_id, organization_id, customer_id, payer_contact_id, received_by_user_id,
    status, payment_method, provider_reference, currency_code,
    gross_amount, fee_amount, net_amount, authorized_at, settled_at,
    visibility_flags
  )
  VALUES (
    v_payment_id, v_tenant_id, v_org_id, p_customer_id, v_contact_id, v_staff_user_id,
    'settled', p_payment_method::payment_method_enum, NULLIF(BTRIM(p_reference), ''), 'USD',
    ROUND(p_amount,2), 0, ROUND(p_amount,2), NOW(), NOW(),
    ARRAY['internal','customer']::visibility_flag_enum[]
  );

  IF p_invoice_id IS NOT NULL THEN
    SELECT balance_due_amount INTO v_balance
    FROM invoices
    WHERE id = p_invoice_id
      AND customer_id = p_customer_id
      AND tenant_id = v_tenant_id
      AND deleted_at IS NULL
    FOR UPDATE;

    IF v_balance IS NULL THEN
      RAISE EXCEPTION 'invoice_not_found' USING ERRCODE = 'P0001';
    END IF;

    v_allocation := LEAST(ROUND(p_amount,2), v_balance);
    IF v_allocation > 0 THEN
      INSERT INTO payment_allocations (id, payment_id, invoice_id, allocated_amount)
      VALUES (gen_random_uuid(), v_payment_id, p_invoice_id, v_allocation);

      UPDATE invoices
      SET balance_due_amount = GREATEST(0, balance_due_amount - v_allocation),
          status = CASE
            WHEN balance_due_amount - v_allocation <= 0 THEN 'paid'::invoice_status_enum
            ELSE 'partially_paid'::invoice_status_enum
          END,
          updated_at = NOW()
      WHERE id = p_invoice_id;
    END IF;
  END IF;

  INSERT INTO audit_logs (tenant_id, organization_id, actor_user_id, event_type, resource_type, resource_id, visibility_flags, outcome, metadata)
  VALUES (v_tenant_id, v_org_id, v_staff_user_id, 'fmle.payment.recorded', 'payment', v_payment_id::text,
    ARRAY['internal']::visibility_flag_enum[], 'success',
    jsonb_build_object('customerId', p_customer_id, 'amount', p_amount, 'invoiceId', p_invoice_id));

  RETURN v_payment_id;
END;
$$;

CREATE OR REPLACE FUNCTION fmle_staff_send_message(
  p_customer_id UUID,
  p_subject TEXT,
  p_body TEXT,
  p_thread_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_user_id UUID;
  v_tenant_id UUID;
  v_org_id UUID;
  v_thread_id UUID;
  v_message_id UUID := gen_random_uuid();
BEGIN
  v_staff_user_id := fmle_require_staff_user_id();
  SELECT tenant_id INTO v_tenant_id FROM users WHERE id = v_staff_user_id;

  SELECT COALESCE(
    c.organization_id,
    (SELECT urm.organization_id FROM user_role_memberships urm WHERE urm.user_id = v_staff_user_id AND urm.active AND urm.organization_id IS NOT NULL LIMIT 1),
    (SELECT o.id FROM organizations o WHERE o.tenant_id = v_tenant_id AND o.organization_type = 'internal' AND o.deleted_at IS NULL LIMIT 1)
  ) INTO v_org_id
  FROM customers c
  WHERE c.id = p_customer_id AND c.tenant_id = v_tenant_id AND c.deleted_at IS NULL;

  IF v_org_id IS NULL THEN RAISE EXCEPTION 'organization_not_configured' USING ERRCODE = 'P0001'; END IF;
  IF NULLIF(BTRIM(p_body), '') IS NULL THEN RAISE EXCEPTION 'message_required' USING ERRCODE = 'P0001'; END IF;

  IF p_thread_id IS NULL THEN
    v_thread_id := gen_random_uuid();
    INSERT INTO message_threads (
      id, tenant_id, organization_id, customer_id, created_by_user_id,
      status, subject, visibility_flags
    )
    VALUES (
      v_thread_id, v_tenant_id, v_org_id, p_customer_id, v_staff_user_id,
      'open', COALESCE(NULLIF(BTRIM(p_subject), ''), 'Message from FMLE'),
      ARRAY['internal','customer']::visibility_flag_enum[]
    );

    INSERT INTO message_participants (
      id, thread_id, participant_type, customer_id, status
    )
    VALUES (gen_random_uuid(), v_thread_id, 'customer', p_customer_id, 'active');
  ELSE
    SELECT mt.id INTO v_thread_id
    FROM message_threads mt
    WHERE mt.id = p_thread_id
      AND mt.customer_id = p_customer_id
      AND mt.tenant_id = v_tenant_id
      AND mt.deleted_at IS NULL;

    IF v_thread_id IS NULL THEN RAISE EXCEPTION 'thread_not_found' USING ERRCODE = 'P0001'; END IF;
  END IF;

  INSERT INTO messages (
    id, thread_id, sender_user_id, body, body_format, visibility_flags
  )
  VALUES (
    v_message_id, v_thread_id, v_staff_user_id, BTRIM(p_body), 'plain_text',
    ARRAY['internal','customer']::visibility_flag_enum[]
  );

  UPDATE message_threads SET updated_at = NOW() WHERE id = v_thread_id;

  INSERT INTO audit_logs (tenant_id, organization_id, actor_user_id, event_type, resource_type, resource_id, visibility_flags, outcome, metadata)
  VALUES (v_tenant_id, v_org_id, v_staff_user_id, 'fmle.message.sent', 'message_thread', v_thread_id::text,
    ARRAY['internal']::visibility_flag_enum[], 'success',
    jsonb_build_object('customerId', p_customer_id, 'messageId', v_message_id));

  RETURN v_thread_id;
END;
$$;

CREATE OR REPLACE FUNCTION fmle_staff_create_document_record(
  p_customer_id UUID,
  p_title TEXT,
  p_category TEXT,
  p_file_name TEXT,
  p_content_type TEXT,
  p_storage_key TEXT,
  p_checksum_sha256 TEXT,
  p_byte_size BIGINT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_staff_user_id UUID;
  v_tenant_id UUID;
  v_org_id UUID;
  v_document_id UUID := gen_random_uuid();
BEGIN
  v_staff_user_id := fmle_require_staff_user_id();
  SELECT tenant_id INTO v_tenant_id FROM users WHERE id = v_staff_user_id;

  SELECT COALESCE(
    c.organization_id,
    (SELECT urm.organization_id FROM user_role_memberships urm WHERE urm.user_id = v_staff_user_id AND urm.active AND urm.organization_id IS NOT NULL LIMIT 1),
    (SELECT o.id FROM organizations o WHERE o.tenant_id = v_tenant_id AND o.organization_type = 'internal' AND o.deleted_at IS NULL LIMIT 1)
  ) INTO v_org_id
  FROM customers c
  WHERE c.id = p_customer_id AND c.tenant_id = v_tenant_id AND c.deleted_at IS NULL;

  IF v_org_id IS NULL THEN RAISE EXCEPTION 'organization_not_configured' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO documents (
    id, tenant_id, organization_id, customer_id, owner_user_id,
    title, document_category, status, visibility_flags
  )
  VALUES (
    v_document_id, v_tenant_id, v_org_id, p_customer_id, v_staff_user_id,
    BTRIM(p_title), BTRIM(p_category), 'active',
    ARRAY['internal','customer']::visibility_flag_enum[]
  );

  INSERT INTO document_versions (
    id, tenant_id, document_id, created_by_user_id, version_number,
    file_name, content_type, storage_key, checksum_sha256, byte_size, status
  )
  VALUES (
    gen_random_uuid(), v_tenant_id, v_document_id, v_staff_user_id, 1,
    p_file_name, p_content_type, p_storage_key, p_checksum_sha256, p_byte_size, 'current'
  );

  INSERT INTO document_access_rules (
    id, tenant_id, document_id, principal_type, principal_customer_id,
    access_level, effect, created_by_user_id
  )
  VALUES (
    gen_random_uuid(), v_tenant_id, v_document_id, 'customer', p_customer_id,
    'download', 'allow', v_staff_user_id
  );

  INSERT INTO audit_logs (tenant_id, organization_id, actor_user_id, event_type, resource_type, resource_id, visibility_flags, outcome, metadata)
  VALUES (v_tenant_id, v_org_id, v_staff_user_id, 'fmle.document.shared', 'document', v_document_id::text,
    ARRAY['internal']::visibility_flag_enum[], 'success',
    jsonb_build_object('customerId', p_customer_id, 'fileName', p_file_name));

  RETURN v_document_id;
END;
$$;

REVOKE ALL ON FUNCTION fmle_current_staff_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION fmle_require_staff_user_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION fmle_staff_snapshot() FROM PUBLIC;
REVOKE ALL ON FUNCTION fmle_staff_upsert_tax_return(UUID, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION fmle_staff_create_invoice(UUID, TEXT, NUMERIC, DATE, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION fmle_staff_record_payment(UUID, NUMERIC, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION fmle_staff_send_message(UUID, TEXT, TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION fmle_staff_create_document_record(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION fmle_current_staff_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION fmle_staff_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION fmle_staff_upsert_tax_return(UUID, INTEGER, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fmle_staff_create_invoice(UUID, TEXT, NUMERIC, DATE, NUMERIC) TO authenticated;
GRANT EXECUTE ON FUNCTION fmle_staff_record_payment(UUID, NUMERIC, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION fmle_staff_send_message(UUID, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fmle_staff_create_document_record(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT) TO authenticated;
