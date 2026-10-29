import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Modal } from '../../framework/ui/Modal';
import { BottomSheet } from '../../framework/ui/BottomSheet';
import { Button } from '../../framework/ui/Button';
import { Badge } from '../../framework/ui/Badge';
import { Icon } from '../../framework/ui/Icon';
import { subscriptionStrings } from '../../framework/subscription/subscriptionStrings';
import { SUBSCRIPTION_PAUSE_CONFIG } from '../../framework/subscription/subscriptionConfig';
import {
  calculateRemainingPauseAllowance,
  isDateLockedForPause,
  isDatePaused,
  validatePauseSelection,
} from '../../framework/services/subscriptionPlans';
import { Subscription, SubscriptionPause } from '../../framework/services/subscriptionService';

export interface SubscriptionPauseCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  subscription: Subscription;
  members?: Array<{ id: string; name: string; isDependent?: boolean }>;
  isFamily?: boolean;
  isOwner?: boolean;
  pauses: SubscriptionPause[];
  onSavePause: (input: {
    startDate: string;
    endDate: string;
    memberId?: string | null;
  }) => Promise<{ success: boolean; error?: string }>;
}

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const SubscriptionPauseCalendarModal: React.FC<SubscriptionPauseCalendarModalProps> = ({
  visible,
  onClose,
  subscription,
  members = [],
  isFamily = false,
  isOwner = true,
  pauses = [],
  onSavePause,
}) => {
  const { colors, radii, shadows } = useTheme();
  const t = subscriptionStrings.pauseCalendar;

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Month navigation: default to subscription period_start or current month
  const initialMonth = useMemo(() => {
    const base = subscription.period_start ? new Date(subscription.period_start) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [subscription.period_start]);

  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calculate allowance
  const allowance = useMemo(() => {
    return calculateRemainingPauseAllowance(
      pauses.map((p) => ({
        startDate: p.start_date,
        endDate: p.end_date,
        daysCount: p.days_count,
      })),
    );
  }, [pauses]);

  // Generate complete month calendar grid (weeks of 7 days)
  const weeks = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Monday-based index: 0=Mon, 1=Tue, ..., 6=Sun
    const firstDayWeekday = (firstDay.getDay() + 6) % 7;

    const subStartStr = subscription.period_start ? subscription.period_start.split('T')[0] : '';
    const subEndStr = subscription.period_end ? subscription.period_end.split('T')[0] : '';

    const allDays: Array<{
      date: Date | null;
      dateStr: string;
      dayNum: number;
      isCurrentMonth: boolean;
      isActiveSubscription: boolean;
      isLocked: boolean;
      isPaused: boolean;
    }> = [];

    // Leading padding for previous month days
    for (let i = 0; i < firstDayWeekday; i++) {
      allDays.push({
        date: null,
        dateStr: '',
        dayNum: 0,
        isCurrentMonth: false,
        isActiveSubscription: false,
        isLocked: true,
        isPaused: false,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isActiveSubscription = Boolean(
        subStartStr && subEndStr && dateStr >= subStartStr && dateStr <= subEndStr,
      );
      const isLocked = isDateLockedForPause(dateObj);
      const isPaused = isDatePaused(
        dateObj,
        pauses.map((p) => ({ startDate: p.start_date, endDate: p.end_date })),
      );

      allDays.push({
        date: dateObj,
        dateStr,
        dayNum: d,
        isCurrentMonth: true,
        isActiveSubscription,
        isLocked,
        isPaused,
      });
    }

    // Trailing padding to complete last row of 7
    const remainder = (7 - (allDays.length % 7)) % 7;
    for (let i = 0; i < remainder; i++) {
      allDays.push({
        date: null,
        dateStr: '',
        dayNum: 0,
        isCurrentMonth: false,
        isActiveSubscription: false,
        isLocked: true,
        isPaused: false,
      });
    }

    // Group into 7-day week rows
    const groupedWeeks: Array<typeof allDays> = [];
    for (let i = 0; i < allDays.length; i += 7) {
      groupedWeeks.push(allDays.slice(i, i + 7));
    }
    return groupedWeeks;
  }, [currentMonth, subscription.period_start, subscription.period_end, pauses]);

  const handleSelectDay = (day: Date, isActiveSub: boolean) => {
    setErrorMessage(null);
    const dateStr = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

    if (!isActiveSub) {
      setErrorMessage('You can only pause days within your active weekly subscription period.');
      return;
    }

    if (isDateLockedForPause(day)) {
      setErrorMessage(
        'This day is within the 48-hour delivery packing cutoff window or in the past.',
      );
      return;
    }

    if (
      isDatePaused(
        day,
        pauses.map((p) => ({ startDate: p.start_date, endDate: p.end_date })),
      )
    ) {
      setErrorMessage('This date is already covered by an existing pause window.');
      return;
    }

    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(dateStr);
      setSelectedEndDate(null);
    } else {
      if (dateStr < selectedStartDate) {
        setSelectedStartDate(dateStr);
        setSelectedEndDate(null);
      } else {
        setSelectedEndDate(dateStr);
      }
    }
  };

  const handleSave = async () => {
    if (!selectedStartDate) {
      setErrorMessage('Please select a start date for the pause window.');
      return;
    }

    const endDate = selectedEndDate || selectedStartDate;

    const validation = validatePauseSelection({
      startDate: selectedStartDate,
      endDate,
      existingPauses: pauses.map((p) => ({
        startDate: p.start_date,
        endDate: p.end_date,
        daysCount: p.days_count,
      })),
      periodStart: subscription.period_start,
      periodEnd: subscription.period_end,
    });

    if (!validation.valid) {
      setErrorMessage(validation.error || 'Invalid pause selection');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await onSavePause({
      startDate: selectedStartDate,
      endDate,
      memberId: selectedMemberId,
    });

    setIsSubmitting(false);

    if (res.success) {
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      onClose();
    } else {
      setErrorMessage(res.error || 'Failed to save pause window.');
    }
  };

  const monthLabel = currentMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const content = (
    <View style={styles.contentWrap}>
      {/* Pause Allowance and Cutoff Info */}
      <View
        style={[
          styles.allowanceCard,
          {
            backgroundColor: colors.bgSurface,
            borderColor: colors.borderLight,
            borderRadius: radii.lg,
          },
        ]}
      >
        <View style={styles.badgesRow}>
          <Badge
            label={t.allowanceBadge(
              allowance.daysUsed,
              SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSED_DAYS_PER_PERIOD,
            )}
            variant={allowance.daysRemaining > 0 ? 'info' : 'danger'}
          />
          <Badge
            label={t.rangesBadge(
              allowance.rangesUsed,
              SUBSCRIPTION_PAUSE_CONFIG.MAX_PAUSE_RANGES_PER_PERIOD,
            )}
            variant={allowance.rangesRemaining > 0 ? 'neutral' : 'danger'}
          />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="lock" size={12} color={colors.textSecondary} />
          <Text style={[styles.cutoffText, { color: colors.textSecondary }]}>{t.cutoffNote}</Text>
        </View>
      </View>

      {/* Family Member Targeting (Owner only) */}
      {isFamily && isOwner && members.length > 0 && (
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.pauseTargetLabel}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.memberChipsRow}
          >
            <TouchableOpacity
              style={[
                styles.memberChip,
                {
                  backgroundColor: selectedMemberId === null ? colors.primary : colors.bgSurface,
                  borderColor: selectedMemberId === null ? colors.primary : colors.borderLight,
                  borderRadius: radii.pill,
                },
              ]}
              onPress={() => setSelectedMemberId(null)}
              testID="pause-target-whole-family"
            >
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: selectedMemberId === null ? colors.textInverse : colors.textPrimary,
                }}
              >
                {t.targetWholeFamily}
              </Text>
            </TouchableOpacity>

            {members.map((m) => {
              const isSelected = selectedMemberId === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.memberChip,
                    {
                      backgroundColor: isSelected ? colors.primary : colors.bgSurface,
                      borderColor: isSelected ? colors.primary : colors.borderLight,
                      borderRadius: radii.pill,
                    },
                  ]}
                  onPress={() => setSelectedMemberId(m.id)}
                  testID={`pause-target-member-${m.id}`}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: isSelected ? colors.textInverse : colors.textPrimary,
                    }}
                  >
                    {m.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Month Navigation & Entire Month Calendar */}
      <View style={styles.sectionWrap}>
        <View style={styles.monthHeaderRow}>
          <TouchableOpacity
            style={[styles.monthNavBtn, { borderColor: colors.borderLight }]}
            onPress={handlePrevMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.monthLabelText, { color: colors.textPrimary }]}>{monthLabel}</Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
              Tap active days to pause (up to {SUBSCRIPTION_PAUSE_CONFIG.MAX_CONSECUTIVE_PAUSE_DAYS}{' '}
              consecutive)
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.monthNavBtn, { borderColor: colors.borderLight }]}
            onPress={handleNextMonth}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-forward" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Weekday Names Header */}
        <View style={styles.weekdayHeaderRow}>
          {WEEKDAY_NAMES.map((name) => (
            <View key={`wh-${name}`} style={styles.weekdayCell}>
              <Text style={[styles.weekdayCellText, { color: colors.textSecondary }]}>{name}</Text>
            </View>
          ))}
        </View>

        {/* Entire Month Grid */}
        <View style={styles.calendarMonthGrid}>
          {weeks.map((week, wIndex) => (
            <View key={`week-${wIndex}`} style={styles.calendarWeekRow}>
              {week.map((item, dIndex) => {
                if (!item.isCurrentMonth || !item.date) {
                  return (
                    <View
                      key={`empty-${wIndex}-${dIndex}`}
                      style={[styles.dayCellWrapper, styles.emptyDayCell]}
                    />
                  );
                }

                const dateStr = item.dateStr;
                const isStart = selectedStartDate === dateStr;
                const isEnd = selectedEndDate === dateStr;
                const isInSelectedRange = Boolean(
                  selectedStartDate &&
                  selectedEndDate &&
                  dateStr >= selectedStartDate &&
                  dateStr <= selectedEndDate,
                );

                let cellBg = colors.bgSurface;
                let cellBorder = colors.borderLight;
                let cellText = colors.textPrimary;

                if (isStart || isEnd) {
                  cellBg = colors.primary;
                  cellBorder = colors.primary;
                  cellText = colors.textInverse;
                } else if (isInSelectedRange) {
                  cellBg = colors.primaryLight;
                  cellBorder = colors.primary;
                  cellText = colors.primaryDark;
                } else if (item.isPaused) {
                  cellBg = colors.bgWarningSubtle;
                  cellBorder = colors.warning;
                  cellText = colors.textWarning;
                } else if (item.isActiveSubscription) {
                  // HIGHLIGHT ACTIVE SUBSCRIPTION DAYS
                  cellBg = colors.bgSuccessSubtle;
                  cellBorder = colors.success;
                  cellText = colors.textSuccess;
                } else if (item.isLocked) {
                  cellBg = colors.bgSubtle;
                  cellText = colors.textMuted;
                }

                const canTap = item.isActiveSubscription && !item.isLocked && !item.isPaused;

                return (
                  <TouchableOpacity
                    key={`day-${dateStr}`}
                    style={[
                      styles.dayCellWrapper,
                      styles.dayCell,
                      {
                        backgroundColor: cellBg,
                        borderColor: cellBorder,
                        borderRadius: radii.sm,
                      },
                    ]}
                    disabled={!canTap}
                    onPress={() => handleSelectDay(item.date!, item.isActiveSubscription)}
                    activeOpacity={0.7}
                    testID={`pause-day-${dateStr}`}
                  >
                    <Text style={[styles.dayCellNum, { color: cellText }]}>{item.dayNum}</Text>

                    {/* Small Status Indicator */}
                    {item.isPaused ? (
                      <Text style={[styles.miniStatusTag, { color: colors.textWarning }]}>
                        Paused
                      </Text>
                    ) : isStart || isEnd ? (
                      <Text style={[styles.miniStatusTag, { color: colors.textInverse }]}>
                        {isStart && isEnd ? 'Selected' : isStart ? 'Start' : 'End'}
                      </Text>
                    ) : item.isActiveSubscription ? (
                      <View style={[styles.activeDot, { backgroundColor: colors.success }]} />
                    ) : item.isLocked ? (
                      <Icon name="lock-closed" size={10} color={colors.textMuted} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Visual Legend */}
        <View
          style={[
            styles.legendCard,
            { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
          ]}
        >
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: colors.bgSuccessSubtle, borderColor: colors.success },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.textPrimary }]}>Active Box</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: colors.bgWarningSubtle, borderColor: colors.warning },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.textPrimary }]}>Paused</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.textPrimary }]}>Selected</Text>
          </View>
          <View style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>Locked</Text>
          </View>
        </View>
      </View>

      {/* Selected Range Display */}
      {selectedStartDate && (
        <View
          style={[
            styles.selectedRangeBox,
            {
              backgroundColor: colors.bgInfoSubtle,
              borderColor: colors.borderInfoSubtle,
              borderRadius: radii.md,
            },
          ]}
        >
          <Icon name="time" size={18} color={colors.info} />
          <Text style={[styles.selectedRangeText, { color: colors.textInfo }]}>
            Selected: {selectedStartDate}
            {selectedEndDate && selectedEndDate !== selectedStartDate
              ? ` to ${selectedEndDate}`
              : ''}
          </Text>
        </View>
      )}

      {/* Error Message */}
      {errorMessage && (
        <View
          style={[
            styles.errorBox,
            {
              backgroundColor: colors.bgDangerSubtle,
              borderColor: colors.borderDangerSubtle,
              borderRadius: radii.md,
            },
          ]}
          testID="pause-error-banner"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Icon name="alert" size={14} color={colors.textDanger} />
            <Text style={[styles.errorText, { color: colors.textDanger }]}>{errorMessage}</Text>
          </View>
        </View>
      )}

      {/* Existing Pauses List */}
      {pauses.length > 0 && (
        <View style={styles.sectionWrap}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.activePausesTitle}
          </Text>
          {pauses.map((p) => (
            <View
              key={p.id}
              style={[
                styles.pauseRow,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderRadius: radii.md,
                },
              ]}
            >
              <View>
                <Text style={[styles.pauseDatesText, { color: colors.textPrimary }]}>
                  {p.start_date} → {p.end_date} ({p.days_count} days)
                </Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                  {p.member_id ? `Member ID: ${p.member_id}` : 'Entire Household'}
                </Text>
              </View>
              <Badge label={t.pausedBadge} variant="warning" size="sm" />
            </View>
          ))}
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Button
          title={t.cancelBtn}
          variant="outline"
          size="md"
          onPress={onClose}
          style={{ flex: 1, marginRight: 8 }}
        />
        <Button
          title={t.confirmPauseBtn}
          variant="primary"
          size="md"
          loading={isSubmitting}
          disabled={
            !selectedStartDate || allowance.daysRemaining <= 0 || allowance.rangesRemaining <= 0
          }
          onPress={handleSave}
          style={{ flex: 2 }}
          testID="confirm-save-pause-btn"
        />
      </View>
    </View>
  );

  if (Platform.OS === 'web') {
    return (
      <Modal visible={visible} onClose={onClose} title={t.modalTitle} subtitle={t.modalSubtitle}>
        <ScrollView style={{ maxHeight: 600 }}>{content}</ScrollView>
      </Modal>
    );
  }

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t.modalTitle}
      subtitle={t.modalSubtitle}
    >
      {content}
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  contentWrap: {
    padding: 16,
  },
  allowanceCard: {
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  cutoffText: {
    fontSize: 12,
    lineHeight: 16,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 8,
  },
  memberChipsRow: {
    flexDirection: 'row',
  },
  memberChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthNavBtn: {
    padding: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  monthLabelText: {
    fontSize: 15,
    fontWeight: '800',
  },
  weekdayHeaderRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayCellText: {
    fontSize: 11,
    fontWeight: '700',
  },
  calendarMonthGrid: {
    marginBottom: 12,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCellWrapper: {
    flex: 1,
    marginHorizontal: 2,
    height: 46,
  },
  emptyDayCell: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  dayCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingVertical: 3,
  },
  dayCellNum: {
    fontSize: 12,
    fontWeight: '700',
  },
  miniStatusTag: {
    fontSize: 8,
    fontWeight: '700',
    marginTop: 1,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 2,
  },
  legendCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '600',
  },
  selectedRangeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 14,
    gap: 8,
  },
  selectedRangeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorBox: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pauseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  pauseDatesText: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
});
