# Playwright E2E Testing for RasoiGenie

Comprehensive End-to-End (E2E) testing suite for the RasoiGenie web target using Playwright, React Native Web `data-testid` mapping, and isolated test seed fixtures.

---

## 1. Architecture & Mechanics

- **Target Platform**: Expo Web (`output: "static"`, Metro Bundler on port 8081).
- **Test Runner**: Playwright (`@playwright/test`) configured with Chromium, 120s `webServer` cold-start timeout for Metro, and separate `e2e/` test directory.
- **Selector Strategy**: React Native `testID` props automatically compile to `data-testid` in the DOM via `react-native-web`. All Playwright selectors strictly use `page.getByTestId(...)`.
- **Isolation from Unit Tests**: Jest is configured with `testPathIgnorePatterns: ['/e2e/']`, ensuring Playwright tests run only via `npm run test:e2e` and do not execute during `npm test` or Husky `pre-push`.

---

## 2. Test Accounts & OTP Bypass Mechanism

Real SMS and Email delivery cannot be driven in automated CI environments. Authentication utilizes the built-in test bypass implemented in `framework/firebase/authService.ts`:

- Entering the verification OTP **`123456`** unconditionally verifies any phone or email login in test mode.
- Any email ending with **`@mulyam.in`** automatically grants the **Admin** role (`isAdmin: true`).
- Chef accounts are validated through the `chef_profiles` database table.

### Known Seeded Test Accounts

| Role | Email | Display Name | Permissions |
|---|---|---|---|
| **Admin** | `admin@mulyam.in` | Admin Tester | Full Admin Control Center (`/admin`), order approvals, chef moderation |
| **Chef** | `chef@rasoigenie.com` | Chef Sanjeev Test | Chef Studio (`/chef`), meal kit recipe submissions |
| **Customer** | `customer@example.com` | Rahul Customer | Browse, customize portions/spice, apply coupons, place orders |
| **Referrer** | `referrer@example.com` | Pooja Referrer | Referral code sharing (`RASOIREF99`), wallet credit rewards |
| **Referee** | `referee@example.com` | Aman Referee | New customer onboarding, referral qualification |

---

## 3. Directory Layout

```
e2e/
  fixtures/
    auth.fixtures.ts          # Seed session helper + Playwright context fixtures
    test-data.ts              # Seeded accounts, coupons (RASOI100, FREEDEL), meal kits
  flows/
    browse-and-order.spec.ts  # Search -> portions/spice -> coupon -> checkout + failure branch
    order-rejection.spec.ts   # Dual browser contexts (user + admin): approval and rejection branches
    chef-onboarding.spec.ts   # Chef Studio recipe submission -> Admin moderation (publish / reject)
    referral-credit.spec.ts   # Referral registration -> qualifying order -> wallet credit accrual
  pages/                      # Page Object Models matching real routes and components
    home.page.ts              # app/(tabs)/index.tsx & MealDetailModal
    search.page.ts            # app/(tabs)/search.tsx & SearchView
    cart.page.ts              # features/cart/CartView.tsx
    checkout.page.ts          # features/checkout/CheckoutView.tsx
    admin-dashboard.page.ts   # features/admin/AdminDashboardView.tsx & AdminNavigationMenu
    chef-studio.page.ts       # features/chef/ChefStudioView.tsx
  scripts/
    seed-emulator.ts          # Firebase Auth & Firestore test state seeding/cleanup
    seed-supabase-test.ts     # Supabase profiles, meal kits, referral codes, chef submissions
  global-setup.ts             # Runs before suite execution
  global-teardown.ts          # Cleans up test records after suite completes
```

---

## 4. Running Tests Locally

### Run All E2E Tests Headlessly
```bash
npm run test:e2e
```

### Run Tests with Interactive UI
```bash
npm run test:e2e:ui
```

### Run a Specific Flow
```bash
npx playwright test e2e/flows/browse-and-order.spec.ts
npx playwright test e2e/flows/order-rejection.spec.ts
npx playwright test e2e/flows/chef-onboarding.spec.ts
npx playwright test e2e/flows/referral-credit.spec.ts
```

### Inspect Test Reports
```bash
npx playwright show-report
```

---

## 5. CI / GitHub Actions

The workflow in `.github/workflows/e2e.yml`:
1. Checks out the code and sets up Node.js 20.
2. Installs dependencies using `npm ci --legacy-peer-deps`.
3. Downloads the Playwright Chromium browser binary.
4. Executes `globalSetup`, which seeds test data into Supabase and Firebase.
5. Launches Metro web server (`npx expo start --web --port 8081`).
6. Executes all 4 E2E flows covering happy paths and failure/rejection branches.
7. Stores the HTML report and traces as GitHub Actions artifacts upon completion.
