import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  FlatList,
  useWindowDimensions,
  Platform,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../framework/theme/ThemeContext';

export interface CoverScreenViewProps {
  onGetStarted: () => void;
}

interface CoverSlide {
  id: string;
  image: any;
  headline: string;
  subtitle: string;
}

const SLIDES: CoverSlide[] = [
  {
    id: '1',
    image: require('../../assets/images/cover_background.jpg'),
    headline: 'Chef recipes, delivered as\nexact-proportion kits',
    subtitle: 'Watch. Order. Cook like a chef.',
  },
  {
    id: '2',
    image: require('../../assets/images/cover_slide_biryani.jpg'),
    headline: 'Artisanal spices & masalas,\nzero guesswork',
    subtitle: 'Pre-portioned sachets for foolproof royal flavors.',
  },
  {
    id: '3',
    image: require('../../assets/images/cover_slide_dal.jpg'),
    headline: 'Cook restaurant-grade meals\nin under 20 minutes',
    subtitle: 'Farm-fresh ingredients delivered straight to your door.',
  },
];

export const CoverScreenView: React.FC<CoverScreenViewProps> = ({ onGetStarted }) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<CoverSlide>>(null);
  const isUserInteracting = useRef(false);

  // Auto-advance carousel every 4.5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (isUserInteracting.current) return;
      setActiveIndex((prev) => {
        const next = (prev + 1) % SLIDES.length;
        flatListRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, 4500);

    return () => clearInterval(timer);
  }, [screenWidth]);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    if (index >= 0 && index < SLIDES.length && index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const handleDotPress = (index: number) => {
    setActiveIndex(index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <View style={styles.container}>
      {/* Swipeable Carousel */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          isUserInteracting.current = true;
        }}
        onScrollEndDrag={() => {
          setTimeout(() => {
            isUserInteracting.current = false;
          }, 3000);
        }}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={{ width: screenWidth, height: screenHeight }}>
            <ImageBackground source={item.image} style={styles.backgroundImage} resizeMode="cover">
              {/* Very subtle bottom-only gradient for text readability without darkening the photo */}
              <View style={styles.bottomSoftGradient} />

              {/* Slide Content */}
              <View
                style={[
                  styles.contentContainer,
                  {
                    paddingBottom: Math.max(insets.bottom, 24) + 100, // Space for Get Started button
                  },
                ]}
              >
                <Text style={styles.headline}>{item.headline}</Text>
                <Text style={styles.subtitle}>{item.subtitle}</Text>
              </View>
            </ImageBackground>
          </View>
        )}
      />

      {/* Floating Bottom Control Bar: Indicators + Single Get Started Button */}
      <View
        style={[
          styles.bottomFloatingBar,
          {
            paddingBottom: Math.max(insets.bottom, 20) + 12,
          },
        ]}
      >
        {/* Working Carousel Pagination Dots */}
        <View style={styles.indicatorContainer}>
          {SLIDES.map((_, idx) => {
            const isActive = activeIndex === idx;
            return (
              <TouchableOpacity
                key={idx}
                activeOpacity={0.7}
                onPress={() => handleDotPress(idx)}
                hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                style={[
                  isActive
                    ? [styles.activeIndicator, { backgroundColor: colors.accent || '#F59E0B' }]
                    : styles.inactiveDot,
                ]}
              />
            );
          })}
        </View>

        {/* Single Primary Action Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          style={[
            styles.getStartedButton,
            {
              backgroundColor: colors.primary || '#E24A2B',
            },
          ]}
          onPress={onGetStarted}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F0906',
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  // Soft, gradual feather at the very bottom only — keeps the food picture crisp & vibrant
  bottomSoftGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '38%',
    // @ts-ignore Web gradient support
    backgroundImage:
      Platform.OS === 'web'
        ? 'linear-gradient(to top, rgba(12, 6, 3, 0.85) 0%, rgba(12, 6, 3, 0.45) 50%, rgba(12, 6, 3, 0) 100%)'
        : undefined,
  },
  contentContainer: {
    paddingHorizontal: 28,
    alignItems: 'center',
    zIndex: 10,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  headline: {
    fontSize: 27,
    lineHeight: 35,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    letterSpacing: -0.3,
    fontFamily: Platform.select({
      ios: 'Georgia',
      android: 'serif',
      web: 'Georgia, serif',
      default: undefined,
    }),
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  bottomFloatingBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 28,
    alignItems: 'center',
    zIndex: 20,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 20,
  },
  activeIndicator: {
    width: 26,
    height: 4,
    borderRadius: 2,
  },
  inactiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  getStartedButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E24A2B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
