import {
  getWeekdayIndex,
  formatDateKey,
  buildMonthCalendarGrid,
  mapMealsForDay,
  formatDayAccessibilityLabel,
  buildShiftedMealSchedule,
} from '../services/familyMealPlanCalendarHelpers';
import { isDatePaused, isWholeFamilyDatePaused } from '../services/subscriptionPlans';
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

    it('identifies per-member pauses vs whole-family pauses accurately', () => {
      const localMeals: Record<string, string> = {
        user1_0: 'kit_paneer',
        user2_0: 'kit_chicken',
      };

      // Only user2 is paused on 2026-10-26
      const memberSpecificPauses = [
        { id: 'p1', startDate: '2026-10-26', endDate: '2026-10-26', memberId: 'user2' },
      ];

      const result = mapMealsForDay({
        members: mockMembers.slice(0, 2),
        localMeals,
        weekdayIndex: 0,
        getMealKitById,
        pauses: memberSpecificPauses,
        currentDate: '2026-10-26',
      });

      const user1Meal = result.allMemberMeals.find((m) => m.member.user_id === 'user1');
      const user2Meal = result.allMemberMeals.find((m) => m.member.user_id === 'user2');

      expect(user1Meal?.isPaused).toBe(false);
      expect(user2Meal?.isPaused).toBe(true);
      expect(user2Meal?.isFamilyPause).toBe(false);
      expect(user2Meal?.pauseId).toBe('p1');
    });
  });

  describe('isDatePaused & isWholeFamilyDatePaused per-member evaluation', () => {
    it('evaluates whole-family vs member-specific pauses correctly', () => {
      const pauses = [
        { startDate: '2026-10-20', endDate: '2026-10-20', memberId: null }, // whole family
        { startDate: '2026-10-22', endDate: '2026-10-22', memberId: 'user_aarav' }, // aarav only
      ];

      // Oct 20: whole family paused
      expect(isWholeFamilyDatePaused('2026-10-20', pauses)).toBe(true);
      expect(isDatePaused('2026-10-20', pauses, 'user_aarav')).toBe(true);
      expect(isDatePaused('2026-10-20', pauses, 'user_bhavna')).toBe(true);

      // Oct 22: aarav paused, bhavna NOT paused, whole family NOT paused
      expect(isWholeFamilyDatePaused('2026-10-22', pauses)).toBe(false);
      expect(isDatePaused('2026-10-22', pauses, 'user_aarav')).toBe(true);
      expect(isDatePaused('2026-10-22', pauses, 'user_bhavna')).toBe(false);

      // Oct 25: unpaused date
      expect(isDatePaused('2026-10-25', pauses, 'user_aarav')).toBe(false);
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

  describe('buildShiftedMealSchedule', () => {
    const sampleMembers = [
      { user_id: 'user_aarav', display_name: 'Aarav', role: 'owner' as const },
    ] as any;

    const sampleLocalMeals = {
      user_aarav_0: 'kit_mon',
      user_aarav_1: 'kit_tue',
      user_aarav_2: 'kit_wed',
      user_aarav_3: 'kit_thu',
      user_aarav_4: 'kit_fri',
      user_aarav_5: 'kit_sat',
      user_aarav_6: 'kit_sun',
    };

    it('delivers 7 meals in original sequence when no pause exists', () => {
      // Period: Thu 2026-10-29 to Wed 2026-11-04 (7 days)
      const schedule = buildShiftedMealSchedule({
        periodStart: '2026-10-29',
        periodEnd: '2026-11-04',
        members: sampleMembers,
        localMeals: sampleLocalMeals,
        pauses: [],
      });

      expect(schedule['user_aarav_2026-10-29']).toBe('kit_thu');
      expect(schedule['user_aarav_2026-10-30']).toBe('kit_fri');
      expect(schedule['user_aarav_2026-10-31']).toBe('kit_sat');
      expect(schedule['user_aarav_2026-11-01']).toBe('kit_sun');
      expect(schedule['user_aarav_2026-11-02']).toBe('kit_mon');
      expect(schedule['user_aarav_2026-11-03']).toBe('kit_tue');
      expect(schedule['user_aarav_2026-11-04']).toBe('kit_wed');
    });

    it('shifts skipped meals forward to make-up days when middle days are paused', () => {
      // Period extended by 5 days: 2026-10-29 to 2026-11-09
      // Paused: 2026-10-31 to 2026-11-04 (Sat through Wed = 5 days)
      const schedule = buildShiftedMealSchedule({
        periodStart: '2026-10-29',
        periodEnd: '2026-11-09',
        members: sampleMembers,
        localMeals: sampleLocalMeals,
        pauses: [{ startDate: '2026-10-31', endDate: '2026-11-04', memberId: null }],
      });

      // Thu & Fri delivered normally before pause
      expect(schedule['user_aarav_2026-10-29']).toBe('kit_thu');
      expect(schedule['user_aarav_2026-10-30']).toBe('kit_fri');

      // Paused days have no meal assigned
      expect(schedule['user_aarav_2026-10-31']).toBeUndefined();
      expect(schedule['user_aarav_2026-11-01']).toBeUndefined();
      expect(schedule['user_aarav_2026-11-02']).toBeUndefined();
      expect(schedule['user_aarav_2026-11-03']).toBeUndefined();
      expect(schedule['user_aarav_2026-11-04']).toBeUndefined();

      // Make-up days (2026-11-05 to 2026-11-09) receive the 5 skipped meals daily!
      expect(schedule['user_aarav_2026-11-05']).toBe('kit_sat'); // First skipped meal carries over
      expect(schedule['user_aarav_2026-11-06']).toBe('kit_sun'); // Second skipped meal carries over
      expect(schedule['user_aarav_2026-11-07']).toBe('kit_mon'); // Third skipped meal carries over
      expect(schedule['user_aarav_2026-11-08']).toBe('kit_tue'); // Fourth skipped meal carries over
      expect(schedule['user_aarav_2026-11-09']).toBe('kit_wed'); // Fifth skipped meal carries over
    });

    it('handles non-contiguous paused days cleanly', () => {
      // Pause Friday (Oct 30) and Monday (Nov 2) -> 2 days paused
      // Period extended by 2 days: 2026-10-29 to 2026-11-06
      const schedule = buildShiftedMealSchedule({
        periodStart: '2026-10-29',
        periodEnd: '2026-11-06',
        members: sampleMembers,
        localMeals: sampleLocalMeals,
        pauses: [
          { startDate: '2026-10-30', endDate: '2026-10-30', memberId: null },
          { startDate: '2026-11-02', endDate: '2026-11-02', memberId: null },
        ],
      });

      expect(schedule['user_aarav_2026-10-29']).toBe('kit_thu');
      expect(schedule['user_aarav_2026-10-30']).toBeUndefined(); // Friday paused
      expect(schedule['user_aarav_2026-10-31']).toBe('kit_fri'); // Friday meal delivered Saturday
      expect(schedule['user_aarav_2026-11-01']).toBe('kit_sat');
      expect(schedule['user_aarav_2026-11-02']).toBeUndefined(); // Monday paused
      expect(schedule['user_aarav_2026-11-03']).toBe('kit_sun');
      expect(schedule['user_aarav_2026-11-04']).toBe('kit_mon');
      expect(schedule['user_aarav_2026-11-05']).toBe('kit_tue');
      expect(schedule['user_aarav_2026-11-06']).toBe('kit_wed');
    });

    it('honors manual date-specific kit overrides on carry-over days', () => {
      const customMeals = {
        ...sampleLocalMeals,
        'user_aarav_2026-11-05': 'kit_custom_truffle', // user manually changed recipe on makeup day
      };

      const schedule = buildShiftedMealSchedule({
        periodStart: '2026-10-29',
        periodEnd: '2026-11-05',
        members: sampleMembers,
        localMeals: customMeals,
        pauses: [{ startDate: '2026-10-31', endDate: '2026-10-31', memberId: null }],
      });

      expect(schedule['user_aarav_2026-11-05']).toBe('kit_custom_truffle');
    });
    it('contracts schedule and fulfills meals sequentially when a previously paused day is unpaused', () => {
      // Originally 31 Oct - 4 Nov paused (5 days, period ended Nov 9).
      // Customer unpauses Nov 2. Pauses split into: 31 Oct-1 Nov (2d) and 3 Nov-4 Nov (2d).
      // Period contracts from Nov 9 to Nov 8.
      const schedule = buildShiftedMealSchedule({
        periodStart: '2026-10-29',
        periodEnd: '2026-11-08',
        members: sampleMembers,
        localMeals: sampleLocalMeals,
        pauses: [
          { startDate: '2026-10-31', endDate: '2026-11-01', memberId: null },
          { startDate: '2026-11-03', endDate: '2026-11-04', memberId: null },
        ],
      });

      // Oct 29 & Oct 30 delivered
      expect(schedule['user_aarav_2026-10-29']).toBe('kit_thu');
      expect(schedule['user_aarav_2026-10-30']).toBe('kit_fri');

      // Oct 31 & Nov 1 paused
      expect(schedule['user_aarav_2026-10-31']).toBeUndefined();
      expect(schedule['user_aarav_2026-11-01']).toBeUndefined();

      // Nov 2 unpaused! Receives Saturday's meal
      expect(schedule['user_aarav_2026-11-02']).toBe('kit_sat');

      // Nov 3 & Nov 4 paused
      expect(schedule['user_aarav_2026-11-03']).toBeUndefined();
      expect(schedule['user_aarav_2026-11-04']).toBeUndefined();

      // Make-up days deliver remaining meals sequentially up to contracted period end (Nov 8)
      expect(schedule['user_aarav_2026-11-05']).toBe('kit_sun');
      expect(schedule['user_aarav_2026-11-06']).toBe('kit_mon');
      expect(schedule['user_aarav_2026-11-07']).toBe('kit_tue');
      expect(schedule['user_aarav_2026-11-08']).toBe('kit_wed');

      // Nov 9 is no longer needed or scheduled
      expect(schedule['user_aarav_2026-11-09']).toBeUndefined();
    });
  });
});
