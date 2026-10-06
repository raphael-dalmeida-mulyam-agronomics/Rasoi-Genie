import React, { useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { StructuredStep } from '../types';
import { SAMPLE_STEP_IMAGES } from '../sampleImages';

interface Step3CookingStepsProps {
  steps: StructuredStep[];
  onChange: (steps: StructuredStep[]) => void;
}

export function Step3CookingSteps({ steps, onChange }: Step3CookingStepsProps) {
  const { colors } = useTheme();

  // Web file input refs indexed by step index
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  const handleAddStep = () => {
    const nextNumber = steps.length + 1;
    const newStep: StructuredStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      stepNumber: nextNumber,
      title: '',
      instruction: '',
      imageUrl: '',
    };
    onChange([...steps, newStep]);
  };

  const handleUpdateStep = (
    idx: number,
    field: keyof StructuredStep,
    value: any,
  ) => {
    const updated = steps.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
    onChange(updated);
  };

  const handleRemoveStep = (idx: number) => {
    const filtered = steps
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, stepNumber: i + 1 }));
    onChange(filtered);
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...steps];
    const temp = updated[idx - 1]!;
    updated[idx - 1] = updated[idx]!;
    updated[idx] = temp;
    // Renumber
    onChange(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const handleMoveDown = (idx: number) => {
    if (idx === steps.length - 1) return;
    const updated = [...steps];
    const temp = updated[idx + 1]!;
    updated[idx + 1] = updated[idx]!;
    updated[idx] = temp;
    // Renumber
    onChange(updated.map((s, i) => ({ ...s, stepNumber: i + 1 })));
  };

  const handleFileUpload = (idx: number, e: any) => {
    const file = e.target?.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          handleUpdateStep(idx, 'imageUrl', result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const padStepNumber = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <View style={styles.container}>
      {/* SECTION: Header info */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.headerRow}>
          <View>
            <View style={styles.titleBadgeRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Cooking Instructions
              </Text>
              <View style={styles.stepCountBadge}>
                <Text style={styles.stepCountText}>{steps.length} Steps</Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Every cooking step requires clear culinary instructions and a step photo.
            </Text>
          </View>

          <TouchableOpacity
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
          style={[
            styles.card,
            { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
          ]}
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
              >
                <Icon name="arrow-up" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleMoveDown(idx)}
                disabled={idx === steps.length - 1}
                style={[
                  styles.stepOrderBtn,
                  { opacity: idx === steps.length - 1 ? 0.3 : 1 },
                ]}
              >
                <Icon name="arrow-down" size={14} color={colors.textSecondary} />
              </TouchableOpacity>
              {steps.length > 1 && (
                <TouchableOpacity
                  onPress={() => handleRemoveStep(idx)}
                  style={[styles.stepDeleteBtn, { borderColor: '#FECACA' }]}
                >
                  <Icon name="trash-outline" size={14} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Title & Instruction inputs */}
          <View style={styles.stepFormCol}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                Step Title
              </Text>
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

            {/* Step Image (REQUIRED on every step) */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelWithRequired}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>
                  Step Image
                </Text>
                <View style={styles.requiredMiniBadge}>
                  <Text style={styles.requiredMiniText}>Required</Text>
                </View>
              </View>
              <Text style={[styles.fieldHelper, { color: colors.textMuted }]}>
                Photo illustrating this specific cooking technique or stage.
              </Text>

              {step.imageUrl ? (
                <View style={styles.stepImageWrapper}>
                  <Image source={{ uri: step.imageUrl }} style={styles.stepImagePreview} />
                  <View style={styles.imageOverlayRow}>
                    <TouchableOpacity
                      style={[styles.overlayBtn, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
                      onPress={() => {
                        if (Platform.OS === 'web' && fileInputRefs.current[idx]) {
                          fileInputRefs.current[idx]?.click();
                        }
                      }}
                    >
                      <Icon name="create-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.overlayBtnText}>Replace Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.overlayBtn, { backgroundColor: 'rgba(239,68,68,0.85)' }]}
                      onPress={() => handleUpdateStep(idx, 'imageUrl', '')}
                    >
                      <Icon name="trash-outline" size={13} color="#FFFFFF" />
                      <Text style={styles.overlayBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.stepImageUploadArea}>
                  <TouchableOpacity
                    style={[
                      styles.stepUploadBox,
                      { backgroundColor: colors.bgSubtle, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      if (Platform.OS === 'web' && fileInputRefs.current[idx]) {
                        fileInputRefs.current[idx]?.click();
                      }
                    }}
                  >
                    <Icon name="camera-outline" size={24} color={colors.primary} />
                    <Text style={[styles.stepUploadText, { color: colors.textPrimary }]}>
                      Upload Step {idx + 1} Photo
                    </Text>
                    <Text style={[styles.stepUploadHint, { color: colors.textMuted }]}>
                      JPG or PNG
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
                          onPress={() => handleUpdateStep(idx, 'imageUrl', sample.url)}
                        >
                          <Image source={{ uri: sample.url }} style={styles.miniStepPresetImg} />
                          <Text style={[styles.miniStepPresetText, { color: colors.textSecondary }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  stepCountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stepCountText: {
    color: '#B45309',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  addStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addStepBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
    backgroundColor: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDeleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepFormCol: {
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  labelWithRequired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  requiredStar: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '700',
  },
  requiredMiniBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  requiredMiniText: {
    color: '#B45309',
    fontSize: 10,
    fontWeight: '700',
  },
  fieldHelper: {
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  stepImageWrapper: {
    position: 'relative',
    borderRadius: 10,
    overflow: 'hidden',
    height: 180,
    width: '100%',
    maxWidth: 400,
  },
  stepImagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlayRow: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    gap: 6,
  },
  overlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 400,
  },
  stepUploadText: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 6,
  },
  stepUploadHint: {
    fontSize: 11,
    marginTop: 2,
  },
  stepPresetsRow: {
    marginTop: 4,
  },
  stepPresetsLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
  },
  presetOptionsWrap: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  miniStepPreset: {
    width: 70,
    borderWidth: 1.5,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    padding: 2,
  },
  miniStepPresetImg: {
    width: '100%',
    height: 42,
    borderRadius: 4,
  },
  miniStepPresetText: {
    fontSize: 9,
    marginTop: 2,
    textAlign: 'center',
  },
  bottomAddBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bottomAddBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
