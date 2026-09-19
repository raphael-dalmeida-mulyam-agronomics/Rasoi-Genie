import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, Alert } from 'react-native';
import { MealKit } from '../../framework/services/mealKitsService';
import { addReview } from '../../framework/services/reviewsService';
import { useAuth } from '../../framework/context/AuthContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { RatingStars } from '../../framework/ui/RatingStars';
import { Button } from '../../framework/ui/Button';

export interface ReviewModalProps {
  kit: MealKit | null;
  visible: boolean;
  onClose: () => void;
  onReviewSubmitted?: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  kit,
  visible,
  onClose,
  onReviewSubmitted,
}) => {
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { colors, radii, shadows } = useTheme();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!kit) return null;

  const handleSubmit = async () => {
    if (!comment.trim()) {
      Alert.alert('Review Required', 'Please share a brief review of your cooking experience.');
      return;
    }

    setSubmitting(true);
    try {
      const userName = user?.displayName || user?.email?.split('@')[0] || 'Gourmet Chef';
      const userId = user?.uid || 'guest-user';

      addReview(
        kit.id,
        kit.name,
        userId,
        userName,
        preferences.currentCity || '',
        rating,
        comment.trim(),
        photoUrl.trim() || undefined,
      );

      Alert.alert(
        'Review Shared! ⭐',
        'Thank you for rating this meal kit. Your feedback helps our chefs improve!',
      );
      setComment('');
      setPhotoUrl('');
      onReviewSubmitted?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.bgSurface,
              borderRadius: radii.xl,
              ...shadows.card,
            },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Rate & Review</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                {kit.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeBtnText, { color: colors.textMuted }]}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.body}>
            <Text style={[styles.label, { color: colors.textPrimary }]}>
              How would you rate the taste & ease?
            </Text>
            <View style={styles.ratingRow}>
              <RatingStars rating={rating} size={30} interactive onRatingChange={setRating} />
            </View>

            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 16 }]}>
              Your Review Feedback
            </Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.borderLight,
                  borderRadius: radii.md,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Tell others about the aroma, masala intensity, and whether your family enjoyed it!"
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
            />

            <Text style={[styles.label, { color: colors.textPrimary, marginTop: 14 }]}>
              Add Photo URL (Optional)
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.borderLight,
                  borderRadius: radii.md,
                  color: colors.textPrimary,
                },
              ]}
              placeholder="Paste dish image link (e.g. Unsplash / photo link)"
              placeholderTextColor={colors.textMuted}
              value={photoUrl}
              onChangeText={setPhotoUrl}
            />

            <View style={styles.actionRow}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: 10 }}
                onPress={onClose}
              />
              <Button
                title="Submit Review"
                style={{ flex: 1.5 }}
                loading={submitting}
                onPress={handleSubmit}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 18,
    fontWeight: '700',
  },
  body: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  ratingRow: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  textArea: {
    borderWidth: 1.5,
    padding: 12,
    height: 90,
    textAlignVertical: 'top',
    fontSize: 14,
  },
  input: {
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 42,
    fontSize: 14,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
});
