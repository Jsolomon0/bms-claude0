-- Persist authenticated FMLE appointment requests to customer consultations.

CREATE OR REPLACE FUNCTION fmle_customer_request_appointment(
  p_service TEXT,
  p_date DATE,
  p_time TIME,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id UUID;
  v_tenant_id UUID;
  v_contact_id UUID;
  v_consultation_id UUID := gen_random_uuid();
  v_start TIMESTAMPTZ;
BEGIN
  v_customer_id := fmle_current_customer_id();

  IF v_customer_id IS NULL THEN
    RAISE EXCEPTION 'customer_not_linked' USING ERRCODE = 'P0001';
  END IF;

  SELECT c.tenant_id, c.primary_contact_id
  INTO v_tenant_id, v_contact_id
  FROM customers c
  WHERE c.id = v_customer_id
    AND c.deleted_at IS NULL;

  v_start := (p_date + p_time) AT TIME ZONE 'America/New_York';

  IF v_start <= NOW() THEN
    RAISE EXCEPTION 'appointment_must_be_future' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO consultations (
    id,
    tenant_id,
    customer_id,
    contact_id,
    status,
    scheduled_start_at,
    scheduled_end_at,
    notes,
    visibility_flags
  )
  VALUES (
    v_consultation_id,
    v_tenant_id,
    v_customer_id,
    v_contact_id,
    'requested',
    v_start,
    v_start + INTERVAL '30 minutes',
    CONCAT('Service: ', p_service, CASE WHEN NULLIF(BTRIM(p_notes), '') IS NOT NULL THEN E'\nNotes: ' || BTRIM(p_notes) ELSE '' END),
    ARRAY['internal', 'customer']::visibility_flag_enum[]
  );

  RETURN v_consultation_id;
END;
$$;

REVOKE ALL ON FUNCTION fmle_customer_request_appointment(TEXT, DATE, TIME, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fmle_customer_request_appointment(TEXT, DATE, TIME, TEXT) TO authenticated;
