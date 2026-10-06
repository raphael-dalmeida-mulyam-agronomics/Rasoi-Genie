import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
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
  fallbackUri: string;
  headline: string;
  subtitle: string;
}

const SLIDES: CoverSlide[] = [
  {
    id: '1',
    image: require('../../assets/images/cover_background.jpg'),
    fallbackUri:
      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1200&q=80',
    headline: 'Chef recipes, delivered as\nexact-proportion kits',
    subtitle: 'Watch. Order. Cook like a chef.',
  },
  {
    id: '2',
    image: require('../../assets/images/cover_slide_biryani.jpg'),
    fallbackUri:
      'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=1200&q=80',
    headline: 'Artisanal spices & masalas,\nzero guesswork',
    subtitle: 'Pre-portioned sachets for foolproof royal flavors.',
  },
  {
    id: '3',
    image: require('../../assets/images/cover_slide_dal.jpg'),
    fallbackUri:
      'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80',
    headline: 'Cook restaurant-grade meals\nin under 20 minutes',
    subtitle: 'Farm-fresh ingredients delivered straight to your door.',
  },
];

const getImageUri = (source: any): string => {
  if (typeof source === 'string') return source;
  if (source && typeof source.uri === 'string') return source.uri;
  if (source && typeof source.default === 'string') return source.default;
  if (source && source.default && typeof source.default.uri === 'string') return source.default.uri;
  return '';
};

const CoverSlideItem: React.FC<{
  item: CoverSlide;
  screenWidth: number;
  screenHeight: number;
  insets: any;
}> = ({ item, screenWidth, screenHeight, insets }) => {
  const [imgSrc, setImgSrc] = useState<string>(() => getImageUri(item.image) || item.fallbackUri);

  return (
    <View
      style={{
        width: screenWidth,
        height: screenHeight,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0F0906',
      }}
    >
      {Platform.OS === 'web' ? (
        // Direct HTML img with positive z-index prevents react-native-web z-index: -1 negative stacking context hiding bug on narrow widths
        <img
          src={imgSrc}
          alt={item.headline}
          style={{
            position: 'absolute',
            top: '-14%',
            left: 0,
            width: '100%',
            height: '118%',
            objectFit: 'cover',
            objectPosition: 'center 20%',
            zIndex: 1,
            pointerEvents: 'none',
          }}
          onError={() => setImgSrc(item.fallbackUri)}
        />
      ) : (
        <Image
          source={typeof item.image === 'number' ? item.image : { uri: imgSrc }}
          style={[
            styles.heroCoverImage,
            {
              top: -screenHeight * 0.14,
              height: screenHeight * 1.18,
              width: screenWidth,
              zIndex: 1,
            },
          ]}
          resizeMode="cover"
          onError={() => setImgSrc(item.fallbackUri)}
        />
      )}

      {/* Very subtle bottom-only gradient for text readability without darkening the photo */}
      <View style={[styles.bottomSoftGradient, { zIndex: 2 }]} />

      {/* Slide Content */}
      <View
        style={[
          styles.contentContainer,
          {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 3,
            paddingBottom: Math.max(insets.bottom, 24) + 100, // Space for Get Started button
          },
        ]}
      >
        <Text style={styles.headline}>{item.headline}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );
};

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
          <CoverSlideItem
            item={item}
            screenWidth={screenWidth}
            screenHeight={screenHeight}
            insets={insets}
          />
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
  heroCoverImage: {
    position: 'absolute',
    left: 0,
    right: 0,
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
    height: '40%',
    // @ts-ignore Web gradient support
    backgroundImage:
      Platform.OS === 'web'
        ? 'linear-gradient(to top, rgba(12, 6, 3, 0.9) 0%, rgba(12, 6, 3, 0.5) 50%, rgba(12, 6, 3, 0) 100%)'
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
    ...Platform.select({
      web: {
        textShadow: '0px 2px 8px rgba(0, 0, 0, 0.95)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.95)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
      },
    }),
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    letterSpacing: 0.2,
    ...Platform.select({
      web: {
        textShadow: '0px 1px 6px rgba(0, 0, 0, 0.85)',
      },
      default: {
        textShadowColor: 'rgba(0, 0, 0, 0.85)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 6,
      },
    }),
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
    ...Platform.select({
      web: {
        boxShadow: '0px 6px 10px rgba(226, 74, 43, 0.4)',
      },
      default: {
        shadowColor: '#E24A2B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
