import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';

/**
 * Extracts the 11-character YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 * - Raw 11-char ID
 */
export function extractYouTubeVideoId(url: string | undefined | null): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Match standard YouTube URL patterns
  const match = trimmed.match(
    /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i,
  );
  if (match && match[1]) {
    return match[1];
  }

  // Exact 11-char ID format check
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function isValidYouTubeUrl(url: string | undefined | null): boolean {
  return !!extractYouTubeVideoId(url);
}

interface YouTubeEmbedProps {
  videoUrl: string;
  title?: string;
  height?: number;
  style?: ViewStyle;
}

export function YouTubeEmbed({
  videoUrl,
  title = 'Recipe Cooking Video',
  height = 260,
  style,
}: YouTubeEmbedProps) {
  const { colors } = useTheme();
  const videoId = extractYouTubeVideoId(videoUrl);

  if (!videoId) {
    return (
      <View
        style={[
          styles.placeholderContainer,
          { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight, height },
          style,
        ]}
      >
        <Icon name="videocam-outline" size={36} color={colors.textMuted} />
        <Text style={[styles.placeholderText, { color: colors.textMuted }]}>
          No valid YouTube video URL provided
        </Text>
      </View>
    );
  }

  const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.wrapper, style]}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            paddingBottom: '56.25%', // 16:9 Aspect Ratio
            height: 0,
            overflow: 'hidden',
            borderRadius: 12,
            backgroundColor: '#000000',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
          }}
        >
          <iframe
            src={embedUrl}
            title={title}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              border: 0,
              borderRadius: 12,
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <View style={styles.footerRow}>
          <TouchableOpacity
            onPress={() => Linking.openURL(watchUrl)}
            style={styles.externalLink}
            activeOpacity={0.7}
          >
            <Icon name="open-outline" size={13} color={colors.primary} />
            <Text style={[styles.externalLinkText, { color: colors.primary }]}>
              Open in YouTube
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Native mobile fallback (Thumbnail with play button)
  return (
    <View style={[styles.wrapper, style]}>
      <TouchableOpacity
        onPress={() => Linking.openURL(watchUrl)}
        activeOpacity={0.85}
        style={[styles.nativeContainer, { height }]}
      >
        <Image source={{ uri: thumbnailUrl }} style={styles.nativeThumbnail} resizeMode="cover" />
        <View style={styles.playButtonOverlay}>
          <View style={styles.playCircle}>
            <Icon name="play" size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.playText}>Watch on YouTube</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.footerRow}>
        <TouchableOpacity
          onPress={() => Linking.openURL(watchUrl)}
          style={styles.externalLink}
          activeOpacity={0.7}
        >
          <Icon name="open-outline" size={13} color={colors.primary} />
          <Text style={[styles.externalLinkText, { color: colors.primary }]}>
            Open video in YouTube app
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  placeholderContainer: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  placeholderText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  nativeContainer: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  nativeThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  playCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FF0000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  playText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  externalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  externalLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
