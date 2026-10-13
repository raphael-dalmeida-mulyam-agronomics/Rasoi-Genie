import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ViewStyle,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  containerStyle?: ViewStyle;
  testID?: string;
  scrollable?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  title,
  subtitle,
  children,
  containerStyle,
  testID,
  scrollable = true,
}) => {
  const { colors, radii, shadows } = useTheme();

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      testID={testID}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View
              style={[
                styles.sheetContainer,
                {
                  backgroundColor: colors.bgSurface,
                  borderTopLeftRadius: radii.xl,
                  borderTopRightRadius: radii.xl,
                  borderColor: colors.borderLight,
                  ...shadows.card,
                },
                containerStyle,
              ]}
            >
              {/* Drag Handle */}
              <View style={styles.handleWrap}>
                <View style={[styles.handle, { backgroundColor: colors.borderLight }]} />
              </View>

              {/* Header */}
              {title || subtitle ? (
                <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
                  <View style={styles.headerTextWrap}>
                    {title ? (
                      <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
                    ) : null}
                    {subtitle ? (
                      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>

                  <TouchableOpacity
                    style={styles.closeBtn}
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Close bottom sheet"
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  >
                    <Icon name="close" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Body */}
              {scrollable ? (
                <ScrollView
                  contentContainerStyle={styles.scrollBody}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {children}
                </ScrollView>
              ) : (
                <View style={styles.fixedBody}>{children}</View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
    borderTopWidth: 1,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTextWrap: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
  },
  scrollBody: {
    padding: 20,
  },
  fixedBody: {
    padding: 20,
  },
});
