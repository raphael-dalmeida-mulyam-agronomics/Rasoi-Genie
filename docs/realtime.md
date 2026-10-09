# Supabase Realtime Architecture & Setup Guide

This document outlines how Supabase Realtime is configured for RasoiGenie, the database tables involved, replication enabling instructions, and troubleshooting steps for silent or disconnected channels.

---

## 1. Tables Involved

| Table Name         | Description                                                                              | Publication         | Replica Identity |
| :----------------- | :--------------------------------------------------------------------------------------- | :------------------ | :--------------- |
| `public.orders`    | Realtime kitchen orders stream, status updates, cancellations, and regional fulfillment. | `supabase_realtime` | `FULL`           |
| `public.meal_kits` | Catalog updates, price changes, spice level edits, and stock availability toggles.       | `supabase_realtime` | `FULL`           |

> **Why `REPLICA IDENTITY FULL`?**
> By default, PostgreSQL only includes changed columns and the primary key in UPDATE events, and only the primary key in DELETE events. Setting `REPLICA IDENTITY FULL` ensures that `UPDATE` and `DELETE` payloads contain the entire previous row (`old_record`), which is vital for regional routing/filtering and immediate UI reconciliation when items are removed.

---

## 2. Enabling Replication in Supabase

### Option A: Via SQL Migration (Recommended)

Run the migration script provided in `framework/supabase/migrations/20261009_admin_supabase_realtime.sql` directly within your Supabase project's **SQL Editor**:

```sql
-- 1. Ensure tables use FULL replica identity
ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.meal_kits REPLICA IDENTITY FULL;

-- 2. Add tables to supabase_realtime publication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'meal_kits'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.meal_kits;
  END IF;
END $$;
```

### Option B: Via Supabase Dashboard UI

1. Navigate to **Database** -> **Publications** in your Supabase project dashboard.
2. Select the `supabase_realtime` publication.
3. Toggle the switches next to `orders` and `meal_kits` to **ON**.
4. Navigate to **Table Editor** -> `orders` -> **Edit Table** -> advanced settings, and verify **Replica Identity** is set to `Full`. Repeat for `meal_kits`.

---

## 3. Row Level Security (RLS) & Regional Scoping

Supabase Realtime enforces PostgreSQL Row Level Security (RLS) at the websocket layer:

- **Super Admins**: Full access to all rows across India.
- **Regional Admins**: Receive events strictly scoped to their assigned regional jurisdiction (e.g. `pune-city`, `West`, `South`).
- **Customers**: Can only receive events related to their own orders (`user_id = auth.uid()`).

In addition to database RLS, client-side guards (`filterOrdersByAdminRegions` and `filterMealKitsByAdminRegions`) are implemented to ensure zero accidental bleed across regional staff interfaces.

---

## 4. Architecture & Resilience Features

- **Unique Channel per Subscriber**: `subscribeToTable` in `framework/services/realtimeService.ts` automatically scopes topics uniquely (e.g. `rt:orders:sub_12345678_abcd`), preventing React double-mount channel collisions.
- **Auto-Reconnect with Exponential Backoff**: Disconnected sockets automatically attempt reconnection with randomized jitter.
- **`onResync` Trigger**: Whenever a channel reconnects or the app returns to the foreground (`AppState` on native, `visibilitychange` on web), a full resync is executed to catch events that occurred while offline.
- **Fallback Polling**: If the socket remains offline or disconnected for more than 60 seconds, the dashboard falls back to polling every 30 seconds until the live channel recovers.
- **Event Burst Debouncing**: Orders arriving in bursts are batched within a ~100ms window, deduplicating updates and avoiding rendering freezes.
- **Echo Loop Prevention**: In-memory store updates triggered by incoming Realtime events (`applyRealtimeMealKitInsert`, etc.) do not emit network mutations back to Supabase.

---

## 5. Troubleshooting a Silent Channel

If changes in the database are not appearing on the Admin Dashboard in real time:

1. **Verify WebSocket Connection**:
   - Check the connection status pill in the top header. If it indicates **Offline** or **Reconnecting**, verify internet connectivity or check whether a proxy/firewall is blocking WebSocket (`wss://`) traffic.
   - Inspect browser devtools or Metro console for `[RealtimeService:<table_name>]` logs.
2. **Verify Table is in the Publication**:
   - Run this SQL query in the Supabase SQL editor:
     ```sql
     SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
     ```
   - Ensure `public.orders` and `public.meal_kits` are present in the output.
3. **Check Row Level Security (RLS)**:
   - Realtime ignores rows that the authenticated user cannot `SELECT`.
   - Ensure the user's JWT has `role = 'admin'` or appropriate metadata matching the RLS policy defined in `20260929_rls_regional_admins.sql`.
4. **Inspect `REPLICA IDENTITY`**:
   - Run:
     ```sql
     SELECT relname, relreplident FROM pg_class WHERE relname IN ('orders', 'meal_kits');
     ```
   - Value `f` indicates `FULL`. If it shows `d` (default), run `ALTER TABLE <table_name> REPLICA IDENTITY FULL;`.
5. **Manual Resync**:
   - Click the **Refresh** button inside the header connection pill or pull down the dashboard list to trigger an immediate resync.
