import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { StructuredStep, InstructionType } from '../types';
import { SAMPLE_STEP_IMAGES } from '../sampleImages';
import * as ImagePicker from 'expo-image-picker';
import { ImageEditorModal } from '../../../framework/ui/ImageEditorModal';
import { YouTubeEmbed, extractYouTubeVideoId, isValidYouTubeUrl } from './YouTubeEmbed';

interface Step3CookingStepsProps {
  steps: StructuredStep[];
  instructionType?: InstructionType;
  videoUrl?: string;
  onChange?: (steps: StructuredStep[]) => void;
  onStepsChange?: (steps: StructuredStep[]) => void;
  onInstructionTypeChange?: (type: InstructionType) => void;
  onVideoUrlChange?: (url: string) => void;
}

export function Step3CookingSteps({
  steps,
  instructionType = 'steps',
  videoUrl = '',
  onChange,
  onStepsChange,
  onInstructionTypeChange,
  onVideoUrlChange,
}: Step3CookingStepsProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const handleStepsUpdate = (newSteps: StructuredStep[]) => {
    if (onStepsChange) onStepsChange(newSteps);
    if (onChange) onChange(newSteps);
  };

  // Web file input refs indexed by step index
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editingImageUri, setEditingImageUri] = useState<string | null>(null);
  const [stepAspectRatios, setStepAspectRatios] = useState<Record<string, number>>({});

  // Dynamically measure step image natural aspect ratio
  useEffect(() => {
    let isMounted = true;
    steps.forEach((step, idx) => {
      const key = step.id || String(idx);
      if (!step.imageUrl || stepAspectRatios[key]) return;

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const img = new (window as any).Image();
        img.onload = () => {
          if (isMounted && img.naturalWidth && img.naturalHeight) {
            const ratio = img.naturalWidth / img.naturalHeight;
            setStepAspectRatios((prev) => (prev[key] === ratio ? prev : { ...prev, [key]: ratio }));
          }
        };
        img.src = step.imageUrl;
      } else if (typeof Image.getSize === 'function') {
        try {
          Image.getSize(
            step.imageUrl,
            (w, h) => {
              if (isMounted && w && h) {
                const ratio = w / h;
                setStepAspectRatios((prev) =>
                  prev[key] === ratio ? prev : { ...prev, [key]: ratio },
                );
              }
            },
            () => {},
          );
        } catch {}
      }
    });

    return () => {
      isMounted = false;
    };
  }, [steps]);

  const videoId = extractYouTubeVideoId(videoUrl);
  const isVideoValid = !!videoId;

  const handlePickOrUpload = async (idx: number) => {
    if (Platform.OS === 'web' && fileInputRefs.current[idx]) {
      fileInputRefs.current[idx]?.click();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0]?.uri;
        if (uri) {
          handleUpdateStep(idx, 'originalImageUrl', uri);
          setEditingStepIndex(idx);
          setEditingImageUri(uri);
        }
      }
    } catch (err) {
      console.warn('[Step3CookingSteps] Image pick error:', err);
    }
  };

  const handleAddStep = () => {
    const nextNumber = steps.length + 1;
    const newStep: StructuredStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stepNumber: nextNumber,
      title: '',
      instruction: '',
      imageUrl: '',
    };
    handleStepsUpdate([...steps, newStep]);
  };

  const handleUpdateStep = (idx: number, field: keyof StructuredStep, value: any) => {
    const updated = steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    handleStepsUpdate(updated);
  };

  const handleRemoveStep = (idx: number) => {
    const filtered = steps.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 }));
    handleStepsUpdate(filtered);
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...steps];
    const temp = updated[idx - 1]!;
    updated[idx - 1] = updated[idx]!;
    updated[idx] = temp;
    handleStepsUpdate(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const handleMoveDown = (idx: number) => {
    if (idx === steps.length - 1) return;
    const updated = [...steps];
    const temp = updated[idx + 1]!;
    updated[idx + 1] = updated[idx]!;
    updated[idx] = temp;
    handleStepsUpdate(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const handleFileUpload = (idx: number, e: any) => {
    const file = e.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          handleUpdateStep(idx, 'originalImageUrl', result);
          setEditingStepIndex(idx);
          setEditingImageUri(result);
        }
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    }
  };

  const padStepNumber = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <View style={styles.container}>
      {/* ── SECTION 1: YouTube Video Walkthrough ── */}
      <View
        style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}
      >
        <View style={styles.videoSectionHeader}>
          <View style={styles.videoHeaderLeft}>
            <View style={[styles.youtubeIconBadge, { backgroundColor: '#FEE2E2' }]}>
              <Icon name="logo-youtube" size={20} color="#DC2626" />
            </View>
            <View>
              <Text style={[styles.videoSectionTitle, { color: colors.textPrimary }]}>
                Embedded YouTube Video
              </Text>
              <Text style={[styles.videoSectionSubtitle, { color: colors.textSecondary }]}>
                Provide the link to your official YouTube cooking walkthrough
              </Text>
            </View>
          </View>

          {/* Validity indicator */}
          {videoUrl.trim().length > 0 && (
            <View
              style={[
                styles.validityBadge,
                {
                  backgroundColor: isVideoValid ? '#DCFCE7' : '#FEE2E2',
                  borderColor: isVideoValid ? '#86EFAC' : '#FCA5A5',
                },
              ]}
            >
              <Icon
                name={isVideoValid ? 'checkmark-circle' : 'alert-circle'}
                size={14}
                color={isVideoValid ? '#15803D' : '#DC2626'}
              />
              <Text style={[styles.validityText, { color: isVideoValid ? '#15803D' : '#DC2626' }]}>
                {isVideoValid ? `Valid Video ID: ${videoId}` : 'Invalid YouTube Link'}
              </Text>
            </View>
          )}
        </View>

        {/* Desktop 2-column or Mobile stack for Video Input + Player Preview */}
        <View style={[styles.videoContentLayout, isDesktop && styles.videoContentLayoutDesktop]}>
          {/* Left Column: Input and Helpers */}
          <View style={[styles.videoInputCol, isDesktop && { flex: 1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
              YouTube Video URL <Text style={styles.requiredStar}>*</Text>
            </Text>
            <View
              style={[
                styles.urlInputRow,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: isVideoValid
                    ? colors.primary
                    : videoUrl.trim()
                      ? '#EF4444'
                      : colors.borderLight,
                },
              ]}
            >
              <Icon name="link-outline" size={18} color={colors.textMuted} />
              <TextInput
                testID="chef-youtube-url-input"
                value={videoUrl}
                onChangeText={(text) => onVideoUrlChange?.(text)}
                placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.urlInput, { color: colors.textPrimary }]}
              />
              {videoUrl.length > 0 && (
                <TouchableOpacity
                  onPress={() => onVideoUrlChange?.('')}
                  style={styles.clearBtn}
                  accessibilityLabel="Clear video URL"
                >
                  <Icon name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.urlHelperText, { color: colors.textMuted }]}>
              Supports standard watch links, youtu.be short URLs, and YouTube Shorts.
            </Text>

            <View
              style={[
                styles.videoGuidelineBox,
                { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
              ]}
            >
              <Text style={[styles.guidelineTitle, { color: colors.textPrimary }]}>
                Video Best Practices:
              </Text>
              <Text style={[styles.guidelineItem, { color: colors.textSecondary }]}>
                • Ensure high audio clarity for ingredient measurements and flame changes.
              </Text>
              <Text style={[styles.guidelineItem, { color: colors.textSecondary }]}>
                • Show closeup angles of masala aroma frying and simmering gravies.
              </Text>
              <Text style={[styles.guidelineItem, { color: colors.textSecondary }]}>
                • Mention stovetop heat adjustments (Low, Medium-High) clearly.
              </Text>
            </View>
          </View>

          {/* Right Column: Embedded Player Preview */}
          <View style={[styles.videoPreviewCol, isDesktop && { flex: 1.1 }]}>
            <Text style={[styles.fieldLabel, { color: colors.textPrimary, marginBottom: 8 }]}>
              Live Player Preview
            </Text>
            <YouTubeEmbed
              videoUrl={videoUrl}
              title="Chef Recipe Video Preview"
              height={isDesktop ? 260 : 200}
            />
          </View>
        </View>
      </View>

      {/* ── SECTION 2: Step-by-Step Cooking Cards ── */}
      <View
        style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Step-by-Step Cooking Cards
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Each step requires clear instructions describing flame, timings, and sensory cues,
              plus an illustrative photo.
            </Text>
          </View>

          <TouchableOpacity
            testID="chef-add-step-btn"
            style={[styles.addStepBtn, { backgroundColor: colors.primary }]}
            onPress={handleAddStep}
          >
            <Icon name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addStepBtnText}>+ Add Cooking Step</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Steps List */}
      {steps.map((step, idx) => (
        <View
          key={step.id || idx}
          style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.borderLight }]}
        >
          {/* Step Card Header */}
          <View style={styles.stepCardHeader}>
            <View style={styles.stepNumberBadge}>
              <Text style={styles.stepNumberText}>STEP {padStepNumber(idx + 1)}</Text>
            </View>

            <View style={styles.stepCardControls}>
              <TouchableOpacity
                onPress={() => handleMoveUp(idx)}
                disabled={idx === 0}
                style={[styles.stepOrderBtn, { opacity: idx === 0 ? 0.3 : 1 }]}
                accessibilityLabel="Move step up"
              >
                <Icon name="arrow-up" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMoveDown(idx)}
                disabled={idx === steps.length - 1}
                style={[styles.stepOrderBtn, { opacity: idx === steps.length - 1 ? 0.3 : 1 }]}
                accessibilityLabel="Move step down"
              >
                <Icon name="arrow-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              {steps.length > 1 && (
                <TouchableOpacity
                  onPress={() => handleRemoveStep(idx)}
                  style={[styles.stepDeleteBtn, { borderColor: '#FECACA' }]}
                  accessibilityLabel="Delete step"
                >
                  <Icon name="trash-outline" size={14} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Title & Instruction inputs */}
          <View style={styles.stepFormCol}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Step Title</Text>
              <TextInput
                value={step.title}
                onChangeText={(text) => handleUpdateStep(idx, 'title', text)}
                placeholder={`e.g. ${
                  idx === 0
                    ? 'Prep & Marinate Ingredients'
                    : idx === 1
                      ? 'Sauté Whole Spices & Aromatics'
                      : 'Simmer and Garnish'
                }`}
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSubtle,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.labelWithRequired}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                  Cooking Instructions
                </Text>
                <Text style={styles.requiredStar}>*</Text>
              </View>
              <TextInput
                testID={idx === 0 ? 'chef-step-instruction-0' : undefined}
                value={step.instruction}
                onChangeText={(text) => handleUpdateStep(idx, 'instruction', text)}
                placeholder="Describe this technique precisely: heat level, flame, color change, timing, and sensory cues..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[
                  styles.textArea,
                  {
                    backgroundColor: colors.bgSubtle,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
              />
            </View>

            {/* Step Image */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithRequired}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Step Image</Text>
                <View style={styles.requiredMiniBadge}>
                  <Text style={styles.requiredMiniText}>Required</Text>
                </View>
              </View>
              <Text style={[styles.fieldHelper, { color: colors.textMuted }]}>
                Photo illustrating this specific cooking technique or stage.
              </Text>

              {step.imageUrl ? (
                <View
                  style={[
                    styles.stepImageWrapper,
                    {
                      aspectRatio: stepAspectRatios[step.id || String(idx)] || 16 / 9,
                      height: undefined,
                      maxHeight:
                        (stepAspectRatios[step.id || String(idx)] || 16 / 9) < 1 ? 400 : 340,
                    },
                  ]}
                >
                  <Image source={{ uri: step.imageUrl }} style={styles.stepImagePreview} />
                  <View style={styles.imageOverlayRow}>
                    <TouchableOpacity
                      testID={`step-crop-adjust-btn-${idx}`}
                      style={[styles.overlayBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setEditingStepIndex(idx);
                        setEditingImageUri(step.originalImageUrl || step.imageUrl);
                      }}
                    >
                      <Icon name="crop" size={13} color="#FFFFFF" />
                      <Text style={styles.overlayBtnText}>Crop & Adjust</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`step-replace-photo-btn-${idx}`}
                      style={[styles.overlayBtn, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
                      onPress={() => handlePickOrUpload(idx)}
                    >
                      <Icon name="create-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.overlayBtnText}>Replace Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      testID={`step-remove-photo-btn-${idx}`}
                      style={[styles.overlayBtn, { backgroundColor: 'rgba(239,68,68,0.85)' }]}
                      onPress={() => {
                        const updated = steps.map((s, i) =>
                          i === idx ? { ...s, imageUrl: '', originalImageUrl: '' } : s,
                        );
                        handleStepsUpdate(updated);
                      }}
                    >
                      <Icon name="trash-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.overlayBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.stepImageUploadArea}>
                  <TouchableOpacity
                    testID={`step-upload-box-${idx}`}
                    style={[
                      styles.stepUploadBox,
                      { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                    ]}
                    onPress={() => handlePickOrUpload(idx)}
                  >
                    <Icon name="camera-outline" size={24} color={colors.primary} />
                    <Text style={[styles.stepUploadText, { color: colors.textPrimary }]}>
                      Upload Step {idx + 1} Photo
                    </Text>
                    <Text style={[styles.stepUploadHint, { color: colors.textMuted }]}>
                      JPG or PNG (Crop, rotate & enhance enabled)
                    </Text>
                  </TouchableOpacity>

                  {/* Sample step photo presets */}
                  <View style={styles.stepPresetsRow}>
                    <Text style={[styles.stepPresetsLabel, { color: colors.textMuted }]}>
                      Or select sample step photo:
                    </Text>
                    <View style={styles.presetOptionsWrap}>
                      {SAMPLE_STEP_IMAGES.map((sample) => (
                        <TouchableOpacity
                          key={sample.id}
                          style={[
                            styles.miniStepPreset,
                            {
                              borderColor:
                                step.imageUrl === sample.url ? colors.primary : 'transparent',
                            },
                          ]}
                          onPress={() => {
                            const updated = steps.map((s, i) =>
                              i === idx
                                ? { ...s, imageUrl: sample.url, originalImageUrl: sample.url }
                                : s,
                            );
                            handleStepsUpdate(updated);
                          }}
                        >
                          <Image source={{ uri: sample.url }} style={styles.miniStepPresetImg} />
                          <Text
                            style={[styles.miniStepPresetText, { color: colors.textSecondary }]}
                          >
                            {sample.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              )}

              {/* Hidden file input for web */}
              {Platform.OS === 'web' && (
                <input
                  type="file"
                  ref={(el) => {
                    fileInputRefs.current[idx] = el;
                  }}
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => handleFileUpload(idx, e)}
                />
              )}
            </View>
          </View>
        </View>
      ))}

      {/* Bottom Add Step Button */}
      <TouchableOpacity
        style={[
          styles.bottomAddBtn,
          { borderColor: colors.primary, backgroundColor: colors.primaryLight },
        ]}
        onPress={handleAddStep}
      >
        <Icon name="add" size={18} color={colors.primary} />
        <Text style={[styles.bottomAddBtnText, { color: colors.primary }]}>
          Add Another Cooking Step
        </Text>
      </TouchableOpacity>

      {/* Reusable Image Crop, Rotate & Adjust Modal */}
      <ImageEditorModal
        visible={editingStepIndex !== null && !!editingImageUri}
        imageUri={editingImageUri}
        title={`Crop, Rotate & Adjust Step ${editingStepIndex !== null ? editingStepIndex + 1 : ''} Photo`}
        defaultAspectRatio="1:1"
        onSave={(editedUri, meta) => {
          if (editingStepIndex !== null) {
            const current = steps[editingStepIndex];
            const original = current?.originalImageUrl || editingImageUri || editedUri;
            const updated = steps.map((s, i) =>
              i === editingStepIndex
                ? { ...s, imageUrl: editedUri, originalImageUrl: original }
                : s,
            );
            handleStepsUpdate(updated);

            if (meta?.aspectRatio) {
              const key = current?.id || String(editingStepIndex);
              setStepAspectRatios((prev) => ({ ...prev, [key]: meta.aspectRatio }));
            }
          }
          setEditingStepIndex(null);
          setEditingImageUri(null);
        }}
        onCancel={() => {
          setEditingStepIndex(null);
          setEditingImageUri(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    maxWidth: 1160,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap',
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 680,
  },
  stepCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  modeTabsRow: {
    flexDirection: 'column',
    gap: 12,
    marginTop: 18,
  },
  modeTabsRowDesktop: {
    flexDirection: 'row',
  },
  modeTab: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  modeTabTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  modeIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeTagText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  modeTitle: {
    fontSize: 15,
  },
  modeSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  videoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  videoHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  youtubeIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  videoSectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  validityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  validityText: {
    fontSize: 12,
    fontWeight: '700',
  },
  videoContentLayout: {
    flexDirection: 'column',
    gap: 18,
  },
  videoContentLayoutDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  videoInputCol: {
    gap: 8,
  },
  videoPreviewCol: {
    width: '100%',
  },
  urlInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  urlInput: {
    flex: 1,
    fontSize: 13,
  },
  clearBtn: {
    padding: 4,
  },
  urlHelperText: {
    fontSize: 11,
    lineHeight: 15,
  },
  videoGuidelineBox: {
    marginTop: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  guidelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  guidelineItem: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  videoOnlyNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  videoNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  videoNoticeText: {
    fontSize: 12,
    lineHeight: 17,
  },
  addStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addStepBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  stepCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stepNumberBadge: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  stepCardControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepOrderBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  stepDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
  },
  stepFormCol: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  requiredStar: {
    color: '#EF4444',
  },
  labelWithRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  requiredMiniBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  requiredMiniText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  fieldHelper: {
    fontSize: 12,
  },
  input: {
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  textArea: {
    minHeight: 76,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
  },
  stepImageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  stepImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlayRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  overlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  overlayBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  stepImageUploadArea: {
    gap: 10,
  },
  stepUploadBox: {
    width: '100%',
    height: 120,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: 12,
  },
  stepUploadText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepUploadHint: {
    fontSize: 11,
  },
  stepPresetsRow: {
    gap: 6,
  },
  stepPresetsLabel: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  presetOptionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  miniStepPreset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 4,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: '#FFFFFF',
  },
  miniStepPresetImg: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  miniStepPresetText: {
    fontSize: 11,
    fontWeight: '600',
    paddingRight: 6,
  },
  bottomAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  bottomAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
