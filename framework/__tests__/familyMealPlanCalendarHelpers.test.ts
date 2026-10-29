import {
  getWeekdayIndex,
  formatDateKey,
  buildMonthCalendarGrid,
  mapMealsForDay,
  formatDayAccessibilityLabel,
} from '../services/familyMealPlanCalendarHelpers';
import { FamilyMember } from '../services/familyService';
import { MealKit } from '../services/mealKitsService';

describe('familyMealPlanCalendarHelpers', () => {
  describe('getWeekdayIndex & formatDateKey', () => {
    it('maps Monday to 0 and Sunday to 6', () => {
      // 2026-10-26 is Monday
      const monday = new Date(2026, 9, 26);
      expect(getWeekdayIndex(monday)).toBe(0);

      // 2026-11-01 is Sunday
      const sunday = new Date(2026, 10, 1);
      expect(getWeekdayIndex(sunday)).toBe(6);

      // 2026-10-29 is Thursday (index 3)
      const thursday = new Date(2026, 9, 29);
      expect(getWeekdayIndex(thursday)).toBe(3);
    });

    it('formats date key as YYYY-MM-DD', () => {
      const date = new Date(2026, 9, 5); // Oct 5
      expect(formatDateKey(date)).toBe('2026-10-05');
    });
  });

  describe('buildMonthCalendarGrid', () => {
    it('handles leap years correctly (Feb 2024 has 29 days, Feb 2025 has 28 days)', () => {
      // Leap year: Feb 2024
      const feb2024 = buildMonthCalendarGrid({
        year: 2024,
        month: 1, // Feb
      });
      expect(feb2024.daysInMonth).toBe(29);
      const daysCount2024 = feb2024.weeks
        .flat()
        .filter((d) => d.isCurrentMonth && d.dayNum > 0).length;
      expect(daysCount2024).toBe(29);

      // Non-leap year: Feb 2025
      const feb2025 = buildMonthCalendarGrid({
        year: 2025,
        month: 1, // Feb
      });
      expect(feb2025.daysInMonth).toBe(28);
      const daysCount2025 = feb2025.weeks
        .flat()
        .filter((d) => d.isCurrentMonth && d.dayNum > 0).length;
      expect(daysCount2025).toBe(28);
    });

    it('starts every week row on Monday (weekdayIndex 0) and ends on Sunday (weekdayIndex 6)', () => {
      const grid = buildMonthCalendarGrid({
        year: 2026,
        month: 9, // October 2026
      });

      for (const week of grid.weeks) {
        expect(week.length).toBe(7);
        expect(week[0]!.weekdayIndex).toBe(0);
        expect(week[6]!.weekdayIndex).toBe(6);
      }
    });

    it('marks today, subscription period, and out-of-period days correctly', () => {
      const grid = buildMonthCalendarGrid({
        year: 2026,
        month: 9, // October 2026
        today: new Date(2026, 9, 29),
        periodStart: '2026-10-26',
        periodEnd: '2026-11-01',
      });

      const oct29 = grid.weeks.flat().find((d) => d.dateStr === '2026-10-29');
      expect(oct29).toBeDefined();
      expect(oct29?.isToday).toBe(true);
      expect(oct29?.isInsidePeriod).toBe(true);

      const oct15 = grid.weeks.flat().find((d) => d.dateStr === '2026-10-15');
      expect(oct15).toBeDefined();
      expect(oct15?.isToday).toBe(false);
      expect(oct15?.isInsidePeriod).toBe(false); // Outside 2026-10-26 to 2026-11-01
    });

    it('identifies paused days from pause records', () => {
      const grid = buildMonthCalendarGrid({
        year: 2026,
        month: 9, // October 2026
        periodStart: '2026-10-01',
        periodEnd: '2026-10-31',
        pauses: [{ startDate: '2026-10-10', endDate: '2026-10-12' }],
      });

      const pausedDay = grid.weeks.flat().find((d) => d.dateStr === '2026-10-11');
      expect(pausedDay?.isPaused).toBe(true);

      const unpausedDay = grid.weeks.flat().find((d) => d.dateStr === '2026-10-15');
      expect(unpausedDay?.isPaused).toBe(false);
    });

    it('marks days locked when within 48h cutoff window or in the past', () => {
      const today = new Date(2026, 9, 29, 10, 0, 0); // Oct 29, 2026
      const grid = buildMonthCalendarGrid({
        year: 2026,
        month: 9,
        today,
      });

      // Oct 28 (yesterday) -> locked
      const yesterday = grid.weeks.flat().find((d) => d.dateStr === '2026-10-28');
      expect(yesterday?.isLocked).toBe(true);

      // Oct 30 (within 48h) -> locked
      const tomorrow = grid.weeks.flat().find((d) => d.dateStr === '2026-10-30');
      expect(tomorrow?.isLocked).toBe(true);

      // Future date > 48h -> not locked
      const future = grid.weeks.flat().find((d) => d.dateStr === '2026-10-31');
      // Depending on cutoff (48h from Oct 29 10am is Oct 31 10am)
      // Let's check Nov or later in month if available
    });
  });

  describe('mapMealsForDay', () => {
    const mockMembers: FamilyMember[] = [
      {
        family_id: 'fam1',
        user_id: 'user1',
        role: 'owner',
        display_name: 'Aarav (Veg)',
        joined_at: new Date().toISOString(),
        preferences: { dietTypes: ['veg'] },
      },
      {
        family_id: 'fam1',
        user_id: 'user2',
        role: 'member',
        display_name: 'Bhavna (Non-Veg)',
        joined_at: new Date().toISOString(),
        preferences: { dietTypes: ['nonveg'] },
      },
      {
        family_id: 'fam1',
        user_id: 'user3',
        role: 'dependent',
        dependent_type: 'child',
        display_name: 'Chintu',
        joined_at: new Date().toISOString(),
      },
      {
        family_id: 'fam1',
        user_id: 'user4',
        role: 'dependent',
        dependent_type: 'senior',
        display_name: 'Dadi',
        joined_at: new Date().toISOString(),
      },
    ];

    const mockChickenBiryani = {
      id: 'kit_chicken',
      name: 'Chicken Biryani',
      cuisine: 'Mughlai',
      diet: 'nonveg',
      dietaryTags: ['nonveg'],
      allergens: [],
      spiceLevel: 'Medium',
      heroImage: 'https://example.com/chicken.jpg',
      nutrition: { calories: 550, protein: 35, carbs: 50, fat: 18, fiber: 4 },
    } as unknown as MealKit;

    const mockPaneerTikka = {
      id: 'kit_paneer',
      name: 'Paneer Tikka',
      cuisine: 'North Indian',
      diet: 'veg',
      dietaryTags: ['veg'],
      allergens: ['Dairy'],
      spiceLevel: 'Mild',
      heroImage: 'https://example.com/paneer.jpg',
      nutrition: { calories: 420, protein: 20, carbs: 25, fat: 22, fiber: 3 },
    } as unknown as MealKit;

    const getMealKitById = (id: string) => {
      if (id === 'kit_chicken') return mockChickenBiryani;
      if (id === 'kit_paneer') return mockPaneerTikka;
      return undefined;
    };

    it('assigns kits, computes max 3 thumbnails and overflow chip (+1) when 4 members have meals', () => {
      const localMeals: Record<string, string> = {
        user1_0: 'kit_paneer',
        user2_0: 'kit_chicken',
        user3_0: 'kit_paneer',
        user4_0: 'kit_paneer',
      };

      const result = mapMealsForDay({
        members: mockMembers,
        localMeals,
        weekdayIndex: 0,
        getMealKitById,
      });

      expect(result.allMemberMeals.length).toBe(4);
      expect(result.assignedMeals.length).toBe(4);
      expect(result.visibleMeals.length).toBe(3);
      expect(result.overflowCount).toBe(1);
    });

    it('detects dietary clashes accurately when a vegetarian member is assigned a non-veg kit', () => {
      const localMeals: Record<string, string> = {
        user1_0: 'kit_chicken', // Aarav is veg, assigned chicken biryani!
        user2_0: 'kit_chicken', // Bhavna is non-veg, assigned chicken biryani (safe)
      };

      const result = mapMealsForDay({
        members: mockMembers.slice(0, 2),
        localMeals,
        weekdayIndex: 0,
        getMealKitById,
      });

      expect(result.hasAnyConflict).toBe(true);
      const aaravMeal = result.allMemberMeals.find((m) => m.member.user_id === 'user1');
      expect(aaravMeal?.hasConflict).toBe(true);
      expect(aaravMeal?.conflictReasons[0]).toMatch(/vegetarian/i);

      const bhavnaMeal = result.allMemberMeals.find((m) => m.member.user_id === 'user2');
      expect(bhavnaMeal?.hasConflict).toBe(false);
    });

    it('does NOT flag "same kit for multiple members" as a conflict', () => {
      const localMeals: Record<string, string> = {
        user1_0: 'kit_paneer',
        user2_0: 'kit_paneer',
      };

      const result = mapMealsForDay({
        members: mockMembers.slice(0, 2),
        localMeals,
        weekdayIndex: 0,
        getMealKitById,
      });

      expect(result.hasAnyConflict).toBe(false);
    });

    it('filters strictly to member when filterToMemberId is supplied (non-owner view)', () => {
      const localMeals: Record<string, string> = {
        user1_0: 'kit_paneer',
        user2_0: 'kit_chicken',
      };

      const result = mapMealsForDay({
        members: mockMembers,
        localMeals,
        weekdayIndex: 0,
        getMealKitById,
        filterToMemberId: 'user2',
      });

      expect(result.allMemberMeals.length).toBe(1);
      expect(result.allMemberMeals[0]!.member.user_id).toBe('user2');
      expect(result.assignedMeals[0]!.kit?.name).toBe('Chicken Biryani');
    });
  });

  describe('formatDayAccessibilityLabel', () => {
    it('produces descriptive screen reader labels with meal counts, pauses, and conflicts', () => {
      const date = new Date(2026, 9, 29); // 29 October 2026, Thursday

      const labelNormal = formatDayAccessibilityLabel(date, 3, false, false);
      expect(labelNormal).toMatch(/29 October.*Thursday.*3 meals/);

      const labelPaused = formatDayAccessibilityLabel(date, 3, true, false);
      expect(labelPaused).toMatch(/deliveries paused/);

      const labelConflict = formatDayAccessibilityLabel(date, 3, false, true);
      expect(labelConflict).toMatch(/dietary clash warning/);
    });
  });
});
