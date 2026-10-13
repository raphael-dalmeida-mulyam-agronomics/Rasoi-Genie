import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';

export interface LinkShareCardProps {
  dependentName: string;
  rawToken: string;
  expiresAt?: string;
  onDone: () => void;
}

export const LinkShareCard: React.FC<LinkShareCardProps> = ({
  dependentName,
  rawToken,
  expiresAt,
  onDone,
}) => {
  const { colors, radii, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const t = familyStrings.linkShareCard;
  const baseUrl =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'https://rasoigenie.app';
  const fullJoinUrl = `${baseUrl}/join/${rawToken}`;

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).clipboard?.writeText) {
        await (navigator as any).clipboard.writeText(fullJoinUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(true);
    }
  };

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({
          title: 'Join our RasoiGenie Family Basket',
          text: `Hi ${dependentName}, join our family meal kit basket here:`,
          url: fullJoinUrl,
        });
      } else {
        await Share.share({
          title: 'Join our RasoiGenie Family Basket',
          message: `Hi ${dependentName}, join our family meal kit basket here: ${fullJoinUrl}`,
        });
      }
    } catch {
      handleCopy();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#F0FDF4',
          borderColor: '#10B981',
          borderRadius: radii.xl,
        },
      ]}
      testID="link-share-card"
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Icon name="link" size={20} color="#10B981" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{t.subtitle}</Text>
        </View>
      </View>

      {/* Warning Box */}
      <View style={styles.warningBox}>
        <Icon name="warning" size={14} color="#D97706" style={{ marginRight: 6 }} />
        <Text style={styles.warningText}>{t.warning(dependentName)}</Text>
      </View>

      {/* Link Display Box */}
      <View
        style={[
          styles.linkBox,
          {
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.3)' : '#FFFFFF',
            borderColor: colors.borderLight,
            borderRadius: radii.md,
          },
        ]}
      >
        <Text style={[styles.linkText, { color: colors.textPrimary }]} numberOfLines={1}>
          {fullJoinUrl}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.btnRow}>
        <Button
          title={copied ? t.copiedBtn : t.copyBtn}
          variant={copied ? 'secondary' : 'outline'}
          size="md"
          icon={<Icon name={copied ? 'check' : 'copy'} size={16} color={colors.primary} />}
          onPress={handleCopy}
          style={{ flex: 1 }}
          testID="copy-link-btn"
        />

        <Button
          title={t.shareBtn}
          variant="primary"
          size="md"
          icon={<Icon name="share" size={16} color="#FFFFFF" />}
          onPress={handleShare}
          style={{ flex: 1 }}
          testID="share-link-btn"
        />
      </View>

      <Button
        title={t.doneBtn}
        variant="secondary"
        size="md"
        onPress={onDone}
        style={{ marginTop: 4 }}
        testID="done-link-btn"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
    flex: 1,
  },
  linkBox: {
    padding: 12,
    borderWidth: 1,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '500',
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
});
