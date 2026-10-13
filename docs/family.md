# RasoiGenie Family Feature v2: Architectural & Engineering Specification

## 1. Overview & Core Philosophy

RasoiGenie Family Feature v2 enables collaborative household dining without introducing unnecessary barriers or privacy risks:

- **Zero Verification for Family Creation & Joining:** No phone or email verification is required to create, join, or use a Family. (The existing checkout phone-OTP for order placement remains strictly preserved).
- **Single Payer Checkout:** A single payer (the owner or an authorized co-owner) pays for the entire basket using their personal wallet credits and preferred payment methods. There is no pooled "family wallet".
- **Link-Joined Dependents (Zero Login):** Children and seniors join via cryptographic, single-use links without accounts, passwords, or phone numbers.
- **Strict Dependent Item Approval:** Items added by dependents remain in `pending_approval` until explicitly reviewed and approved by the family owner.

---

## 2. Roles & Permission Matrix

The permissions are enforced at the database level via PostgreSQL RLS and `SECURITY DEFINER` RPCs, and mirrored identically across the client application.

| Action                                            | Owner | Co-Owner | Member (Adult) | Dependent (Child / Senior)  |
| :------------------------------------------------ | :---: | :------: | :------------: | :-------------------------: |
| **Invite adults by phone**                        |  Yes  |    No    |       No       |             No              |
| **Generate dependent link**                       |  Yes  |    No    |       No       |             No              |
| **Add / remove members, revoke links**            |  Yes  |    No    |       No       |             No              |
| **Promote/demote co-owner, transfer ownership**   |  Yes  |    No    |       No       |             No              |
| **Add / edit / remove ANY item in family cart**   |  Yes  |    No    |       No       |             No              |
| **Add / edit / remove OWN items**                 |  Yes  |   Yes    |      Yes       | Add only (goes to approval) |
| **Approve / reject dependent items**              |  Yes  |    No    |       No       |             No              |
| **Lock / unlock family cart**                     |  Yes  |    No    |       No       |             No              |
| **Start checkout hold & PAY**                     |  Yes  |   Yes    |       No       |             No              |
| **Use personal cart, wallet, coupons, referrals** |  Yes  |   Yes    |      Yes       |      **NO (Blocked)**       |
| **View family cart, order tracking, Cook Mode**   |  Yes  |   Yes    |      Yes       |  Yes (own approved items)   |
| **Leave the family**                              | Yes*  |   Yes    |      Yes       |             Yes             |

_\*Owner must transfer ownership to an adult member before leaving._

### Role Limits & Constraints:

- **Maximum 6 Total Seats:** `members + pending phone invites + unredeemed join links <= 6`.
- **Maximum 2 Co-Owners:** Only adult members can be promoted to co-owner.
- **Single Family Membership:** A user (or anonymous session) can belong to at most one family at any given time (`UNIQUE(user_id)`).

---

## 3. Data Model & Database Architecture

Migration file: `framework/supabase/migrations/20261013_family_v2.sql`.

### Tables Overview

1. **`families`**:
   - `id` (UUID, PK), `name` (TEXT), `owner_id` (TEXT), `is_locked` (BOOLEAN DEFAULT false), `created_at`, `updated_at`.
2. **`family_members`**:
   - `family_id` (FK to families), `user_id` (TEXT, PK / UNIQUE), `role` (`owner` | `co_owner` | `member` | `dependent`), `dependent_type` (`child` | `senior` | null), `display_name` (TEXT - first name only), `joined_at`.
3. **`family_invites`**:
   - `id` (UUID, PK), `family_id` (FK), `invited_by` (TEXT), `invited_phone` (TEXT, E.164), `status` (`pending` | `accepted` | `declined` | `expired` | `revoked`), `expires_at` (7 days), `created_at`, `updated_at`.
4. **`family_join_links`**:
   - `id` (UUID, PK), `family_id` (FK), `created_by` (TEXT), `token_hash` (TEXT, SHA-256), `dependent_type` (`child` | `senior`), `display_name` (TEXT), `status` (`pending` | `redeemed` | `expired` | `revoked`), `expires_at` (24h default), `redeemed_by` (TEXT), `redeemed_at`, `guardian_confirmed` (BOOLEAN), `consent_version` (TEXT), `created_at`.
5. **`family_cart_items`**:
   - `id` (UUID, PK), `family_id` (FK), `added_by` (TEXT), `kit_id` (TEXT), `quantity` (INT), `servings` (INT), `spice_level` (TEXT), `unit_price` (NUMERIC), `status` (`approved` | `pending_approval` | `rejected`), `approved_by` (TEXT), `rejection_reason` (TEXT), `updated_at`, `created_at`.
6. **`family_checkout_holds`**:
   - `family_id` (PK, FK), `held_by` (TEXT), `expires_at` (TIMESTAMPTZ, 10 min duration), `idempotency_key` (TEXT), `created_at`.
7. **`consent_records`**:
   - `id` (UUID, PK), `user_id` (TEXT), `family_id` (FK), `type` (`guardian` | `self`), `version` (TEXT), `created_at`.
8. **`family_membership_history`**:
   - `id` (UUID, PK), `user_id` (TEXT), `family_id` (FK), `joined_at`, `left_at`.
9. **`family_audit_log`**:
   - Append-only immutable log: `id`, `family_id`, `actor_id`, `action`, `details` (JSONB), `created_at`.
10. **`orders` & `order_items` modifications**:
    - `orders.family_id` (UUID nullable), `orders.payer_id` (TEXT nullable).
    - `order_items.added_by` (TEXT nullable).

### Capacity Enforcement Trigger & Lock:

Inside the RPCs, transactions issue `SELECT id FROM families WHERE id = p_family_id FOR UPDATE;` to serialize concurrent join/invite requests, and verify:

```sql
SELECT (
  (SELECT COUNT(*) FROM family_members WHERE family_id = p_family_id) +
  (SELECT COUNT(*) FROM family_invites WHERE family_id = p_family_id AND status = 'pending' AND expires_at > now()) +
  (SELECT COUNT(*) FROM family_join_links WHERE family_id = p_family_id AND status = 'pending' AND expires_at > now())
);
```

---

## 4. Link Security & Concurrency

### Cryptographic Token Handling

- When generating a join link, the server or RPC creates 32 cryptographically secure random bytes (`gen_random_bytes(32)`).
- The raw hex token is returned **exactly once** to the owner and is never stored in plaintext.
- The database stores **only** the SHA-256 hash (`encode(digest(p_raw_token, 'sha256'), 'hex')`).
- Logs, telemetry, and error payloads never capture raw tokens.

### Atomicity & Race Prevention

- `redeem_join_link` locks the link row via `SELECT ... FOR UPDATE`.
- If two devices submit the same token simultaneously, exactly one succeeds and marks the row `redeemed`. The other immediately receives a rejection.
- If multiple invites or links race for the 6th seat, the transaction lock ensures strict first-come first-served admission.

---

## 5. India DPDP Act Compliance & Child Isolation

Under the Digital Personal Data Protection (DPDP) Act of India:

1. **Verifiable Parental Consent:**
   - Minors cannot enter binding agreements or manage transactions. When generating a link for a child (`dependent_type = 'child'`), the owner must explicitly confirm: _"I am this child's parent or legal guardian and I consent to their use of RasoiGenie"_.
   - A row is recorded in `consent_records` (`type = 'guardian'`, timestamp, version).
2. **Minimal Data Collection:**
   - Children and seniors store only a first name. No phone numbers, email addresses, or free-text fields are collected.
3. **Tracking & Advertising Restrictions:**
   - Marketing notifications, behavioral analytics, and targeting are strictly disabled for child dependent sessions.
4. **Isolated Shell:**
   - The dependent app shell contains only Explore, Family Basket, and Family Orders. All routes to Account, Login, Wallet, Coupons, Personal Basket, and Payment gateways are completely removed from the UI and blocked on the server.

---

## 6. Largest Remainder Cost Allocation (Hare-Niemeyer Method)

When displaying per-member breakdowns for delivery fees or order discounts:

- Standard division can create fractional paise that fail to sum to the total charged amount.
- We utilize the largest-remainder method in integer paise:
  1. Each member's exact quota is calculated: `(member_subtotal / total_subtotal) * total_paise`.
  2. Each member receives the floor of their quota: `Math.floor(quota)`.
  3. The remaining unallocated paise are distributed 1-by-1 to the members with the highest fractional remainders.
- Result: **The allocated shares sum exactly to the fee or discount amount down to 0 remainder.**

---

## 7. Realtime Synchronization & Idempotent Reducer

Realtime events from `family_cart_items` are synchronized using `subscribeToTable`:

- The client-side reducer (`familyCartReducer`) maintains state idempotency:
  - Updates compare `incoming.updated_at` against `existing.updated_at`. Stale network packets arriving out of order are discarded.
  - Approved items and pending items are indexed and separated reactively.
