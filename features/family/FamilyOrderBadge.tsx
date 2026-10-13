import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Avatar } from '../../framework/ui/Avatar';
import { Icon } from '../../framework/ui/Icon';

export interface FamilyOrderBadgeProps {
  ownerName?: string;
  memberNames?: string[];
  yourItemsCount?: number;
  testID?: string;
}

export const FamilyOrderBadge: React.FC<FamilyOrderBadgeProps> = ({
  ownerName = 'Family Owner',
  memberNames = [],
  yourItemsCount,
  testID,
}) => {
  const { colors, radii, isDark } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.badgeContainer,
        {
          backgroundColor: isDark ? 'rgba(217, 119, 6, 0.2)' : '#FEF3C7',
          borderColor: '#D97706',
          borderRadius: radii.md,
        },
      ]}
      accessibilityRole="text"
      accessibilityLabel={`Family order placed by ${ownerName}`}
    >
      <View style={styles.topRow}>
        <Icon name="people" size={14} color="#D97706" style={{ marginRight: 6 }} />
        <Text style={styles.ownerText}>
          Family order by <Text style={{ fontWeight: '800' }}>{ownerName}</Text>
        </Text>
      </View>

      <View style={styles.bottomRow}>
        {/* Overlapping Avatars */}
        {memberNames.length > 0 && (
          <View style={styles.avatarStack}>
            {memberNames.slice(0, 4).map((name, idx) => (
              <View key={idx} style={[styles.avatarWrap, { marginLeft: idx > 0 ? -8 : 0 }]}>
                <Avatar name={name} size="xs" />
              </View>
            ))}
          </View>
        )}

        {typeof yourItemsCount === 'number' && (
          <Text style={styles.yourItemsText}>
            Your items: <Text style={{ fontWeight: '700' }}>{yourItemsCount}</Text>
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  badgeContainer: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 6,
    alignSelf: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  yourItemsText: {
    fontSize: 11,
    color: '#92400E',
  },
});
