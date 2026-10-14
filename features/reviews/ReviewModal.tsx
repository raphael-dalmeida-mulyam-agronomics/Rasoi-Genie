import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { MealKit } from '../../framework/services/mealKitsService';
import { addReview, hasUserReviewedRecently } from '../../framework/services/reviewsService';
import { useAuth } from '../../framework/context/AuthContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { RatingStars } from '../../framework/ui/RatingStars';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';

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
  const [pickingImage, setPickingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!kit) return null;

  const handlePickImage = async () => {
    try {
      setPickingImage(true);
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Needed',
            'Please grant photo library access to upload a picture of your dish.',
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset?.uri) {
          setPhotoUrl(selectedAsset.uri);
        }
      }
    } catch (err: any) {
      console.warn('[ReviewModal] Failed to pick image:', err);
      Alert.alert('Image Selection', 'Could not open photo library. Please try again.');
    } finally {
      setPickingImage(false);
    }
  };

  const handleTakePhoto = async () => {
    try {
      setPickingImage(true);
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Camera Permission Needed',
            'Please grant camera access to snap a photo of your cooked dish.',
          );
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        if (selectedAsset?.uri) {
          setPhotoUrl(selectedAsset.uri);
        }
      }
    } catch (err: any) {
      console.warn('[ReviewModal] Failed to take photo:', err);
      Alert.alert('Camera Error', 'Could not access camera. Please try again.');
    } finally {
      setPickingImage(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const userName = user?.displayName || user?.email?.split('@')[0] || 'Gourmet Chef';
      const userId = user?.uid || 'guest-user';

      // Duplicate prevention: check if this user has already reviewed this kit recently
      if (hasUserReviewedRecently(kit.id, userId, 60)) {
        Alert.alert(
          'Already Reviewed',
          'You have already published a review for this meal kit recently. Thank you!',
        );
        onReviewSubmitted?.();
        onClose();
        if (!onReviewSubmitted) {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)' as any);
          }
        }
        return;
      }

      addReview(
        kit.id,
        kit.name,
        userId,
        userName,
        preferences.currentCity || '',
        rating,
        comment.trim() || undefined,
        photoUrl.trim() || undefined,
      );

      Alert.alert(
        'Review Published! ⭐',
        'Thank you for rating this meal kit. Your feedback inspires our culinary team!',
      );

      setComment('');
      setPhotoUrl('');
      onReviewSubmitted?.();
      onClose();

      if (!onReviewSubmitted) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)' as any);
        }
      }
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
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Rate & Review</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{kit.name}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            <View style={styles.body}>
              {/* Star Rating Section - Mandatory part, user can submit with star alone */}
              <Text style={[styles.label, { color: colors.textPrimary }]}>
                How would you rate this recipe?
              </Text>
              <View style={styles.ratingRow}>
                <RatingStars rating={rating} size={34} interactive onRatingChange={setRating} />
                <Text style={[styles.ratingLabelText, { color: colors.primary }]}>
                  {rating === 5
                    ? 'Outstanding! ⭐⭐⭐⭐⭐'
                    : rating === 4
                      ? 'Very Tasty! ⭐⭐⭐⭐'
                      : rating === 3
                        ? 'Good Experience ⭐⭐⭐'
                        : rating === 2
                          ? 'Could Be Better ⭐⭐'
                          : 'Needs Improvement ⭐'}
                </Text>
              </View>

              {/* Image Upload Feature */}
              <Text style={[styles.label, { color: colors.textPrimary, marginTop: 14 }]}>
                Add Dish Photo (Optional)
              </Text>

              {photoUrl ? (
                /* Uploaded Photo Preview Card */
                <View
                  style={[
                    styles.previewContainer,
                    {
                      borderColor: colors.borderLight,
                      borderRadius: radii.lg,
                      backgroundColor: colors.bgSubtle,
                    },
                  ]}
                >
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  <View style={styles.previewActions}>
                    <TouchableOpacity
                      style={[styles.previewActionBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={handlePickImage}
                      activeOpacity={0.8}
                    >
                      <Icon name="camera-outline" size={14} color={colors.primary} />
                      <Text style={[styles.previewActionText, { color: colors.primary }]}>
                        Change
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.previewActionBtn, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => setPhotoUrl('')}
                      activeOpacity={0.8}
                    >
                      <Icon name="trash-outline" size={14} color="#EF4444" />
                      <Text style={[styles.previewActionText, { color: '#EF4444' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                /* Image Upload Dropzone & Action Buttons */
                <View style={styles.uploadBox}>
                  <TouchableOpacity
                    style={[
                      styles.dropzone,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderColor: colors.borderLight,
                        borderRadius: radii.lg,
                      },
                    ]}
                    onPress={handlePickImage}
                    disabled={pickingImage}
                    activeOpacity={0.7}
                  >
                    {pickingImage ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <View
                          style={[
                            styles.uploadIconCircle,
                            { backgroundColor: colors.primaryLight + '50' },
                          ]}
                        >
                          <Icon name="cloud-upload-outline" size={26} color={colors.primary} />
                        </View>
                        <Text style={[styles.uploadPrompt, { color: colors.textPrimary }]}>
                          Upload Plated Dish Photo
                        </Text>
                        <Text style={[styles.uploadSubtext, { color: colors.textMuted }]}>
                          Show off your freshly cooked masterpiece!
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <View style={styles.pickerButtonsRow}>
                    <TouchableOpacity
                      style={[
                        styles.pickerBtn,
                        { borderColor: colors.borderLight, backgroundColor: colors.bgSubtle },
                      ]}
                      onPress={handlePickImage}
                    >
                      <Icon name="images-outline" size={16} color={colors.primary} />
                      <Text style={[styles.pickerBtnText, { color: colors.textPrimary }]}>
                        Photo Library
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.pickerBtn,
                        { borderColor: colors.borderLight, backgroundColor: colors.bgSubtle },
                      ]}
                      onPress={handleTakePhoto}
                    >
                      <Icon name="camera-outline" size={16} color={colors.primary} />
                      <Text style={[styles.pickerBtnText, { color: colors.textPrimary }]}>
                        Take Photo
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Review Feedback Text Input - Completely OPTIONAL */}
              <Text style={[styles.label, { color: colors.textPrimary, marginTop: 16 }]}>
                Cooking Feedback (Optional)
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
                placeholder="Optional: Share any personal touch, aroma notes, or cooking ease tips..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={setComment}
              />

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  style={{ flex: 1, marginRight: 10 }}
                  onPress={onClose}
                />
                <Button
                  title="Publish Review"
                  style={{ flex: 1.5 }}
                  loading={submitting}
                  onPress={handleSubmit}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
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
  bodyScroll: {
    maxHeight: 520,
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
    paddingVertical: 6,
    alignItems: 'center',
  },
  ratingLabelText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  uploadBox: {
    marginTop: 2,
  },
  dropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadPrompt: {
    fontSize: 14,
    fontWeight: '700',
  },
  uploadSubtext: {
    fontSize: 11,
    marginTop: 2,
  },
  pickerButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 8,
  },
  pickerBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  previewContainer: {
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 160,
  },
  previewActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    padding: 8,
  },
  previewActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  previewActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textArea: {
    borderWidth: 1.5,
    padding: 12,
    height: 80,
    textAlignVertical: 'top',
    fontSize: 13,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 18,
  },
});
