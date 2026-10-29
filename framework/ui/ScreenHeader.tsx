import React, { useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { SafeAreaInsetsContext, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { Icon } from './Icon';

/**
 * Returns safe top padding for screen headers across Web, iOS (notch/dynamic island), and Android.
 */
export function useHeaderTopPadding(extraOffset: number = 8): number {
  if (Platform.OS === 'web') {
    return 16 + extraOffset;
  }

  let topInset = 0;
  if (SafeAreaInsetsContext) {
    try {
      const insets = useContext(SafeAreaInsetsContext);
      if (insets && typeof insets.top === 'number') {
        topInset = insets.top;
      }
    } catch {
      topInset = 0;
    }
  } else if (typeof useSafeAreaInsets === 'function') {
    try {
      const insets = useSafeAreaInsets();
      if (insets && typeof insets.top === 'number') {
        topInset = insets.top;
      }
    } catch {
      topInset = 0;
    }
  }

  return Math.max(topInset, 16) + extraOffset;
}

export interface ScreenHeaderProps {
  title?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  backgroundColor?: string;
  testID?: string;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  title,
  onBack,
  rightAction,
  children,
  style,
  backgroundColor,
  testID,
}) => {
  const { colors } = useTheme();
  const paddingTop = useHeaderTopPadding(8);

  return (
    <View
      testID={testID}
      style={[
        styles.headerBase,
        { paddingTop, backgroundColor: backgroundColor || colors.bgSurface },
        style,
      ]}
    >
      {title || onBack || rightAction ? (
        <View style={styles.titleRow}>
          {onBack && (
            <TouchableOpacity
              onPress={onBack}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Icon name="arrow-back" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          )}
          {title && (
            <Text style={[styles.titleText, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
          )}
          {rightAction ? (
            <View style={styles.rightActionWrap}>{rightAction}</View>
          ) : onBack ? (
            <View style={{ width: 22 }} />
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  headerBase: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  backBtn: {
    paddingRight: 10,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  rightActionWrap: {
    alignItems: 'flex-end',
  },
});
