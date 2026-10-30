-- ==============================================================================
-- Migration: 20261030_unpause_subscription_trigger.sql
-- Description: Transactional unpause support for Weekly Meal Subscriptions.
--              Allows customers/owners to unpause specific dates (e.g. if paused
--              by mistake), contracts the extended period_end and next_renewal_at,
--              splits or removes pause records, and ensures sequential deliveries continue.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.rpc_unpause_subscription_dates(
  p_subscription_id UUID,
  p_dates DATE[],
  p_member_id TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_sub RECORD;
  v_pause RECORD;
  v_date DATE;
  v_cutoff_date DATE;
  v_unpaused_count INTEGER := 0;
  v_d DATE;
  v_range_start DATE;
  v_range_end DATE;
  v_rem_dates DATE[];
BEGIN
  -- 1. Fetch and verify subscription
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription with id % not found', p_subscription_id;
  END IF;

  -- 2. Verify authorization: caller must be subscription owner or super admin
  IF v_sub.owner_user_id != auth.uid()::text AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not the subscription owner';
  END IF;

  -- 3. Cutoff enforcement: cannot unpause dates in the past or within 48h cutoff window
  v_cutoff_date := (CURRENT_DATE + INTERVAL '2 days')::date;
  FOREACH v_date IN ARRAY p_dates LOOP
    IF v_date < v_cutoff_date THEN
      RAISE EXCEPTION 'Cannot unpause date % as it is in the past or within 48-hour delivery packing cutoff', v_date;
    END IF;
  END LOOP;

  -- 4. Process existing pauses for this subscription
  FOR v_pause IN
    SELECT * FROM public.subscription_pauses
    WHERE subscription_id = p_subscription_id
      AND (
        (p_member_id IS NULL AND member_id IS NULL)
        OR (p_member_id IS NOT NULL AND (member_id = p_member_id OR member_id IS NULL))
      )
  LOOP
    -- Calculate dates in this pause that match the unpause list
    v_rem_dates := ARRAY[]::DATE[];
    FOR v_d IN
      SELECT generate_series(v_pause.start_date, v_pause.end_date, '1 day'::interval)::date
    LOOP
      IF v_d = ANY(p_dates) THEN
        v_unpaused_count := v_unpaused_count + 1;
      ELSE
        v_rem_dates := array_append(v_rem_dates, v_d);
      END IF;
    END LOOP;

    -- If this pause contained any of the target dates, delete it and re-create remaining ranges
    IF array_length(v_rem_dates, 1) IS DISTINCT FROM v_pause.days_count THEN
      DELETE FROM public.subscription_pauses WHERE id = v_pause.id;

      -- Group remaining contiguous dates into new pause ranges
      IF array_length(v_rem_dates, 1) > 0 THEN
        v_range_start := v_rem_dates[1];
        v_range_end := v_rem_dates[1];

        FOR i IN 2..array_length(v_rem_dates, 1) LOOP
          IF v_rem_dates[i] = v_range_end + 1 THEN
            v_range_end := v_rem_dates[i];
          ELSE
            INSERT INTO public.subscription_pauses (
              subscription_id,
              member_id,
              start_date,
              end_date,
              created_by
            ) VALUES (
              p_subscription_id,
              v_pause.member_id,
              v_range_start,
              v_range_end,
              v_pause.created_by
            );
            v_range_start := v_rem_dates[i];
            v_range_end := v_rem_dates[i];
          END IF;
        END LOOP;

        INSERT INTO public.subscription_pauses (
          subscription_id,
          member_id,
          start_date,
          end_date,
          created_by
        ) VALUES (
          p_subscription_id,
          v_pause.member_id,
          v_range_start,
          v_range_end,
          v_pause.created_by
        );
      END IF;
    END IF;
  END LOOP;

  IF v_unpaused_count = 0 THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'None of the specified dates are currently paused'
    );
  END IF;

  -- 5. Contract period_end and next_renewal_at by the unpaused count
  UPDATE public.subscriptions
  SET
    period_end = period_end - (v_unpaused_count * INTERVAL '1 day'),
    next_renewal_at = CASE
      WHEN next_renewal_at IS NOT NULL THEN next_renewal_at - (v_unpaused_count * INTERVAL '1 day')
      ELSE next_renewal_at
    END,
    updated_at = NOW()
  WHERE id = p_subscription_id
  RETURNING * INTO v_sub;

  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'unpaused_count', v_unpaused_count,
    'subscription_id', p_subscription_id,
    'new_period_end', v_sub.period_end,
    'new_next_renewal_at', v_sub.next_renewal_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_unpause_subscription_dates TO authenticated, service_role;

