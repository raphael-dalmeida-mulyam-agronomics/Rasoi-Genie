import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { ChefStudioStage } from '../types';

interface StickyBottomBarProps {
  currentStage: ChefStudioStage;
  canProceed: boolean;
  submitting?: boolean;
  isEditing?: boolean;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
}

export function StickyBottomBar({
  currentStage,
  canProceed,
  submitting = false,
  isEditing = false,
  onBack,
  onNext,
  onSubmit,
}: StickyBottomBarProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderTopColor: colors.borderLight,
        },
      ]}
    >
      <View style={styles.contentWrap}>
        {/* Back / Previous Button */}
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backBtn, { borderColor: colors.borderLight, backgroundColor: colors.bgSubtle }]}
          activeOpacity={0.8}
        >
          <Icon name="arrow-back" size={16} color={colors.textPrimary} />
          <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>
            {currentStage === 'details' ? 'Back to Submissions' : 'Previous Step'}
          </Text>
        </TouchableOpacity>

        {/* Next / Submit Button */}
        {currentStage === 'details' && (
          <TouchableOpacity
            testID="chef-next-recipe-btn"
            id="chef-next-recipe-btn"
            onPress={onNext}
            disabled={!canProceed}
            style={[
              styles.nextBtn,
              {
                backgroundColor: canProceed ? colors.primary : '#9CA3AF',
              },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>Continue to Ingredients</Text>
            <Icon name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {currentStage === 'ingredients' && (
          <TouchableOpacity
            testID="chef-next-steps-btn"
            id="chef-next-steps-btn"
            onPress={onNext}
            disabled={!canProceed}
            style={[
              styles.nextBtn,
              {
                backgroundColor: canProceed ? colors.primary : '#9CA3AF',
              },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>Continue to Cooking Steps</Text>
            <Icon name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {currentStage === 'steps' && (
          <TouchableOpacity
            testID="chef-next-review-btn"
            id="chef-next-review-btn"
            onPress={onNext}
            disabled={!canProceed}
            style={[
              styles.nextBtn,
              {
                backgroundColor: canProceed ? colors.primary : '#9CA3AF',
              },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.nextBtnText}>Continue to Review</Text>
            <Icon name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {currentStage === 'review' && (
          <TouchableOpacity
            testID="chef-submit-recipe-btn-sticky"
            onPress={onSubmit}
            disabled={!canProceed || submitting}
            style={[
              styles.nextBtn,
              {
                backgroundColor: canProceed ? colors.primary : '#9CA3AF',
                opacity: submitting ? 0.7 : 1,
              },
            ]}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {isEditing ? 'Update & Submit for Review' : 'Submit for Admin Review'}
                </Text>
                <Icon name="paper-plane" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  contentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 10,
  },
  nextBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
