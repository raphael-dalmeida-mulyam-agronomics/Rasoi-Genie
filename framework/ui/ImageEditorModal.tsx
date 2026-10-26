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
  onSave: (
    editedUri: string,
    meta?: { width: number; height: number; aspectRatio: number },
  ) => void;
  onCancel: () => void;
}

interface ImageAdjustmentState {
  rotation: number; // 0, 90, 180, 270 degrees
  fineAngle: number; // -45 to +45 degrees
  flipH: boolean;
  flipV: boolean;
  aspectRatio: AspectRatioPreset;
  zoom: number; // 1.0 to 3.0
}

const DEFAULT_ADJUSTMENTS: ImageAdjustmentState = {
  rotation: 0,
  fineAngle: 0,
  flipH: false,
  flipV: false,
  aspectRatio: '4:3',
  zoom: 1.0,
};

const ASPECT_RATIO_VALUES: Record<AspectRatioPreset, number | null> = {
  '4:3': 4 / 3,
  '1:1': 1,
  '16:9': 16 / 9,
  '3:4': 3 / 4,
  free: null,
};

export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
  visible,
  imageUri,
  title = 'Crop, Frame & Rotate Photo',
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
  const zoomTrackRef = useRef<View>(null);
  const zoomTrackLayoutRef = useRef<{ pageX: number; width: number }>({ pageX: 0, width: 200 });

  const handleZoomChange = (newZoom: number) => {
    const clamped = Math.max(1.0, Math.min(3.0, parseFloat(newZoom.toFixed(2))));
    setAdjustments((p) => ({ ...p, zoom: clamped }));
  };

  const handleZoomTrackTouch = (clientX: number) => {
    const { pageX, width } = zoomTrackLayoutRef.current;
    if (width <= 0) return;
    const ratio = Math.max(0, Math.min(1, (clientX - pageX) / width));
    handleZoomChange(1.0 + ratio * 2.0);
  };

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

  // Perform Final Canvas Export (Web & Native Fallback)
  const handleApplyAndSave = async () => {
    if (!imageUri) return;
    setIsProcessing(true);

    try {
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        const renderedData = await new Promise<{
          dataUrl: string;
          width: number;
          height: number;
          aspectRatio: number;
        }>((resolve) => {
          const img = new (window as any).Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                const targetAspect = ASPECT_RATIO_VALUES[adjustments.aspectRatio];
                const fbAspect = targetAspect ?? imageDimensions.width / imageDimensions.height;
                resolve({
                  dataUrl: imageUri,
                  width: imageDimensions.width,
                  height: imageDimensions.height,
                  aspectRatio: fbAspect,
                });
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

              // Draw image centered
              const drawW = canvas.width * (srcWidth / effectiveCropW);
              const drawH = canvas.height * (srcHeight / effectiveCropH);

              ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
              ctx.restore();

              const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
              resolve({
                dataUrl,
                width: canvas.width,
                height: canvas.height,
                aspectRatio: canvas.width / canvas.height,
              });
            } catch (canvasErr) {
              console.warn('[ImageEditorModal] Canvas processing fallback:', canvasErr);
              const targetAspect = ASPECT_RATIO_VALUES[adjustments.aspectRatio];
              const fbAspect = targetAspect ?? imageDimensions.width / imageDimensions.height;
              resolve({
                dataUrl: imageUri,
                width: imageDimensions.width,
                height: imageDimensions.height,
                aspectRatio: fbAspect,
              });
            }
          };
          img.onerror = () => {
            const targetAspect = ASPECT_RATIO_VALUES[adjustments.aspectRatio];
            const fbAspect = targetAspect ?? imageDimensions.width / imageDimensions.height;
            resolve({
              dataUrl: imageUri,
              width: imageDimensions.width,
              height: imageDimensions.height,
              aspectRatio: fbAspect,
            });
          };
          img.src = imageUri;
        });

        onSave(renderedData.dataUrl, {
          width: renderedData.width,
          height: renderedData.height,
          aspectRatio: renderedData.aspectRatio,
        });
      } else {
        // Native / headless test fallback
        const targetAspect = ASPECT_RATIO_VALUES[adjustments.aspectRatio];
        const fbAspect = targetAspect ?? imageDimensions.width / imageDimensions.height;
        onSave(imageUri, {
          width: imageDimensions.width,
          height: imageDimensions.height,
          aspectRatio: fbAspect,
        });
      }
    } catch (err) {
      console.warn('[ImageEditorModal] Error applying edits:', err);
      const targetAspect = ASPECT_RATIO_VALUES[adjustments.aspectRatio];
      const fbAspect = targetAspect ?? imageDimensions.width / imageDimensions.height;
      onSave(imageUri, {
        width: imageDimensions.width,
        height: imageDimensions.height,
        aspectRatio: fbAspect,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (!visible || !imageUri) return null;

  // Compute live visual style transforms for container & image
  const totalAngle = (adjustments.rotation + adjustments.fineAngle) % 360;
  const targetAspectVal =
    ASPECT_RATIO_VALUES[adjustments.aspectRatio] ??
    (imageDimensions.width && imageDimensions.height
      ? imageDimensions.width / imageDimensions.height
      : 4 / 3);

  const imageTransformStyle = {
    transform: [
      { rotate: `${totalAngle}deg` },
      { scaleX: adjustments.flipH ? -1 : 1 },
      { scaleY: adjustments.flipV ? -1 : 1 },
      { scale: adjustments.zoom },
    ],
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
                  Crop, frame, rotate, and flip your recipe photo
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

          {/* Unified Controls Panel (Cropping, Framing, Rotating & Flipping in One Menu) */}
          <ScrollView
            style={styles.controlsScroll}
            contentContainerStyle={styles.controlsContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.panelSection}>
              {/* Aspect Ratio Presets */}
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

              {/* Zoom & Scale Stepper */}
              <View
                style={[styles.sliderCard, { backgroundColor: colors.bgSubtle, marginTop: 10 }]}
              >
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
                    onPress={() => handleZoomChange(adjustments.zoom - 0.2)}
                  >
                    <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>−</Text>
                  </TouchableOpacity>

                  {/* Interactive Draggable Zoom Slider Track */}
                  <View
                    ref={zoomTrackRef}
                    testID="image-editor-zoom-track"
                    style={styles.zoomTrackInteractive}
                    onLayout={(e) => {
                      const { width } = e.nativeEvent.layout;
                      if (width) {
                        zoomTrackLayoutRef.current.width = width;
                      }
                      if (
                        Platform.OS === 'web' &&
                        typeof (e.target as any)?.getBoundingClientRect === 'function'
                      ) {
                        const rect = (e.target as any).getBoundingClientRect();
                        zoomTrackLayoutRef.current = {
                          pageX: rect.left,
                          width: rect.width || width,
                        };
                      }
                    }}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={(e) => {
                      if (typeof e.nativeEvent?.locationX === 'number') {
                        const ratio = Math.max(
                          0,
                          Math.min(
                            1,
                            e.nativeEvent.locationX / (zoomTrackLayoutRef.current.width || 200),
                          ),
                        );
                        handleZoomChange(1.0 + ratio * 2.0);
                      } else {
                        const pageX =
                          (e.nativeEvent as any)?.pageX ?? (e.nativeEvent as any)?.clientX;
                        if (typeof pageX === 'number') {
                          handleZoomTrackTouch(pageX);
                        }
                      }
                    }}
                    onResponderMove={(e) => {
                      if (typeof e.nativeEvent?.locationX === 'number') {
                        const ratio = Math.max(
                          0,
                          Math.min(
                            1,
                            e.nativeEvent.locationX / (zoomTrackLayoutRef.current.width || 200),
                          ),
                        );
                        handleZoomChange(1.0 + ratio * 2.0);
                      } else {
                        const pageX =
                          (e.nativeEvent as any)?.pageX ?? (e.nativeEvent as any)?.clientX;
                        if (typeof pageX === 'number') {
                          handleZoomTrackTouch(pageX);
                        }
                      }
                    }}
                  >
                    {/* Background Track Line */}
                    <View style={styles.zoomTrackBg}>
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

                    {/* Draggable Knob / Thumb */}
                    <View
                      testID="image-editor-zoom-thumb"
                      style={[
                        styles.zoomThumb,
                        {
                          left: `${((adjustments.zoom - 1.0) / 2.0) * 100}%`,
                          borderColor: colors.primary,
                        },
                      ]}
                    />

                    {/* Web Native Range Input for instant responsive dragging & wheel support */}
                    {Platform.OS === 'web' && (
                      <input
                        type="range"
                        id="image-editor-zoom-slider"
                        data-testid="image-editor-zoom-slider"
                        min="1.0"
                        max="3.0"
                        step="0.05"
                        value={adjustments.zoom}
                        onChange={(e) => {
                          handleZoomChange(parseFloat((e.target as HTMLInputElement).value));
                        }}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          opacity: 0,
                          cursor: 'ew-resize',
                          margin: 0,
                          padding: 0,
                          zIndex: 10,
                        }}
                      />
                    )}
                  </View>

                  <TouchableOpacity
                    testID="image-editor-zoom-in"
                    style={[styles.stepperBtn, { backgroundColor: colors.bgSurface }]}
                    onPress={() => handleZoomChange(adjustments.zoom + 0.2)}
                  >
                    <Text style={[styles.stepperSymbol, { color: colors.textPrimary }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Quick Orientation & Flip Controls */}
              <Text style={[styles.sectionHeading, { color: colors.textPrimary, marginTop: 12 }]}>
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

              {/* Fine Angle Alignment */}
              <View
                style={[styles.sliderCard, { backgroundColor: colors.bgSubtle, marginTop: 10 }]}
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
    maxWidth: '92%',
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
  controlsScroll: {
    maxHeight: 280,
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
  zoomTrackInteractive: {
    flex: 1,
    height: 36,
    justifyContent: 'center',
    marginHorizontal: 8,
    position: 'relative',
    cursor: 'pointer',
  },
  zoomTrackBg: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(128,128,128,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
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
  zoomThumb: {
    position: 'absolute',
    top: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2.5,
    marginLeft: -10,
    pointerEvents: 'none',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 5px rgba(0,0,0,0.25)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
        elevation: 4,
      },
    }),
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
