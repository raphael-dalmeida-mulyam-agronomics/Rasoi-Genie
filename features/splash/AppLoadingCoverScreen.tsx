import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface AppLoadingCoverScreenProps {
  /**
   * Minimum duration (in ms) to show the cover screen so the user can enjoy the branding.
   * Default: 1600ms
   */
  minDurationMs?: number;
  /**
   * Duration (in ms) of the slide-down reveal animation.
   * Default: 700ms
   */
  slideDurationMs?: number;
  /**
   * Optional callback when the cover screen finishes sliding down and unmounts.
   */
  onDone?: () => void;
  /**
   * Optional manual override to control when loading finishes.
   */
  isAppReady?: boolean;
}

export const AppLoadingCoverScreen: React.FC<AppLoadingCoverScreenProps> = ({
  minDurationMs = 1600,
  slideDurationMs = 700,
  onDone,
  isAppReady = true,
}) => {
  const [visible, setVisible] = useState(true);

  // Animation values
  const translateY = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Gentle logo pulse breathing effect while loading
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.98,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1400,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== 'web',
      }),
    );

    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [pulseAnim, shimmerAnim]);

  // Handle slide down when ready
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isAppReady) {
      timer = setTimeout(() => {
        // Slide DOWN to reveal the home screen underneath
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT + 60,
          duration: slideDurationMs,
          easing: Easing.bezier(0.16, 1, 0.3, 1), // Swift, natural ease-out
          useNativeDriver: Platform.OS !== 'web',
        }).start(() => {
          setVisible(false);
          onDone?.();
        });
      }, minDurationMs);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isAppReady, minDurationMs, slideDurationMs, translateY, onDone]);

  if (!visible) {
    return null;
  }

  // Shimmer progress bar translation
  const barTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 180],
  });

  return (
    <Animated.View
      testID="app-first-load-cover"
      style={[
        styles.coverContainer,
        {
          transform: [{ translateY }],
          pointerEvents: visible ? 'auto' : 'none',
        },
      ]}
    >
      {/* Decorative ambient glowing auras */}
      <View style={styles.topAura} />
      <View style={styles.centerAura} />
      <View style={styles.bottomAura} />

      {/* Main Branding Card */}
      <View style={styles.contentWrapper}>
        {/* Animated App Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.logoGlowRing}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
        </Animated.View>

        {/* App Name below the logo */}
        <View style={styles.textContainer}>
          <Text style={styles.appName}>Rasoi Genie</Text>
          <View style={styles.taglineBadge}>
            <Text style={styles.taglineText}>Gourmet Meal Kits • Fresh Daily</Text>
          </View>
        </View>

        {/* Polished loading bar & status text */}
        <View style={styles.loadingSection}>
          <View style={styles.progressBarTrack}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  transform: [{ translateX: barTranslateX }],
                },
              ]}
            />
          </View>
          <Text
            numberOfLines={1}
            style={[
              styles.loadingCaption,
              Platform.OS === 'web' && ({ whiteSpace: 'nowrap' } as any),
            ]}
          >
            Preparing your culinary kitchen...
          </Text>
        </View>
      </View>

      {/* Bottom sliding handle hint for premium feel */}
      <View style={styles.bottomHandleBar} />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  coverContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#150A05',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    // Elevation shadow at bottom for when it slides down
    ...Platform.select({
      web: {
        boxShadow: '0px 16px 28px rgba(0, 0, 0, 0.55)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.55,
        shadowRadius: 28,
        elevation: 30,
      },
    }),
  },
  topAura: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(224, 86, 38, 0.15)',
  },
  centerAura: {
    position: 'absolute',
    top: '32%',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
  },
  bottomAura: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(224, 86, 38, 0.12)',
  },
  contentWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    width: '100%',
    maxWidth: 460,
  },
  logoContainer: {
    marginBottom: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlowRing: {
    width: 124,
    height: 124,
    borderRadius: 32,
    backgroundColor: '#26130B',
    borderWidth: 2,
    borderColor: 'rgba(245, 158, 11, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 24px rgba(224, 86, 38, 0.45)',
      },
      default: {
        shadowColor: '#E05626',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 24,
        elevation: 16,
      },
    }),
  },
  logoImage: {
    width: 96,
    height: 96,
    borderRadius: 24,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 36,
  },
  appName: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'System',
      android: 'Roboto',
      web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }),
  },
  taglineBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: 'rgba(224, 86, 38, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  taglineText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FDBA74',
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  loadingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minWidth: 280,
  },
  progressBarTrack: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    width: 90,
    height: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 3,
    ...Platform.select({
      web: {
        boxShadow: '0px 0px 8px rgba(245, 158, 11, 0.8)',
      },
      default: {
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
    }),
  },
  loadingCaption: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.75)',
    letterSpacing: 0.3,
    textAlign: 'center',
    minWidth: 280,
    flexShrink: 0,
    ...(Platform.OS === 'web' ? ({ whiteSpace: 'nowrap' } as any) : {}),
  },
  bottomHandleBar: {
    position: 'absolute',
    bottom: 16,
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
