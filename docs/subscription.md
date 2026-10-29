# RasoiGenie Weekly Meal Subscriptions: Architectural & Engineering Specification

## 1. Overview & Core Philosophy

The Weekly Meal Subscription feature enables both individual diners and families to automate their weekly culinary routine with curated or customized 7-day meal boxes:

- **Two Distinct Entry Points:**
  - **Individuals:** Accessible via Account / Profile (`features/subscription/SubscriptionPlanView.tsx`), covering only the single user.
  - **Families:** Accessible via the Family Hub (`features/family/FamilySubscriptionView.tsx`), strictly visible and actionable **only** by the Family Owner (`manage_family_subscription` permission).
- **Upfront Household Payer:** For family subscriptions, the owner pays upfront for all covered members (members and dependents never pay). Payment integrates directly with `walletService` (Rasoi credits) and `MockPaymentGatewayModal` / `paymentGatewayService` (UPI, Cards, Net Banking).
- **Google Calendar–Style Matrix:** Family owners can assign recipes per covered member across all 7 days of the week (Monday–Sunday) in a responsive matrix view with real-time dietary conflict warnings.
- **Unobtrusive Post-Order Discovery:** Non-subscribed users receive an occasional post-order promotion popup after placing an order (maximum 2 times lifetime, spaced at least 7 days apart). Subscribed users never see the popup.

---

## 2. Roles & Permissions

Permission checks are enforced via `framework/family/permissions.ts` and database PostgreSQL Row-Level Security (RLS):

| Action                                                        | Family Owner | Co-Owner | Member (Adult) | Dependent (Child/Senior) | Individual User |
| :------------------------------------------------------------ | :----------: | :------: | :------------: | :----------------------: | :-------------: |
| **Manage Individual Subscription**                            |     Yes      |   Yes    |      Yes       |            No            |       Yes       |
| **Manage Family Subscription** (`manage_family_subscription`) |   **Yes**    |    No    |       No       |            No            |       N/A       |
| **View Covered Family Subscription**                          |     Yes      |   Yes    |      Yes       |           Yes            |       N/A       |
| **Pay Upfront for Subscription**                              | Yes (Owner)  |    No    |       No       |            No            |   Yes (Self)    |

---

## 3. Data Model (Supabase)

Migration file: `framework/supabase/migrations/20261027_weekly_meal_subscriptions.sql`  
Master Schema: `framework/supabase/supabase_schema.sql` (Section 14)

### Tables Overview

1. **`subscriptions`**:
   - `id` (UUID, Primary Key, `gen_random_uuid()`)
   - `owner_user_id` (TEXT, NOT NULL)
   - `family_id` (UUID, Nullable, References `families(id)` ON DELETE SET NULL)
   - `scope` (TEXT, Check: `'individual'` | `'family'`)
   - `plan_type` (TEXT, Check: `'standard'` | `'custom'`)
   - `standard_plan_key` (TEXT, Nullable — e.g., `'high-protein'`, `'keto'`, `'vegan'`)
   - `status` (TEXT, Check: `'pending'` | `'active'` | `'paused'` | `'cancelled'` | `'expired'`)
   - `price_per_member_per_week` (NUMERIC, NOT NULL)
   - `member_count` (INTEGER NOT NULL DEFAULT 1)
   - `amount_paid` (NUMERIC NOT NULL DEFAULT 0)
   - `payment_reference` (TEXT, Nullable)
   - `period_start` (TIMESTAMPTZ, NOT NULL)
   - `period_end` (TIMESTAMPTZ, NOT NULL)
   - `created_at` / `updated_at` (TIMESTAMPTZ)

2. **`subscription_members`**:
   - `id` (UUID, Primary Key)
   - `subscription_id` (UUID, References `subscriptions(id)` ON DELETE CASCADE)
   - `member_id` (TEXT, NOT NULL — user ID or dependent member ID)
   - `plan_type` (TEXT, Check: `'standard'` | `'custom'`)
   - `standard_plan_key` (TEXT, Nullable)
   - `created_at` (TIMESTAMPTZ)

3. **`subscription_meals`**:
   - `id` (UUID, Primary Key)
   - `subscription_id` (UUID, References `subscriptions(id)` ON DELETE CASCADE)
   - `member_id` (TEXT, NOT NULL)
   - `weekday` (INTEGER, Check: `0 <= weekday <= 6`, where 0 = Monday ... 6 = Sunday)
   - `meal_kit_id` (TEXT, References `meal_kits(id)` or catalog ID)
   - `created_at` (TIMESTAMPTZ)

### Security & Row-Level Security (RLS)

- **Subscription Management (`subscriptions_owner_manage`):** Owners have full `ALL` access to subscriptions where `auth.uid() = owner_user_id`.
- **Member Access (`subscriptions_family_read`):** Any family member can read subscriptions covering their family via:
  ```sql
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = subscriptions.family_id
    AND fm.user_id = auth.uid()
  )
  ```
- **Regional Admins:** Regional administrators retain full read/write access according to repository hub patterns.
- **Grants:** `anon` has `SELECT` on active subscriptions; `authenticated` has full CRUD permissions; `service_role` has bypass permissions.

---

## 4. Plans & Pricing Architecture

Catalog module: `framework/services/subscriptionPlans.ts`

### Curated Standard Plans

1. **High Protein Power** (`high-protein`): ₹1,299 / member / week (32g - 42g protein/serving; includes Hyderabadi Dum Chicken Biryani, Coastal Prawns Ghee Roast, Chipotle Chicken Burrito Bowl, Texas Double Smash Cheeseburger, Birria Pulled Chicken Tacos, Chettinad Pepper Chicken Curry, and Smoked Pepperoni Pizza).
2. **Keto Low-Carb Gourmet** (`keto`): ₹1,399 / member / week (Low net carbs with wholesome fats; includes Keto Cauliflower Tikka Masala [9g carbs], Coastal Prawns Ghee Roast [8g carbs], Chettinad Pepper Chicken Curry [12g carbs], Paneer Butter Masala, Provencal Ratatouille, Spiced Tomato Shorba, and Wild Mushroom Chowder).
3. **100% Plant-Based Vegan** (`vegan`): ₹1,199 / member / week (100% dairy-free and plant-powered; includes Keto Cauliflower Tikka Masala [almond cream], Fiesta Roasted Fajita Burrito Bowl, Mediterranean Chickpea & Spinach Stew, Classic French Provencal Ratatouille, Spiced Tomato & Red Lentil Shorba, Crispy Veg Manchurian & Hakka Noodles, and Puneri Pithla Bhakri & Thecha).

### Custom Plan

- Price: ₹1,349 / member / week.
- Allows picking any meal kit from the live catalog for each of the 7 days (Monday through Sunday).

### Pricing Pure Functions

- **`calculateSubscriptionTotal({ pricePerMemberPerWeek, memberCount, discount = 0 })`**:
  $$\text{Subtotal} = \text{pricePerMemberPerWeek} \times \text{memberCount}$$
  $$\text{Total} = \max(0, \text{Subtotal} - \text{discount})$$
- **`calculateProratedAdjustment({ pricePerMemberPerWeek, totalPeriodDays = 7, remainingDays })`**:
  $$\text{ProratedAmount} = \text{Round}\left(\frac{\text{pricePerMemberPerWeek} \times \text{remainingDays}}{\text{totalPeriodDays}}\right)$$

### Mid-Period Member Modification Policy

1. **Adding a Covered Member:**
   - Evaluated upfront. The owner is billed a prorated charge for the remaining days left in the current 7-day weekly billing cycle:
     $$\text{Prorated Charge} = \frac{\text{pricePerMemberPerWeek} \times \text{remainingDays}}{7}$$
   - The new member is immediately added to `subscription_members` and assigned default or custom meals.
2. **Removing a Covered Member:**
   - Removal **takes effect at the next weekly renewal period**.
   - The member remains covered until `period_end`. At renewal, `member_count` decreases and the owner is billed the lower amount for subsequent cycles.

---

## 5. Dietary Conflict Detection

Module: `framework/family/dietaryConflicts.ts`

When an owner assigns meals to family members (including children and seniors), `checkDietaryConflict` audits the recipe against the member's profile preferences:

- **Allergy Check:** Flags matching allergies (e.g., dairy, peanuts, shellfish, gluten).
- **Diet Type Enforcement:** Flags non-veg kits assigned to vegetarian/vegan members, and root vegetables (onion/garlic) for Jain members.
- **Spice Tolerance:** Warns if a 'Spicy' kit is assigned to a member with 'Mild' tolerance.
- Conflict warnings appear as visual badges (`⚠️ Conflict`) directly on matrix cells and in modal selectors without hard-blocking assignments.

---

## 6. Post-Order Popup Eligibility Rules

Module: `framework/services/subscriptionPopupService.ts`  
UI Component: `features/subscription/SubscriptionPostOrderPopup.tsx`  
Trigger Point: `features/checkout/OrderConfirmationView.tsx`

### Eligibility Function: `checkSubscriptionPopupEligibility(state, now = new Date())`

A user is shown the informational post-order popup **only** if ALL of the following conditions are met:

1. **Not Subscribed:** `state.isSubscribed === false`. (If user has an active individual subscription OR is covered by an active family subscription, popup is NEVER shown).
2. **Frequency Cap:** Lifetime counter `shownCount < 2`. (Shown at most 2 times total per user).
3. **Spacing Window:** At least 7 days (604,800,000 ms) have elapsed since `lastShownAt`. (If `lastShownAt` is null, condition is satisfied).

### Storage & Persistence

- Storage Key: `@rasoi_subscription_popup_history_${userId}` stored via `AsyncStorage` / `localStorage`.
- Actions:
  - "View Subscription Plans": Routes to `/(tabs)/family/subscription` if family owner, or `/(tabs)/profile` for individuals.
  - "Maybe Later": Closes modal, persists incremented `shownCount` and `lastShownAt`.
  - Non-blocking: Mounted at the bottom of `OrderConfirmationView` with no disruption to order tracking or receipt details.

---

## 7. Testing & Verification

1. **Unit & Integration Tests (`framework/__tests__/`):**
   - `subscriptionPricing.test.ts`: Pure pricing calculations, zero/multi-member bounds, and proration formulas.
   - `subscriptionPlans.test.ts`: Integrity of standard plan templates, valid non-filler meal kits, and 7-day schedule coverage.
   - `subscriptionPermissions.test.ts`: Owner-only `manage_family_subscription` permission guard.
   - `subscriptionPopupEligibility.test.ts`: Spacing (7-day gap), frequency cap (max 2), subscriber exclusion, and null handling.
   - `subscriptionContext.test.tsx`: SubscriptionProvider state, subscribe, pause, resume, cancel, and meal assignment dispatchers.
   - `familyPermissions.test.ts`: Permission matrix regression suite.
2. **Database pgTAP Tests (`framework/supabase/migrations/__tests__/subscription_pgtap.sql`):**
   - Verifies schema, constraints, RLS policies for owners and members, Data API grants, and realtime publications.
3. **Playwright E2E Tests (`e2e/flows/subscription.spec.ts`):**
   - Individual flow: Profile navigation -> Plan selection -> Upfront mock gateway checkout -> Active subscription verification.
   - Family owner flow: Family Hub -> Calendar matrix -> Member review -> Upfront checkout -> Active family status verification.

---

## 8. Per-Member Plans in a Family

Family owners can assign each covered household member (including dependents) their own tailored plan, allowing mixed dietary regimes under a single household account:

- **Plan Options Per Member:**
  - **High Protein Power** (₹1,299 / wk)
  - **Keto Low-Carb Gourmet** (₹1,499 / wk)
  - **100% Plant-Based Vegan** (₹1,199 / wk)
  - **Custom 7-Day Plan** (₹1,399 / wk)
- **"Apply the Same Plan to Everyone":**
  - Allows the owner to broadcast one chosen plan across all covered members in a single tap via `copyPlanToAllMembers`.
  - Sets `plan_group = 'shared_all'`.
  - Members remain individually adjustable afterwards.
- **Sharing Owner's Plan & View-Only Permissions:**
  - Members have the `view_own_subscription_plan` permission (`can(role, 'view_own_subscription_plan')`), enabling them to view the weekly schedule and their own meals in a view-only mode (`t.perMember.viewOnlyNotice`).
  - Non-owner members can choose to share the owner's plan via the "Share Owner's Plan" button (`shareOwnerPlan`), which sets `plan_group = 'shared_with_owner'`.
  - Only the family owner (`manage_family_subscription`) edits schedules for others, manages auto-renew, and pays.
- **Total Pricing Formula:**
  - Total price is calculated via the pure function `calculatePerMemberSubscriptionTotal`:
    $$\text{Total} = \left( \sum_{m \in \text{members}} \text{pricePerWeek}(m) \right) \times \text{weeks} - \text{discount}$$

---

## 9. Pause Calendar & Pause Limits

Module: `framework/services/subscriptionPlans.ts`  
UI Component: `features/subscription/SubscriptionPauseCalendarModal.tsx` (Modal on web, BottomSheet on phones)  
Database Table: `subscription_pauses`

### Pause Limits Configuration (`SUBSCRIPTION_PAUSE_CONFIG`)

All limits are strictly defined in `framework/subscription/subscriptionConfig.ts` and enforced in both client UI and database triggers (`fn_validate_and_apply_subscription_pause`):

1. **Maximum 14 paused days per billing period** (`MAX_PAUSED_DAYS_PER_PERIOD = 14`).
2. **Maximum 2 separate pause ranges per period** (`MAX_PAUSE_RANGES_PER_PERIOD = 2`).
3. **No single pause longer than 7 consecutive days** (`MAX_CONSECUTIVE_PAUSE_DAYS = 7`).
4. **Cannot pause days within the 48-hour cutoff window or in the past** (`CUTOFF_WINDOW_HOURS = 48`). Days within 48 hours are locked because cooking boxes are already being packed.
5. **Paused days must fall inside the current billing period** (`period_start` to `period_end`).

### Upfront Payment & Period Extension Policy

In alignment with RasoiGenie's upfront weekly billing model, when a pause window is scheduled and saved, the subscription period is **extended by the exact number of paused days** (`calculateExtendedPeriodEnd`):
$$\text{New Period End} = \text{Current Period End} + (\text{paused\_days} \times 24\text{ hours})$$
This ensures customers receive the full delivery value they paid for upfront, without requiring partial refund reversals or prorated credit deductions.

### Targeting & UI Badging

- Owners can schedule pauses for the entire household or target specific members.
- Individual non-owner members can pause their own deliveries.
- The UI features remaining allowance indicators (e.g., _"8 of 14 days left"_, _"1 of 2 pause windows left"_) and prevents invalid or over-limit selections with clear explanations.

---

## 10. Weekly Auto-Renewal State Machine

Module: `framework/services/subscriptionService.ts`  
Scheduled Job: Supabase Edge Function / cron trigger (`processSubscriptionRenewal`)

### Core Subscription Columns

- `auto_renew`: Boolean flag, defaults to `true` with an explicit opt-out toggle at checkout.
- `renewal_attempts`: Integer counter tracking consecutive retry attempts (0 to 3).
- `next_renewal_at`: Timestamp of the next scheduled charge (default: `period_end`).
- `cancel_at_period_end`: Boolean flag set when a user disables renewal mid-period.
- `last_renewed_period_end`: Watermark timestamp guaranteeing idempotency.

### Renewal Lifecycle & Retry Logic

1. **Reminder Notification:** A reminder notification is dispatched to the customer 3 days prior to renewal (`REMINDER_DAYS_BEFORE = 3`).
2. **Idempotency Guarantee:** Before charging, the engine checks `last_renewed_period_end === period_end`. If already renewed, the execution exits cleanly as a no-op (`alreadyRenewed: true`), preventing duplicate charges.
3. **Recalculation:** Total renewal amount is dynamically recomputed based on current covered members and their selected plans via `calculatePerMemberSubscriptionTotal`.
4. **Success:** Upon successful payment, `period_start` advances to previous `period_end`, `period_end` advances by 7 days, `renewal_attempts` resets to 0, and member meal templates are preserved.
5. **Failure & Retries:**
   - If payment fails, `renewal_attempts` increments.
   - Retries occur up to 3 times over 3 days (`MAX_RENEWAL_ATTEMPTS = 3`, `RETRY_INTERVAL_HOURS = 24`).
   - The owner is notified upon each retry failure.
   - Upon the 3rd failed attempt, the subscription status transitions to `'expired'`.
6. **Opting Out:** Turning auto-renew off leaves the subscription active until `period_end`, after which deliveries stop and the subscription expires gracefully.

---

## 11. Admin Subscriptions Management View

Module: `features/admin/AdminSubscriptionsManagementView.tsx`  
Service: `framework/services/adminSubscriptionService.ts`  
SQL RPC: `admin_cancel_subscription` and `admin_subscriptions_view`

### Regional Admin RBAC & Scoping

- **Regional Admins:** Scoped strictly to subscriptions originating within their assigned distribution regions (`admin_users.regions`).
- **Super Admins:** Retain nationwide visibility across all regions.

### Capabilities & Controls

- **Comprehensive Directory Columns:** Customer name, type badge (Individual or Family), plan name (or Custom), covered member count, status (Active, Paused, Expired, Cancelled), auto-renew on/off, period start and end dates, amount paid, and next renewal date.
- **Expandable Family Breakdown:** Family subscription rows expand to show each covered member, their individual plan, and weekly rate.
- **Multi-Criteria Filtering & Search:**
  - Filters by Scope (Individual vs Family), Plan Type, Status, Auto-Renew status, and Region.
  - Search by customer name, email, or phone.
  - Sort by renewal date, period end date, or amount paid.
- **Detail View:** Deep-dive modal displaying covered member matrix, full pause history (dates used and ranges remaining), and retry history.
- **Administrative Cancellation:** Secured behind a confirmation dialog with reason capture, executing through the audited `admin_cancel_subscription` database procedure.
