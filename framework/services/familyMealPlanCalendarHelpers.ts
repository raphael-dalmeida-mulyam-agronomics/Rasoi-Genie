import { FamilyMember } from './familyService';
import { MealKit } from './mealKitsService';
import { checkDietaryConflict } from '../family/dietaryConflicts';
import { isDateLockedForPause, isDatePaused } from './subscriptionPlans';

export interface CalendarDayItem {
  date: Date | null;
  dateStr: string; // YYYY-MM-DD
  dayNum: number;
  weekdayShort: string; // e.g. "Thu"
  weekdayFull: string; // e.g. "Thursday"
  weekdayIndex: number; // 0=Mon, 6=Sun
  isCurrentMonth: boolean;
  isToday: boolean;
  isInsidePeriod: boolean;
  isPaused: boolean;
  isLocked: boolean;
}

export interface BuildMonthGridParams {
  year: number;
  month: number; // 0-indexed (0 = Jan, 11 = Dec)
  periodStart?: string | Date | null;
  periodEnd?: string | Date | null;
  today?: Date | string;
  pauses?: Array<{ startDate: string; endDate: string }>;
}

export interface MonthGridResult {
  year: number;
  month: number;
  monthLabel: string; // e.g. "October 2026"
  daysInMonth: number;
  weeks: CalendarDayItem[][];
  totalDays: number;
}

const SHORT_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_WEEKDAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * Normalizes date to 0=Mon ... 6=Sun.
 */
export function getWeekdayIndex(date: Date): number {
  // In JS Date: 0=Sun, 1=Mon, ..., 6=Sat
  return (date.getDay() + 6) % 7;
}

/**
 * Formats a Date into local YYYY-MM-DD.
 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Pure helper: Builds the full month calendar grid divided into 7-day week rows starting on Monday.
 * Accurately calculates month boundaries, leap years, padding, period boundaries, today, and paused states.
 */
export function buildMonthCalendarGrid(params: BuildMonthGridParams): MonthGridResult {
  const { year, month } = params;
  const todayObj = params.today ? new Date(params.today) : new Date();
  const todayStr = formatDateKey(todayObj);

  const startStr = params.periodStart
    ? typeof params.periodStart === 'string'
      ? params.periodStart.split('T')[0]!
      : formatDateKey(params.periodStart)
    : null;

  const endStr = params.periodEnd
    ? typeof params.periodEnd === 'string'
      ? params.periodEnd.split('T')[0]!
      : formatDateKey(params.periodEnd)
    : null;

  const pauses = params.pauses || [];

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  const firstDayWeekday = getWeekdayIndex(firstDayOfMonth); // 0=Mon, 6=Sun

  const flatDays: CalendarDayItem[] = [];

  // 1. Leading padding for previous month days
  for (let i = 0; i < firstDayWeekday; i++) {
    flatDays.push({
      date: null,
      dateStr: '',
      dayNum: 0,
      weekdayShort: SHORT_WEEKDAYS[i] || '',
      weekdayFull: FULL_WEEKDAYS[i] || '',
      weekdayIndex: i,
      isCurrentMonth: false,
      isToday: false,
      isInsidePeriod: false,
      isPaused: false,
      isLocked: true,
    });
  }

  // 2. Days in the current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    const dateStr = formatDateKey(dateObj);
    const wIndex = getWeekdayIndex(dateObj);
    const isToday = dateStr === todayStr;

    // Check if within active subscription period
    const isInsidePeriod = Boolean(startStr && endStr && dateStr >= startStr && dateStr <= endStr);
    const isPaused = isDatePaused(dateObj, pauses);
    const isLocked = isDateLockedForPause(dateObj, todayObj);

    flatDays.push({
      date: dateObj,
      dateStr,
      dayNum: d,
      weekdayShort: SHORT_WEEKDAYS[wIndex] || '',
      weekdayFull: FULL_WEEKDAYS[wIndex] || '',
      weekdayIndex: wIndex,
      isCurrentMonth: true,
      isToday,
      isInsidePeriod,
      isPaused,
      isLocked,
    });
  }

  // 3. Trailing padding to complete last row of 7
  const remainder = (7 - (flatDays.length % 7)) % 7;
  for (let i = 0; i < remainder; i++) {
    const trailingWIndex = (firstDayWeekday + daysInMonth + i) % 7;
    flatDays.push({
      date: null,
      dateStr: '',
      dayNum: 0,
      weekdayShort: SHORT_WEEKDAYS[trailingWIndex] || '',
      weekdayFull: FULL_WEEKDAYS[trailingWIndex] || '',
      weekdayIndex: trailingWIndex,
      isCurrentMonth: false,
      isToday: false,
      isInsidePeriod: false,
      isPaused: false,
      isLocked: true,
    });
  }

  // Group into 7-day rows
  const weeks: CalendarDayItem[][] = [];
  for (let i = 0; i < flatDays.length; i += 7) {
    weeks.push(flatDays.slice(i, i + 7));
  }

  const monthLabel = firstDayOfMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return {
    year,
    month,
    monthLabel,
    daysInMonth,
    weeks,
    totalDays: flatDays.length,
  };
}

export interface DayMemberMealItem {
  member: FamilyMember;
  kit?: MealKit;
  hasConflict: boolean;
  conflictReasons: string[];
  isPaused?: boolean;
  isFamilyPause?: boolean;
  pauseId?: string;
}

export interface MapMealsForDayParams {
  members: FamilyMember[];
  localMeals: Record<string, string>; // key: `${member_id}_${weekdayIndex}`
  weekdayIndex: number;
  getMealKitById: (id: string) => MealKit | undefined;
  filterToMemberId?: string | null;
  pauses?: Array<{ id?: string; startDate: string; endDate: string; memberId?: string | null }>;
  currentDate?: Date | string | null;
}

export interface DayMealsSummary {
  allMemberMeals: DayMemberMealItem[];
  assignedMeals: DayMemberMealItem[]; // Only members who have a kit assigned
  visibleMeals: DayMemberMealItem[]; // Up to 3 for thumbnail display
  overflowCount: number; // Extra members with kits beyond 3
  hasAnyConflict: boolean;
}

/**
 * Pure helper: Maps meal assignments for a day cell across covered members.
 * Supports non-owner member filtering and computes overflow (+N) and clash indicators.
 */
export function mapMealsForDay(params: MapMealsForDayParams): DayMealsSummary {
  const { members, localMeals, weekdayIndex, getMealKitById, filterToMemberId } = params;

  const targetMembers = filterToMemberId
    ? members.filter((m) => m.user_id === filterToMemberId)
    : members;

  const allMemberMeals: DayMemberMealItem[] = targetMembers.map((member) => {
    const kitId = localMeals[`${member.user_id}_${weekdayIndex}`];
    const kit = kitId ? getMealKitById(kitId) : undefined;
    const conflict = kit ? checkDietaryConflict(member, kit) : { hasConflict: false, reasons: [] };

    let isPaused = false;
    let isFamilyPause = false;
    let pauseId: string | undefined = undefined;

    if (params.currentDate && params.pauses) {
      const dateStr =
        typeof params.currentDate === 'string'
          ? params.currentDate.split('T')[0]!
          : formatDateKey(params.currentDate);

      const matchingPause = params.pauses.find((p) => {
        const coversDate = dateStr >= p.startDate && dateStr <= p.endDate;
        const coversMember =
          p.memberId === null || p.memberId === undefined || p.memberId === member.user_id;
        return coversDate && coversMember;
      });

      if (matchingPause) {
        isPaused = true;
        pauseId = matchingPause.id;
        isFamilyPause = !matchingPause.memberId;
      }
    }

    return {
      member,
      kit,
      hasConflict: conflict.hasConflict,
      conflictReasons: conflict.reasons,
      isPaused,
      isFamilyPause,
      pauseId,
    };
  });

  const assignedMeals = allMemberMeals.filter((item) => Boolean(item.kit));
  const visibleMeals = assignedMeals.slice(0, 3);
  const overflowCount = Math.max(0, assignedMeals.length - 3);
  const hasAnyConflict = assignedMeals.some((item) => item.hasConflict);

  return {
    allMemberMeals,
    assignedMeals,
    visibleMeals,
    overflowCount,
    hasAnyConflict,
  };
}

/**
 * Formats accessible label for a calendar day cell.
 * E.g. "29 October, Thursday, 3 meals" or "29 October, Thursday, paused"
 */
export function formatDayAccessibilityLabel(
  date: Date,
  mealCount: number,
  isPaused: boolean = false,
  hasConflict: boolean = false,
): string {
  const day = date.getDate();
  const month = date.toLocaleDateString('en-IN', { month: 'long' });
  const weekday = date.toLocaleDateString('en-IN', { weekday: 'long' });

  const mealPart =
    mealCount === 0 ? 'No meals assigned' : `${mealCount} meal${mealCount > 1 ? 's' : ''}`;

  let label = `${day} ${month}, ${weekday}, ${mealPart}`;
  if (isPaused) {
    label += ', deliveries paused';
  }
  if (hasConflict) {
    label += ', dietary clash warning';
  }
  return label;
}
