# RasoiGenie Design System Specification

> **Visual Source of Truth:** Explore Screen (`features/home/HomeScreenView.tsx` / `app/(tabs)/index.tsx`)  
> **Theme Engine:** `framework/theme/tokens.ts` & `framework/theme/ThemeContext.tsx`  
> **UI Components:** `framework/ui/*`

---

## 1. Core Principles

1. **Food-Forward Warmth:** Clean, inviting, appetizing canvas (`bgPrimary`: `#FCFAF6` light / `#0F0E0D` dark) with warm spice tones (`primary` Saffron/Terracotta, `accent` Teal/Cyan).
2. **Strict Dynamic Theming:** Zero hardcoded hex colors in layout or feature components. All backgrounds, borders, shadows, text, and badges MUST resolve dynamically via `useTheme()` tokens to ensure 100% fidelity in both Light and Dark modes.
3. **Consistent Spacing Scale:** 4px geometric progression (`SPACING` tokens). Fixed 16px horizontal screen gutters.
4. **Elevation & Tactile Feedback:** High-polish micro-interactions with `activeOpacity` (0.75 – 0.85), soft shadows on mobile (`elevation: 2–4`), and subtle multi-layer CSS box-shadows on web.

---

## 2. Spacing Scale

Derived from `SPACING` tokens in `framework/theme/tokens.ts`:

| Token          | Value  | Primary Usage                                                                  |
| :------------- | :----: | :----------------------------------------------------------------------------- |
| `SPACING.xs`   | `4px`  | Micro gaps between inline icons/badges, badge padding vertical                 |
| `SPACING.sm`   | `8px`  | Gap between elements in rows, small item padding, chip gaps                    |
| `SPACING.md`   | `12px` | Horizontal card row gaps, card internal padding (compact), input icon spacing  |
| `SPACING.lg`   | `16px` | **Screen horizontal gutters (`paddingHorizontal: 16`)**, standard card padding |
| `SPACING.xl`   | `20px` | Section margins (`marginBottom: 20`), modal padding                            |
| `SPACING.xxl`  | `28px` | Section break padding, empty state padding                                     |
| `SPACING.xxxl` | `36px` | Major hero headers, large empty state spacing                                  |

### Layout Rules

- **Screen Margins:** All scroll bodies must have `paddingHorizontal: 16` and `paddingBottom: 100` (or `110` when bottom tab bar / mini bar is present).
- **Section Margins:** Top margin `18px–24px` between catalog / feature sections, `marginBottom: 12px` between header and section content.

---

## 3. Typography Scale

Derived from `TYPOGRAPHY` tokens and `HomeScreenView.tsx` standard hierarchy:

| Style Role              |   Font Size   |      Weight       | Line Height | Letter Spacing | Color Token                       |
| :---------------------- | :-----------: | :---------------: | :---------: | :------------: | :-------------------------------- |
| **Display / Hero**      |    `28px`     | `800` (ExtraBold) |   `34px`    |    `-0.5px`    | `colors.textPrimary`              |
| **Section Heading**     |    `21px`     | `800` (ExtraBold) |   `26px`    |    `-0.4px`    | `colors.textPrimary`              |
| **Modal / Card Title**  | `17px – 18px` |   `700` (Bold)    |   `22px`    |    `-0.2px`    | `colors.textPrimary`              |
| **Card / Item Title**   | `14px – 15px` | `800` (ExtraBold) |   `18px`    |     `0px`      | `colors.textPrimary`              |
| **Subtitle / Meta**     |    `13px`     | `600` (SemiBold)  |   `18px`    |     `0px`      | `colors.textSecondary`            |
| **Body Standard**       |    `14px`     |   `400` / `500`   |   `20px`    |     `0px`      | `colors.textPrimary`              |
| **Body Secondary**      | `12px – 13px` |   `400` / `500`   |   `16px`    |     `0px`      | `colors.textSecondary`            |
| **Caption / Badge**     | `11px – 12px` |   `700` (Bold)    |   `14px`    |    `0.3px`     | Token-dependent                   |
| **Micro Tag**           | `9px – 10px`  | `800` (ExtraBold) |   `12px`    |    `0.5px`     | `colors.textInverse`              |
| **Price Hero**          | `15px – 18px` |   `900` (Black)   |   `20px`    |     `0px`      | `colors.textPrimary` or `primary` |
| **Strikethrough Price** | `11px – 12px` |   `400` / `500`   |   `14px`    |     `0px`      | `colors.textMuted`                |

---

## 4. Color Palette & Semantic Tokens

All screens must strictly read colors from `const { colors, isDark } = useTheme();`.

### Surface & Background Tokens

- `colors.bgPrimary`: App canvas background (`#FCFAF6` Light / `#0F0E0D` Dark).
- `colors.bgSurface`: Card, sheet, and modal container surface (`#FFFFFF` Light / `#1A1816` Dark).
- `colors.bgSubtle`: Secondary surfaces, unselected filter tabs, table cell headers (`#F6F2EB` Light / `#262320` Dark).
- `colors.bgCard`: Elevated card surfaces (`#FFFFFF` Light / `#1A1816` Dark).

### Border Tokens

- `colors.borderLight`: Subtle card borders, list row dividers, input inactive borders (`#F3EFE9` Light / `#23201D` Dark).
- `colors.border`: Pronounced component outlines, selected pills, active frames (`#E8E3DC` Light / `#2E2A27` Dark).

### Accent & Feedback Tokens

- `colors.primary`: Core brand primary CTA and active highlight.
- `colors.primaryLight`: Subtle tinted badge/icon backdrop.
- `colors.veg` & `colors.vegLight`: Green vegetarian indicators (`#15803D` / `#DCFCE7`).
- `colors.nonVeg` & `colors.nonVegLight`: Red non-vegetarian indicators (`#B91C1C` / `#FEE2E2`).
- `colors.success`, `colors.warning`, `colors.danger`, `colors.info`: Standard feedback alerts.

---

## 5. Corner Radii (`RADII`)

| Token        |  Value  | Target UI Elements                                                 |
| :----------- | :-----: | :----------------------------------------------------------------- |
| `RADII.xs`   |  `4px`  | Micro badges, diet mark borders, image corner tags                 |
| `RADII.sm`   |  `8px`  | Secondary buttons, dropdown items, stepper buttons                 |
| `RADII.md`   | `12px`  | Quick Add CTA button, small cards, input fields                    |
| `RADII.lg`   | `16px`  | Standard meal cards, bottom sheet internal sections                |
| `RADII.xl`   | `22px`  | **Standard container cards (`Card`), modals, promo banners**       |
| `RADII.pill` | `999px` | Filter pills, status chips, avatar circles, full-width CTA buttons |

---

## 6. Card & Image Treatments (Explore Benchmark)

1. **Container Construction:**
   - Background: `colors.bgSurface`
   - Border: `1px solid colors.borderLight`
   - Radius: `radii.xl` (`22px`) or `radii.lg` (`16px`)
   - Shadow: `shadows.card` (light mode) / `DARK_SHADOWS.card` (dark mode)
   - Overflow: Strictly `hidden` to clip full-bleed top imagery
2. **Card Imagery:**
   - Height: `120px` (horizontal scroll) or `140px` (2-column grid cards)
   - Aspect ratio: ~16:9 landscape food imagery
   - Fallback: `DEFAULT_FALLBACK_FOOD_IMG`
3. **Floating Card Badges (Glassmorphism & Overlay):**
   - Top-Left: Diet indicator (`<DietMark isVeg={...} />`) wrapped in translucent pill (`backgroundColor: 'rgba(255,255,255,0.92)'`, `padding: 3`, `borderRadius: 5`).
   - Top-Right: Favorite icon button with white translucent circle backdrop (`rgba(255,255,255,0.9)`, `width: 32`, `height: 32`, `borderRadius: 16`).
   - Bottom-Left Image Overlay: Prep time tag with dark translucent pill (`backgroundColor: 'rgba(0,0,0,0.6)'`, `borderRadius: 6`, `paddingHorizontal: 8`, `paddingVertical: 3`, text `11px #FFFFFF 700`).

---

## 7. Button Styles & Steppers

1. **Primary Button (`<Button variant="primary" />`):**
   - Background: `colors.primary`
   - Text: `colors.textInverse` (`15px 700`)
   - Height: `46px` (md) or `52px` (lg)
   - Radius: `radii.xl` (`22px`) or `radii.pill`
   - Shadow: `shadows.soft`
2. **Outline Button (`<Button variant="outline" />`):**
   - Background: `transparent`
   - Border: `1.5px solid colors.primary`
   - Text: `colors.primary` (`15px 700`)
3. **Quick Add CTA (`quickAddBtn`):**
   - Min height `44px`, min width `70px`, radius `10px`, background `colors.primary`, text `#FFFFFF 13px 800`.
4. **Quantity Stepper (`<QuantityStepper />` / `cardInlineStepper`):**
   - Compact rounded container (`borderRadius: 20`, `borderWidth: 1`, `borderColor: colors.borderLight`).
   - Stepper minus/plus buttons: Minimum hit target `32x32px`, `activeOpacity: 0.7`.
   - Quantity counter text: `13px 800` centered.

---

## 8. Motion & Micro-Interactions

1. **Press Feedback:**
   - Touchables must have `activeOpacity={0.75}` (pills/links) or `activeOpacity={0.82}` (cards/buttons).
2. **Modal Backdrops:**
   - Dimmed overlay: `backgroundColor: 'rgba(0, 0, 0, 0.65)'`.
   - Card animation: Smooth `fade` or `slide` transition.
3. **Skeleton Loading:**
   - `<SkeletonRecipeCard />` or `<Skeleton />` shimmering placeholder blocks matching exact card dimensions while fetching queries.

---

## 9. Standard State Patterns

1. **Loading State:**
   - Initial loading: Skeleton placeholders matching screen card layouts.
   - Action loading: Centered `<ActivityIndicator size="large" color={colors.primary} />` or button spinner.
2. **Empty State:**
   - Centered `<EmptyState />` component with `icon`, bold title (`17px 700`), supportive 2-line explanation (`13px textSecondary`), and primary action button (e.g., "Explore Meal Kits").
3. **Error State:**
   - Inline friendly banner with icon (`alert-circle`), helpful error copy, and "Try Again" / "Retry" outline button.
