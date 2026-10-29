# Daily Work Status Report — October 29, 2026

**Project:** RasoiGenie  
**Branch:** `feature/family-weekly-meal-plan-calendar-redesign` (Merged to `main`)  
**Status:** Completed, Verified with Automated Test Suites & Merged to `main`  
**Quality Gates:** 50/50 test suites passed (407/407 tests passed), TypeScript clean (`tsc --noEmit` 0 errors), ESLint clean (0 errors)

---

## Executive Summary

Today's work centered on significantly expanding the RasoiGenie Weekly Meal Subscription feature across both customer-facing applications and backend administrative platforms. Key deliverables include per-member customized plans in a family subscription with plan copying and sharing capabilities, a full-month interactive pause calendar with active subscription highlighting and dual-enforced constraints, a weekly auto-renewal state machine with automated retries and idempotency watermarks, a regionally-scoped administrative management dashboard with audited cancellation RPCs, header branding modernization with the official Rasoi Genie logo, and a complete redesign of the Family Hub "Weekly Meal Matrix" into a responsive Google Calendar–style "Weekly Meal Plan" month grid with member plan configuration cards, per-member vs whole-family pause controls, granular plan switching, and a rich day detail popup.

---

### 1. Per-Member Plans in a Family Subscription

- **Multi-Diet Flexibility per Household Member**:
  - Enhanced `FamilySubscriptionView.tsx` so the family owner can assign each covered member (including children and seniors) their own tailored plan:
    - **High Protein Power** (₹1,299 / member / week)
    - **Keto Low-Carb Gourmet** (₹1,499 / member / week)
    - **100% Plant-Based Vegan** (₹1,199 / member / week)
    - **Custom 7-Day Plan** (₹1,399 / member / week)
  - Selecting a standard plan immediately auto-populates the member's 7-day schedule with curated recipes, while allowing individual meal customization.
- **"Apply the Same Plan to Everyone" Quick Action**:
  - Implemented an owner action bar with one-tap buttons to broadcast any standard or custom plan to all covered members via the pure function `copyPlanToAllMembers`.
  - Sets `plan_group = 'shared_all'` while retaining full individual adjustability for subsequent modifications.
- **Owner-Only Governance & Member Sharing**:
  - Added `'view_own_subscription_plan'` to `framework/family/permissions.ts`. All covered household roles (`owner`, `co_owner`, `member`, `dependent`) can view the weekly meal schedule in read-only mode (`t.perMember.viewOnlyNotice`).
  - Added a **"Share Owner's Plan"** option (`shareOwnerPlan`) allowing members to synchronize their meal schedule with the owner's plan (`plan_group = 'shared_with_owner'`).
  - Strictly restricted billing modifications, member coverage toggling, auto-renew controls, and payments to the family owner (`manage_family_subscription`).
- **Dynamic Pricing Engine**:
  - Implemented the pure calculation function `calculatePerMemberSubscriptionTotal`:
    $$\text{Total} = \left( \sum_{m \in \text{members}} \text{pricePerWeek}(m) \right) \times \text{weeks} - \text{discount}$$
  - Upfront checkout summary renders a complete per-member breakdown with transparent weekly rates.

---

### 2. Full-Month Interactive Pause Calendar Popup

- **Entire Month Calendar View**:
  - Upgraded `features/subscription/SubscriptionPauseCalendarModal.tsx` (`Modal` on web, `BottomSheet` on mobile) from a 7-day strip to a full-month interactive calendar.
  - Added month navigation controls (`<` previous month, `>` next month, and month/year label).
- **Active Subscription Day Highlighting**:
  - Days covered by the user's active billing period (`period_start` to `period_end`) are highlighted with a distinct background (`colors.bgSuccessSubtle`), border (`colors.success`), text (`colors.textSuccess`), and active indicator badge.
  - Paused days feature warning badges (`colors.bgWarningSubtle`, border `colors.warning`, `"Paused"` label).
  - Days in the past or within the 48-hour delivery cutoff window are locked and disabled with a lock icon.
  - Included a clean visual legend (_Active Box_, _Paused_, _Selected_, _Locked_).
- **Dual-Enforced Pause Limits**:
  - Centralized all business rules in `framework/subscription/subscriptionConfig.ts` (`SUBSCRIPTION_PAUSE_CONFIG`):
    1. Maximum 14 paused days per billing period (`MAX_PAUSED_DAYS_PER_PERIOD = 14`).
    2. Maximum 2 separate pause ranges per period (`MAX_PAUSE_RANGES_PER_PERIOD = 2`).
    3. Maximum 7 consecutive days per single pause (`MAX_CONSECUTIVE_PAUSE_DAYS = 7`).
    4. 48-hour delivery cutoff window (`CUTOFF_WINDOW_HOURS = 48`) and past-day lock.
    5. Paused days must fall within the current billing period boundaries.
  - Validated client-side via `validatePauseSelection` and enforced in PostgreSQL via the database trigger `fn_validate_and_apply_subscription_pause`.
  - Added dynamic allowance badges (_"10 of 14 paused days left"_, _"1 of 2 pause windows left"_) that block over-limit selections.
- **Upfront-Payment Period Extension Policy**:
  - When a pause is confirmed, the period end date is extended by the paused days (`calculateExtendedPeriodEnd`), ensuring full value for upfront payments without micro-refund friction. Documented in `docs/subscription.md`.
  - Created `subscription_pauses` table with RLS, Data API grants, and pgTAP regression tests.

---

### 3. Weekly Auto-Renewal State Machine

- **Database Columns & Checkout Opt-Out**:
  - Added `auto_renew` (default `true` with checkout toggle), `renewal_attempts` (0..3), `next_renewal_at`, `cancel_at_period_end`, and `last_renewed_period_end` watermark to `subscriptions`.
- **User Experience & Spacing**:
  - Integrated toggle in `SubscriptionPlanView.tsx` and `FamilySubscriptionView.tsx` (owner only) with plain-language billing notifications (_"Next charge of ₹2,498 on Nov 3. You can pause or cancel anytime."_).
  - Added generous margin spacing (`marginBottom: 16`) on `subAutoRenewRow` above the action buttons.
  - Turning auto-renew off prompts a confirmation dialog and leaves deliveries active until `period_end`, expiring gracefully.
- **Scheduled Renewal Engine (`processSubscriptionRenewal`)**:
  - Sends reminder notifications 3 days before renewal.
  - Recomputes total dynamically from current covered members and their selected plans.
  - On success: advances period by 7 days, retains meal choices, and resets retry counter.
  - On failure: retries up to 3 times over 3 days before transitioning to `'expired'`.
  - **Idempotency Guarantee**: Checks `last_renewed_period_end === period_end` to guarantee the same period is never double charged.

---

### 4. Admin Subscriptions Management Dashboard

- **Regional-Admin Scoping (RBAC)**:
  - Created `features/admin/AdminSubscriptionsManagementView.tsx` and integrated it into `AdminNavigationMenu.tsx` (new `subscriptions` tab) and `AdminDashboardView.tsx`.
  - Regional admins see only subscriptions within their assigned operating hubs (`profile.regions`), while super admins retain nationwide visibility.
- **Dashboard Table & Deep-Dive Inspection**:
  - Displays customer name, type badge (`Individual` or `Family`), plan name (with expandable per-member rows for families showing member name, plan, and weekly rate), member count, status badge (`Active`, `Paused`, `Expired`, `Cancelled`), auto-renew on/off badge, period start and end dates, amount paid, and next renewal date.
  - Multi-criteria filtering by Scope, Plan Type, Status, Auto-Renew, and Region.
  - Real-time search across customer names, emails, and phone numbers; sort by renewal date, period end date, or amount paid.
  - Detail inspection modal displaying covered member matrix, full pause history (dates used and ranges remaining), and retry history.
- **Administrative Cancellation**:
  - Protected behind a confirmation dialog with reason capture, executing through the audited `admin_cancel_subscription` SQL RPC and view `admin_subscriptions_view`.

---

### 5. Header Branding & Aesthetic Polish

- **Individual Subscriptions Page (`SubscriptionPlanView.tsx`)**:
  - Removed the _"Never Worry About What to Cook Tonight"_ slogan banner.
  - Modernized the header to **"RasoiGenie Box Subscriptions"** (_"Chef-Curated Dinners • Fresh Weekly Delivery"_).
  - Positioned the official Rasoi Genie logo (`assets/images/icon.png`) in the corner next to the header.
- **Family Meal Subscriptions Page (`FamilySubscriptionView.tsx`)**:
  - Modernized the header to **"RasoiGenie Box Subscriptions"** (_"[Household] Family Edition • Upfront Weekly Billing"_) with the Rasoi Genie logo.
  - Removed the _"Google Calendar–Style Weekly Meal Planner"_ banner card.
- **Strict Theme Tokens**:
  - 100% token-based color styling with zero hardcoded hex values (`#FFFFFF`, `#000000`, etc.), preserving dark and light mode consistency.

---

### 6. Family "Weekly Meal Plan" Redesign & Google Calendar–Style Month Grid

- **Heading & Copy Modernization**:
  - Replaced the heading `"2. Weekly Meal Matrix (Google Calendar View)"` with **"Weekly Meal Plan"** via `t.familyCalendar.planHeading`.
  - Updated the subtitle to **"Tap any day to see or change what each member is eating."** (`t.familyCalendar.planSubtitle`).
- **"Member plans" Section (Above the Calendar)**:
  - Added a dedicated configuration section featuring responsive cards (1 column on mobile phones, 2–3 columns on wide desktop screens).
  - Each card displays member `<Avatar>`, full name, role badge (`Owner`, `Co-owner`, `Member`, `Dependent`), weekly summary line (`₹X / week • 7 dinners`), and `<SegmentedControl>` for **High Protein**, **Keto**, **Vegan**, and **Custom**.
  - Includes a running total (`"Total per week: ₹X for N members"`) recalculating dynamically via `calculatePerMemberSubscriptionTotal`.
  - Added `"Apply to everyone"` quick action buttons with confirmation alert (`applyPlanToAllConfirmTitle`) to broadcast a plan to all covered members.
  - Implemented an overwrite confirmation prompt (`overwriteCustomPicksTitle`) if a member already has custom recipe selections before replacing them.
- **Granular Custom Plan Switching on Recipe Edit**:
  - If the owner customizes a recipe for themselves, only the owner's plan updates to **Custom Plan**, while all other members' plans remain intact.
  - If the owner customizes a recipe for another family member, only that family member's plan updates to **Custom Plan**, while the owner's and other members' plans remain intact.
- **Responsive Google Calendar–Style Month Grid**:
  - Replaced the member × weekday table and horizontal scrollview with an equal square cell month grid (`aspectRatio: 1`) that fits all phone screens without horizontal scrolling.
  - Displays weekday header row (`Mon` through `Sun`) **ONCE only** in the header.
  - Each cell displays the date number (large), weekday abbreviation (small, e.g. `"29 Thu"`), today ring highlight, paused styling for paused days, and dimmed styling for out-of-period days.
  - Shows up to 3 circular meal thumbnails with `+N` overflow chip when > 3 members have meals assigned.
  - Displays a corner clash warning icon (`⚠️`) if any member has a dietary conflict on that day.
  - Month navigation with `<` (previous), `>` (next) buttons, and a `"Today"` reset button.
  - Accessible labels (`formatDayAccessibilityLabel`) and 44px minimum tap targets.
  - Non-owner members see the grid read-only, filtered strictly to their own meals.
- **Day Detail Popup (BottomSheet on mobile, Modal on web)**:
  - Tapping any calendar day cell opens the Day Detail popup with the full formatted date title (e.g. `"Thursday, 29 October"`).
  - Contains sections for each covered member with their avatar, name, role badge, active plan chip, and assigned kit card with cuisine/protein info (or an `"Add a meal"` empty state).
  - Owner-only actions: `"Change Recipe"` / `"Swap"`, `"Clear"`, and granular pause controls:
    - **Individual Member Pause**: Owner can pause deliveries on that date for a single member (`memberId`), or resume deliveries.
    - **Whole Family Pause**: Dedicated section at the bottom allowing the owner to pause or resume deliveries on that date for the entire household (`memberId: null`).
  - Dietary clash warning banner displayed inside the affected member's section explaining the exact reason, replacing the old card conflict badge.
- **Pure Helper Functions & Testing**:
  - Created `framework/services/familyMealPlanCalendarHelpers.ts` with pure functions: `buildMonthCalendarGrid`, `mapMealsForDay`, `getWeekdayIndex`, `formatDateKey`, and `formatDayAccessibilityLabel`.
  - Added unit test suite `framework/__tests__/familyMealPlanCalendarHelpers.test.ts` (14 tests covering leap years, month boundaries, Monday start, out-of-period, pauses, overflow, clashes, and member-specific pause evaluations).
  - Updated `framework/__tests__/familySubscriptionDietaryConflictModal.test.tsx` to verify month cell clash indicator, popup conflict banner, and swap dismissal.

---

### 7. Quality Assurance & Test Verification

- **Automated Test Results**:
  - `framework/__tests__/familyMealPlanCalendarHelpers.test.ts`: **14/14 passed** (pure calendar helpers, leap years, overflow, clash detection, member-specific pause evaluations).
  - `framework/__tests__/familySubscriptionDietaryConflictModal.test.tsx`: **1/1 passed** (month grid day popup & swap dismissal).
  - `framework/__tests__/subscriptionExtensions.test.ts`: **24/24 passed** (per-member pricing, same-plan copy, 5 pause limits, period extension, renewal state machine, idempotency, family permissions).
  - `framework/__tests__/familyPermissions.test.ts`: **16/16 passed** (`manage_family_subscription` vs `view_own_subscription_plan`).
  - `framework/__tests__/subscriptionPlans.test.ts`: **5/5 passed**.
  - `framework/__tests__/subscriptionContext.test.tsx`: **7/7 passed**.
  - Whole repository test suite: **50/50 test suites passed, 407/407 tests passed**.
- **Static Analysis & Linting**:
  - TypeScript compilation (`npx tsc --noEmit`): **0 errors, clean build**.
  - ESLint (`npm run lint`): **0 errors**.
- **Documentation**:
  - Updated `docs/subscription.md` with Sections 8, 9, 10, and 11 detailing per-member plans, pause rules, the renewal state machine, and the admin view.
  - Documented today's work in `docs/work_status_report_2026-10-29.md` and `WORK_STATUS_USER.md`.
