import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { DraftStatus } from '../useChefDraft';

interface ChefStudioHeaderProps {
  isEditing: boolean;
  draftStatus: DraftStatus;
  lastSavedTime: string | null;
  onBack: () => void;
  onSaveDraftNow?: () => void;
  onDiscardDraft?: () => void;
}

export function ChefStudioHeader({
  isEditing,
  draftStatus,
  lastSavedTime,
  onBack,
  onSaveDraftNow,
  onDiscardDraft,
}: ChefStudioHeaderProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderBottomColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.leftRow}>
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { borderColor: colors.borderLight, backgroundColor: colors.bgSubtle }]}
          accessibilityLabel="Back to Recipes"
        >
          <Icon name="arrow-back" size={18} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.titleCol}>
          <View style={styles.breadcrumbRow}>
            <Text style={[styles.breadcrumbText, { color: colors.textMuted }]}>Chef Studio</Text>
            <Text style={[styles.breadcrumbDivider, { color: colors.textMuted }]}>/</Text>
            <Text style={[styles.breadcrumbCurrent, { color: colors.primary }]}>
              {isEditing ? 'Edit Recipe' : 'Create Recipe'}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {isEditing ? 'Edit Meal Kit Recipe' : 'New Meal Kit Recipe'}
          </Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        {/* Draft status indicator */}
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor:
                draftStatus === 'saving'
                  ? colors.bgSubtle
                  : draftStatus === 'saved'
                  ? '#ECFDF5'
                  : colors.bgSubtle,
              borderColor:
                draftStatus === 'saved' ? '#A7F3D0' : colors.borderLight,
            },
          ]}
        >
          {draftStatus === 'saving' && (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 6 }} />
          )}
          {draftStatus === 'saved' && (
            <Icon name="checkmark-circle" size={14} color="#059669" style={{ marginRight: 6 }} />
          )}
          <Text
            style={[
              styles.statusText,
              {
                color:
                  draftStatus === 'saving'
                    ? colors.textMuted
                    : draftStatus === 'saved'
                    ? '#065F46'
                    : colors.textSecondary,
              },
            ]}
          >
            {draftStatus === 'saving'
              ? 'Saving draft...'
              : draftStatus === 'saved'
              ? lastSavedTime
                ? `Draft saved at ${lastSavedTime}`
                : 'Draft saved'
              : 'Auto-save enabled'}
          </Text>
        </View>

        {onSaveDraftNow && (
          <TouchableOpacity
            onPress={onSaveDraftNow}
            style={[styles.actionBtn, { borderColor: colors.borderLight }]}
          >
            <Icon name="bookmark-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Save</Text>
          </TouchableOpacity>
        )}

        {onDiscardDraft && (
          <TouchableOpacity
            onPress={onDiscardDraft}
            style={[styles.actionBtn, { borderColor: colors.borderLight }]}
          >
            <Text style={[styles.actionBtnText, { color: colors.danger }]}>Clear Draft</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleCol: {
    justifyContent: 'center',
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  breadcrumbText: {
    fontSize: 12,
    fontWeight: '500',
  },
  breadcrumbDivider: {
    fontSize: 12,
  },
  breadcrumbCurrent: {
    fontSize: 12,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
