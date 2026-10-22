import React, { useState, useEffect, useRef } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

export type AspectRatioPreset = '4:3' | '1:1' | '16:9' | '3:4' | 'free';

export interface ImageEditorModalProps {
  visible: boolean;
  imageUri: string | null;
  title?: string;
  defaultAspectRatio?: AspectRatioPreset;
  onSave: (editedUri: string) => void;
  onCancel: () => void;
}

interface ImageAdjustmentState {
  rotation: number; // 0, 90, 180, 270 degrees
  fineAngle: number; // -45 to +45 degrees
  flipH: boolean;
  flipV: boolean;
  aspectRatio: AspectRatioPreset;
  zoom: number; // 1.0 to 3.0
  brightness: number; // 50 to 150 (100 is default)
  contrast: number; // 50 to 150 (100 is default)
  saturation: number; // 0 to 200 (100 is default)
  warmth: number; // -30 to +30 (0 is default)
}

const DEFAULT_ADJUSTMENTS: ImageAdjustmentState = {
  rotation: 0,
  fineAngle: 0,
  flipH: false,
  flipV: false,
  aspectRatio: '4:3',
  zoom: 1.0,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
};

const ASPECT_RATIO_VALUES: Record<AspectRatioPreset, number | null> = {
  '4:3': 4 / 3,
  '1:1': 1,
  '16:9': 16 / 9,
  '3:4': 3 / 4,
  free: null,
};

type ActiveTab = 'crop' | 'rotate' | 'adjust';

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  visible,
  imageUri,
  title = 'Crop, Rotate & Adjust Photo',
  defaultAspectRatio = '4:3',
  onSave,
  onCancel,
}) => {
  let themeValues: any;
  try {
    themeValues = useTheme();
  } catch {
    themeValues = {
      colors: {
        bgSurface: '#FFFFFF',
        bgSubtle: '#F9FAFB',
        borderLight: '#E5E7EB',
        border: '#D1D5DB',
        textPrimary: '#111827',
        textSecondary: '#4B5563',
        textMuted: '#9CA3AF',
        primary: '#E11D48',
        primaryLight: '#FFE4E6',
      },
      radii: { pill: 9999, xl: 16 },
      shadows: { card: {} },
      isDark: false,
    };
  }
  const { colors, radii, shadows, isDark } = themeValues;

  const [activeTab, setActiveTab] = useState<ActiveTab>('crop');
  const [adjustments, setAdjustments] = useState<ImageAdjustmentState>({
    ...DEFAULT_ADJUSTMENTS,
    aspectRatio: defaultAspectRatio,
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }>({
    width: 800,
    height: 600,
  });

  const prevVisibleRef = useRef(visible);
  const prevUriRef = useRef(imageUri);

  // Reset state when opening a new image
  useEffect(() => {
    const isOpening = visible && !prevVisibleRef.current;
    const isImageChanged = visible && prevUriRef.current !== imageUri;

    prevVisibleRef.current = visible;
    prevUriRef.current = imageUri;

    if (isOpening || isImageChanged) {
      setAdjustments({
        ...DEFAULT_ADJUSTMENTS,
        aspectRatio: defaultAspectRatio,
      });
      setActiveTab('crop');

      // Fetch natural image size if available
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const img = new (window as any).Image();
        img.onload = () => {
          setImageDimensions({
            width: img.naturalWidth || 800,
            height: img.naturalHeight || 600,
          });
        };
        img.src = imageUri;
      }
    }
  }, [visible, imageUri, defaultAspectRatio]);

  const handleRotate90 = (clockwise = true) => {
    setAdjustments((prev) => ({
      ...prev,
      rotation: (prev.rotation + (clockwise ? 90 : 270)) % 360,
    }));
  };

  const handleToggleFlipH = () => {
    setAdjustments((prev) => ({ ...prev, flipH: !prev.flipH }));
  };

  const handleToggleFlipV = () => {
    setAdjustments((prev) => ({ ...prev, flipV: !prev.flipV }));
  };

  const handleReset = () => {
    setAdjustments({
      ...DEFAULT_ADJUSTMENTS,
      aspectRatio: defaultAspectRatio,
    });
  };

  // Preset Filters
  const applyPresetFilter = (presetName: string) => {
    switch (presetName) {
      case 'vibrant':
        setAdjustments((prev) => ({
          ...prev,
          contrast: 118,
          saturation: 135,
          brightness: 104,
          warmth: 8,
        }));
        break;
      case 'warm':
        setAdjustments((prev) => ({
          ...prev,
          contrast: 110,
          saturation: 115,
          brightness: 108,
          warmth: 20,
        }));
        break;
      case 'crisp':
        setAdjustments((prev) => ({
          ...prev,
          contrast: 125,
          saturation: 110,
          brightness: 102,
          warmth: -6,
        }));
        break;
      case 'moody':
        setAdjustments((prev) => ({
          ...prev,
          contrast: 130,
          saturation: 95,
          brightness: 92,
          warmth: 12,
        }));
        break;
      case 'normal':
      default:
        setAdjustments((prev) => ({
          ...prev,
          contrast: 100,
          saturation: 100,
          brightness: 100,
          warmth: 0,
        }));
        break;
    }
  };

  // Perform Final Canvas Export (Web & Native Fallback)
  const handleApplyAndSave = async () => {
    if (!imageUri) return;
    setIsProcessing(true);

    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const renderedDataUrl = await new Promise<string>((resolve) => {
          const img = new (window as any).Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                resolve(imageUri);
                return;
              }

              const targetAspect = ASPECT_RATIO_VALUES[adjustments.aspectRatio];
              const srcWidth = img.naturalWidth || img.width || 800;
              const srcHeight = img.naturalHeight || img.height || 600;

              let cropWidth = srcWidth;
              let cropHeight = srcHeight;

              if (targetAspect) {
                if (srcWidth / srcHeight > targetAspect) {
                  cropWidth = srcHeight * targetAspect;
                  cropHeight = srcHeight;
                } else {
                  cropWidth = srcWidth;
                  cropHeight = srcWidth / targetAspect;
                }
              }

              // Apply zoom: decrease effective crop region window
              const effectiveCropW = cropWidth / adjustments.zoom;
              const effectiveCropH = cropHeight / adjustments.zoom;

              // Output dimensions (capped for optimal balance between speed and crisp catalog fidelity)
              const maxDim = 1200;
              let outWidth = cropWidth;
              let outHeight = cropHeight;
              if (outWidth > maxDim || outHeight > maxDim) {
                if (outWidth >= outHeight) {
                  outHeight = Math.round((outHeight * maxDim) / outWidth);
                  outWidth = maxDim;
                } else {
                  outWidth = Math.round((outWidth * maxDim) / outHeight);
                  outHeight = maxDim;
                }
              }

              canvas.width = Math.max(100, Math.round(outWidth));
              canvas.height = Math.max(100, Math.round(outHeight));

              // Compute Total Rotation in Radians
              const totalAngleDeg = (adjustments.rotation + adjustments.fineAngle) % 360;
              const angleRad = (totalAngleDeg * Math.PI) / 180;

              ctx.save();

              // Move origin to center of canvas
              ctx.translate(canvas.width / 2, canvas.height / 2);

              // Apply Rotation & Flips
              ctx.rotate(angleRad);
              ctx.scale(adjustments.flipH ? -1 : 1, adjustments.flipV ? -1 : 1);

              // Apply CSS Filters (Brightness, Contrast, Saturation)
              const filterParts = [
                `brightness(${adjustments.brightness}%)`,
                `contrast(${adjustments.contrast}%)`,
                `saturate(${adjustments.saturation}%)`,
              ];
              if (adjustments.warmth !== 0) {
                // Approximate warmth with slight sepia and hue-rotate
                if (adjustments.warmth > 0) {
                  filterParts.push(`sepia(${Math.min(40, adjustments.warmth * 1.2)}%)`);
                } else {
                  filterParts.push(`hue-rotate(${adjustments.warmth}deg)`);
                }
              }
              ctx.filter = filterParts.join(' ');

              // Draw image centered
              const drawW = canvas.width * (srcWidth / effectiveCropW) * adjustments.zoom;
              const drawH = canvas.height * (srcHeight / effectiveCropH) * adjustments.zoom;

              ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
              ctx.restore();

              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
              resolve(dataUrl);
            } catch (canvasErr) {
              console.warn('[ImageEditorModal] Canvas processing fallback:', canvasErr);
              resolve(imageUri);
            }
          };
          img.onerror = () => resolve(imageUri);
          img.src = imageUri;
        });

        onSave(renderedDataUrl);
      } else {
        // Native / headless test fallback
        onSave(imageUri);
      }
    } catch (err) {
      console.warn('[ImageEditorModal] Error applying edits:', err);
      onSave(imageUri);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible || !imageUri) return null;

  // Compute live visual style transforms for container & image
  const totalAngle = (adjustments.rotation + adjustments.fineAngle) % 360;
  const targetAspectVal = ASPECT_RATIO_VALUES[adjustments.aspectRatio] ?? 4 / 3;

  const imageTransformStyle = {
    transform: [
      { rotate: `${totalAngle}deg` },
      { scaleX: adjustments.flipH ? -1 : 1 },
      { scaleY: adjustments.flipV ? -1 : 1 },
      { scale: adjustments.zoom },
    ],
    // Web CSS filter string for ultra smooth real-time feedback
    ...(Platform.OS === 'web'
      ? ({
          filter: `brightness(${adjustments.brightness}%) contrast(${adjustments.contrast}%) saturate(${adjustments.saturation}%)`,
        } as any)
      : {}),
  };

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      testID="image-editor-modal"
    >
      <View style={styles.backdrop}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: colors.bgSurface,
              borderColor: colors.borderLight,
              ...shadows.card,
            },
          ]}
        >
          {/* Header Bar */}
          <View style={[styles.headerBar, { borderBottomColor: colors.borderLight }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.headerIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Icon name="crop" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{title}</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                  Frame, rotate, and enhance your recipe photo
                </Text>
              </View>
            </View>

            <View style={styles.headerRight}>
              <TouchableOpacity
                testID="image-editor-reset-btn"
                style={[styles.resetBtn, { borderColor: colors.borderLight }]}
                onPress={handleReset}
              >
                <Icon name="undo" size={14} color={colors.textSecondary} />
                <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                testID="image-editor-cancel-btn"
                style={styles.closeBtn}
                onPress={onCancel}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Interactive Live Viewport */}
          <View style={[styles.viewportOuter, { backgroundColor: '#0B0F17' }]}>
            <View
              style={[
                styles.cropFrame,
                {
                  aspectRatio: targetAspectVal,
                  borderColor: colors.primary,
                },
              ]}
              testID="image-editor-crop-frame"
            >
              {/* Corner Guide Markers */}
              <View
                style={[styles.cornerGuide, styles.cornerTL, { borderColor: colors.primary }]}
              />
              <View
                style={[styles.cornerGuide, styles.cornerTR, { borderColor: colors.primary }]}
              />
              <View
                style={[styles.cornerGuide, styles.cornerBL, { borderColor: colors.primary }]}
              />
              <View
                style={[styles.cornerGuide, styles.cornerBR, { borderColor: colors.primary }]}
              />

              {/* Rule of Thirds Grid Lines */}
              <View style={styles.gridLineH1} />
              <View style={styles.gridLineH2} />
              <View style={styles.gridLineV1} />
              <View style={styles.gridLineV2} />

              {/* The Live Rendered Image */}
              <Image
                testID="image-editor-preview"
                source={{ uri: imageUri }}
                style={[styles.previewImage, imageTransformStyle]}
                resizeMode="cover"
              />

              {/* Aspect Ratio Badge overlay */}
              <View style={styles.aspectBadge}>
                <Text style={styles.aspectBadgeText}>
                  {adjustments.aspectRatio === 'free' ? 'Freeform' : adjustments.aspectRatio}
                </Text>
              </View>
            </View>
          </View>

          {/* Tab Navigation */}
          <View style={[styles.tabBar, { borderBottomColor: colors.borderLight }]}>
            <TouchableOpacity
              testID="image-editor-tab-crop"
              style={[
                styles.tabItem,
                activeTab === 'crop' && [
                  styles.activeTabItem,
                  { borderBottomColor: colors.primary },
                ],
              ]}
              onPress={() => setActiveTab('crop')}
            >
              <Icon
                name="crop"
                size={16}
                color={activeTab === 'crop' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'crop' ? colors.primary : colors.textMuted },
                ]}
              >
                1. Crop & Frame
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="image-editor-tab-rotate"
              style={[
                styles.tabItem,
                activeTab === 'rotate' && [
                  styles.activeTabItem,
                  { borderBottomColor: colors.primary },
                ],
              ]}
              onPress={() => setActiveTab('rotate')}
            >
              <Icon
                name="rotate"
                size={16}
                color={activeTab === 'rotate' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'rotate' ? colors.primary : colors.textMuted },
                ]}
              >
                2. Rotate & Flip
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="image-editor-tab-adjust"
              style={[
                styles.tabItem,
                activeTab === 'adjust' && [
                  styles.activeTabItem,
                  { borderBottomColor: colors.primary },
                ],
              ]}
              onPress={() => setActiveTab('adjust')}
            >
              <Icon
                name="adjust"
                size={16}
                color={activeTab === 'adjust' ? colors.primary : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  { color: activeTab === 'adjust' ? colors.primary : colors.textMuted },
                ]}
              >
                3. Adjust & Enhance
              </Text>
            </TouchableOpacity>
          </View>

          {/* Controls Panel (Contextual to Active Tab) */}
          <ScrollView
            style={styles.controlsScroll}
            contentContainerStyle={styles.controlsContent}
            showsVerticalScrollIndicator={false}
          >
            {/* TAB 1: CROP & FRAME */}
            {activeTab === 'crop' && (
              <View style={styles.panelSection}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Select Aspect Ratio:
                </Text>
                <View style={styles.aspectPillRow}>
                  {[
                    { key: '4:3' as AspectRatioPreset, label: '4:3 Hero', hint: 'Recommended' },
                    { key: '1:1' as AspectRatioPreset, label: '1:1 Square', hint: 'Standard' },
                    { key: '16:9' as AspectRatioPreset, label: '16:9 Wide', hint: 'Cinematic' },
                    { key: '3:4' as AspectRatioPreset, label: '3:4 Portrait', hint: 'Mobile' },
                    { key: 'free' as AspectRatioPreset, label: 'Freeform', hint: 'Auto' },
                  ].map((preset) => {
                    const isSelected = adjustments.aspectRatio === preset.key;
                    return (
                      <TouchableOpacity
                        key={preset.key}
                        testID={`image-editor-aspect-${preset.key}`}
                        style={[
                          styles.aspectPill,
                          {
                            backgroundColor: isSelected ? colors.primaryLight : colors.bgSubtle,
                            borderColor: isSelected ? colors.primary : colors.borderLight,
                          },
                        ]}
                        onPress={() =>
                          setAdjustments((prev) => ({ ...prev, aspectRatio: preset.key }))
                        }
                      >
                        <Text
                          style={[
                            styles.aspectPillTitle,
                            { color: isSelected ? colors.primary : colors.textPrimary },
                          ]}
                        >
                          {preset.label}
                        </Text>
                        <Text style={[styles.aspectPillHint, { color: colors.textMuted }]}>
                          {preset.hint}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Zoom Level Control */}
                <View style={[styles.sliderCard, { backgroundColor: colors.bgSubtle }]}>
                  <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>
                      Zoom & Scale
                    </Text>
                    <Text style={[styles.sliderValue, { color: colors.primary }]}>
                      {adjustments.zoom.toFixed(1)}x
                    </Text>
                  </View>
                  <View style={styles.buttonSliderRow}>
                    <TouchableOpacity
                      testID="image-editor-zoom-out"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({ ...p, zoom: Math.max(1.0, p.zoom - 0.2) }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>−</Text>
                    </TouchableOpacity>

                    <View style={styles.zoomTrack}>
                      <View
                        style={[
                          styles.zoomProgress,
                          {
                            backgroundColor: colors.primary,
                            width: `${((adjustments.zoom - 1.0) / 2.0) * 100}%`,
                          },
                        ]}
                      />
                    </View>

                    <TouchableOpacity
                      testID="image-editor-zoom-in"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({ ...p, zoom: Math.min(3.0, p.zoom + 0.2) }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 2: ROTATE & FLIP */}
            {activeTab === 'rotate' && (
              <View style={styles.panelSection}>
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Quick Orientation:
                </Text>
                <View style={styles.rotateActionsRow}>
                  <TouchableOpacity
                    testID="image-editor-rotate-left"
                    style={[
                      styles.rotateBtn,
                      { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                    ]}
                    onPress={() => handleRotate90(false)}
                  >
                    <Icon name="rotate-left" size={20} color={colors.primary} />
                    <Text style={[styles.rotateBtnLabel, { color: colors.textPrimary }]}>
                      Rotate −90°
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="image-editor-rotate-right"
                    style={[
                      styles.rotateBtn,
                      { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                    ]}
                    onPress={() => handleRotate90(true)}
                  >
                    <Icon name="rotate-right" size={20} color={colors.primary} />
                    <Text style={[styles.rotateBtnLabel, { color: colors.textPrimary }]}>
                      Rotate +90°
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="image-editor-flip-h"
                    style={[
                      styles.rotateBtn,
                      {
                        backgroundColor: adjustments.flipH ? colors.primaryLight : colors.bgSubtle,
                        borderColor: adjustments.flipH ? colors.primary : colors.borderLight,
                      },
                    ]}
                    onPress={handleToggleFlipH}
                  >
                    <Icon
                      name="flip"
                      size={20}
                      color={adjustments.flipH ? colors.primary : colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.rotateBtnLabel,
                        { color: adjustments.flipH ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      Flip Horiz
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    testID="image-editor-flip-v"
                    style={[
                      styles.rotateBtn,
                      {
                        backgroundColor: adjustments.flipV ? colors.primaryLight : colors.bgSubtle,
                        borderColor: adjustments.flipV ? colors.primary : colors.borderLight,
                      },
                    ]}
                    onPress={handleToggleFlipV}
                  >
                    <Icon
                      name="expand"
                      size={20}
                      color={adjustments.flipV ? colors.primary : colors.textPrimary}
                    />
                    <Text
                      style={[
                        styles.rotateBtnLabel,
                        { color: adjustments.flipV ? colors.primary : colors.textPrimary },
                      ]}
                    >
                      Flip Vert
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Fine Angle Straighten */}
                <View
                  style={[styles.sliderCard, { backgroundColor: colors.bgSubtle, marginTop: 12 }]}
                >
                  <View style={styles.sliderHeader}>
                    <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>
                      Fine Angle Alignment
                    </Text>
                    <Text
                      testID="image-editor-fine-angle-value"
                      style={[styles.sliderValue, { color: colors.primary }]}
                    >
                      {adjustments.fineAngle > 0
                        ? `+${adjustments.fineAngle}°`
                        : `${adjustments.fineAngle}°`}
                    </Text>
                  </View>

                  <View style={styles.buttonSliderRow}>
                    <TouchableOpacity
                      testID="image-editor-angle-minus"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({ ...p, fineAngle: Math.max(-45, p.fineAngle - 2) }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>−</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      testID="image-editor-angle-reset"
                      style={[styles.fineResetBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() => setAdjustments((p) => ({ ...p, fineAngle: 0 }))}
                    >
                      <Text style={[styles.fineResetText, { color: colors.textMuted }]}>
                        0° (Level)
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      testID="image-editor-angle-plus"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({ ...p, fineAngle: Math.min(45, p.fineAngle + 2) }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* TAB 3: ADJUST & ENHANCE */}
            {activeTab === 'adjust' && (
              <View style={styles.panelSection}>
                {/* One-touch Food Presets */}
                <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                  Chef Food Enhancements:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.presetScroll}
                >
                  {[
                    { id: 'normal', label: 'Original', desc: 'No Filter' },
                    { id: 'vibrant', label: '✨ Vibrant Curry', desc: '+Contrast & Saturation' },
                    { id: 'warm', label: '🔥 Golden Tandoor', desc: '+Warm Amber Glow' },
                    { id: 'crisp', label: '🥗 Fresh & Crisp', desc: 'Crisp High Clarity' },
                    { id: 'moody', label: '🍽️ Moody Gourmet', desc: 'Deep Rich Shadows' },
                  ].map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      testID={`image-editor-preset-${preset.id}`}
                      style={[
                        styles.presetCard,
                        {
                          backgroundColor: colors.bgSubtle,
                          borderColor: colors.borderLight,
                        },
                      ]}
                      onPress={() => applyPresetFilter(preset.id)}
                    >
                      <Text style={[styles.presetCardTitle, { color: colors.textPrimary }]}>
                        {preset.label}
                      </Text>
                      <Text style={[styles.presetCardDesc, { color: colors.textMuted }]}>
                        {preset.desc}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Brightness Slider */}
                <View
                  style={[styles.sliderCard, { backgroundColor: colors.bgSubtle, marginTop: 12 }]}
                >
                  <View style={styles.sliderHeader}>
                    <View style={styles.sliderLabelRow}>
                      <Icon name="brightness" size={15} color={colors.primary} />
                      <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>
                        Brightness
                      </Text>
                    </View>
                    <Text style={[styles.sliderValue, { color: colors.primary }]}>
                      {adjustments.brightness}%
                    </Text>
                  </View>
                  <View style={styles.buttonSliderRow}>
                    <TouchableOpacity
                      testID="image-editor-bright-minus"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({
                          ...p,
                          brightness: Math.max(50, p.brightness - 5),
                        }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>−</Text>
                    </TouchableOpacity>
                    <View style={styles.zoomTrack}>
                      <View
                        style={[
                          styles.zoomProgress,
                          {
                            backgroundColor: colors.primary,
                            width: `${((adjustments.brightness - 50) / 100) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <TouchableOpacity
                      testID="image-editor-bright-plus"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({
                          ...p,
                          brightness: Math.min(150, p.brightness + 5),
                        }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Contrast Slider */}
                <View
                  style={[styles.sliderCard, { backgroundColor: colors.bgSubtle, marginTop: 8 }]}
                >
                  <View style={styles.sliderHeader}>
                    <View style={styles.sliderLabelRow}>
                      <Icon name="contrast" size={15} color={colors.primary} />
                      <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>
                        Contrast
                      </Text>
                    </View>
                    <Text style={[styles.sliderValue, { color: colors.primary }]}>
                      {adjustments.contrast}%
                    </Text>
                  </View>
                  <View style={styles.buttonSliderRow}>
                    <TouchableOpacity
                      testID="image-editor-contrast-minus"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({
                          ...p,
                          contrast: Math.max(50, p.contrast - 5),
                        }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>−</Text>
                    </TouchableOpacity>
                    <View style={styles.zoomTrack}>
                      <View
                        style={[
                          styles.zoomProgress,
                          {
                            backgroundColor: colors.primary,
                            width: `${((adjustments.contrast - 50) / 100) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <TouchableOpacity
                      testID="image-editor-contrast-plus"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({
                          ...p,
                          contrast: Math.min(150, p.contrast + 5),
                        }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Saturation Slider */}
                <View
                  style={[styles.sliderCard, { backgroundColor: colors.bgSubtle, marginTop: 8 }]}
                >
                  <View style={styles.sliderHeader}>
                    <View style={styles.sliderLabelRow}>
                      <Icon name="adjust" size={15} color={colors.primary} />
                      <Text style={[styles.sliderLabel, { color: colors.textPrimary }]}>
                        Saturation (Food Vibrance)
                      </Text>
                    </View>
                    <Text style={[styles.sliderValue, { color: colors.primary }]}>
                      {adjustments.saturation}%
                    </Text>
                  </View>
                  <View style={styles.buttonSliderRow}>
                    <TouchableOpacity
                      testID="image-editor-sat-minus"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({
                          ...p,
                          saturation: Math.max(0, p.saturation - 10),
                        }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>−</Text>
                    </TouchableOpacity>
                    <View style={styles.zoomTrack}>
                      <View
                        style={[
                          styles.zoomProgress,
                          {
                            backgroundColor: colors.primary,
                            width: `${(adjustments.saturation / 200) * 100}%`,
                          },
                        ]}
                      />
                    </View>
                    <TouchableOpacity
                      testID="image-editor-sat-plus"
                      style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                      onPress={() =>
                        setAdjustments((p) => ({
                          ...p,
                          saturation: Math.min(200, p.saturation + 10),
                        }))
                      }
                    >
                      <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Footer */}
          <View style={[styles.footerBar, { borderTopColor: colors.borderLight }]}>
            <TouchableOpacity
              testID="image-editor-footer-cancel"
              style={[styles.footerCancelBtn, { borderColor: colors.borderLight }]}
              onPress={onCancel}
              disabled={isProcessing}
            >
              <Text style={[styles.footerCancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              testID="image-editor-save-btn"
              style={[
                styles.footerSaveBtn,
                { backgroundColor: colors.primary },
                isProcessing && { opacity: 0.7 },
              ]}
              onPress={handleApplyAndSave}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Icon name="check" size={16} color="#FFFFFF" />
                  <Text style={styles.footerSaveText}>Apply & Use Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '94%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  viewportOuter: {
    width: '100%',
    height: 290,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    overflow: 'hidden',
  },
  cropFrame: {
    height: '100%',
    maxHeight: 260,
    borderRadius: 10,
    borderWidth: 2,
    position: 'relative',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  cornerGuide: {
    position: 'absolute',
    width: 16,
    height: 16,
    zIndex: 10,
  },
  cornerTL: {
    top: 4,
    left: 4,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 4,
    right: 4,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 4,
    left: 4,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 4,
    right: 4,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  gridLineH1: {
    position: 'absolute',
    top: '33.33%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    zIndex: 5,
  },
  gridLineH2: {
    position: 'absolute',
    top: '66.66%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    zIndex: 5,
  },
  gridLineV1: {
    position: 'absolute',
    left: '33.33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    zIndex: 5,
  },
  gridLineV2: {
    position: 'absolute',
    left: '66.66%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
    zIndex: 5,
  },
  aspectBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 12,
  },
  aspectBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabItem: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  controlsScroll: {
    maxHeight: 220,
  },
  controlsContent: {
    padding: 16,
  },
  panelSection: {
    gap: 8,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  aspectPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  aspectPill: {
    flex: 1,
    minWidth: 80,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aspectPillTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  aspectPillHint: {
    fontSize: 10,
    marginTop: 2,
  },
  sliderCard: {
    padding: 12,
    borderRadius: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sliderLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sliderLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  sliderValue: {
    fontSize: 13,
    fontWeight: '800',
  },
  buttonSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  stepperSymbol: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
  zoomTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(128,128,128,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  zoomProgress: {
    height: '100%',
    borderRadius: 3,
  },
  rotateActionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  rotateBtn: {
    flex: 1,
    minWidth: 110,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  rotateBtnLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  fineResetBtn: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  fineResetText: {
    fontSize: 11,
    fontWeight: '600',
  },
  presetScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  presetCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  presetCardTitle: {
    fontSize: 12,
    fontWeight: '800',
  },
  presetCardDesc: {
    fontSize: 10,
    marginTop: 2,
  },
  footerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  footerCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  footerCancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  footerSaveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
