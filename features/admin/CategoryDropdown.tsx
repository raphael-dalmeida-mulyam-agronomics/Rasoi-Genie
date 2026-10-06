import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { INGREDIENT_CATEGORIES, IngredientCategoryId } from './ingredientCategories';

export type CategoryFilter = 'all' | IngredientCategoryId;

export const CategoryDropdown: React.FC<{
  value: CategoryFilter;
  onChange: (v: CategoryFilter) => void;
  counts: Record<string, number>;
  totalCount: number;
}> = ({ value, onChange, counts, totalCount }) => {
  const { colors, radii, shadows } = useTheme();
  const [open, setOpen] = useState(false);

  const options: { id: CategoryFilter; label: string; count: number }[] = [
    { id: 'all', label: 'All Categories', count: totalCount },
    ...INGREDIENT_CATEGORIES
      .filter((c) => (counts[c.id] || 0) > 0)
      .map((c) => ({ id: c.id as CategoryFilter, label: c.label, count: counts[c.id] || 0 })),
  ];

  const current = options.find((o) => o.id === value) ?? options[0]!;

  return (
    <View style={[styles.wrapper, { zIndex: open ? 5000 : 1 }]}>
      <Text style={[styles.label, { color: colors.textMuted }]}>Category</Text>

      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => setOpen((v) => !v)}
        style={[
          styles.trigger,
          {
            borderColor: open || value !== 'all' ? colors.primary : colors.borderLight,
            backgroundColor: colors.bgSurface,
            borderRadius: radii.lg,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.triggerText,
            { color: value !== 'all' ? colors.primary : colors.textPrimary },
          ]}
        >
          {current.label}
        </Text>
        <View
          style={[
            styles.countBadge,
            { backgroundColor: value !== 'all' ? colors.primaryLight : colors.bgSubtle },
          ]}
        >
          <Text style={[styles.countText, { color: value !== 'all' ? colors.primary : colors.textMuted }]}>
            {current.count}
          </Text>
        </View>
      </TouchableOpacity>

      {open && (
        <View
          style={[
            styles.menu,
            {
              borderColor: colors.borderLight,
              backgroundColor: colors.bgSurface,
              borderRadius: radii.lg,
              ...shadows.card,
            },
          ]}
        >
          <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {options.map((o) => {
              const sel = o.id === value;
              return (
                <TouchableOpacity
                  key={o.id}
                  style={[
                    styles.menuItem,
                    { backgroundColor: sel ? colors.primaryLight : 'transparent' },
                  ]}
                  onPress={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.menuItemText,
                      { color: sel ? colors.primary : colors.textPrimary },
                    ]}
                  >
                    {o.label}
                  </Text>
                  <View
                    style={[
                      styles.menuCountBadge,
                      { backgroundColor: sel ? colors.primary + '20' : colors.bgSubtle },
                    ]}
                  >
                    <Text
                      style={[
                        styles.menuCountText,
                        { color: sel ? colors.primary : colors.textMuted },
                      ]}
                    >
                      {o.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    marginBottom: 12,
    maxWidth: 320,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 2,
    borderWidth: 1,
    maxHeight: 280,
    overflow: 'hidden',
    zIndex: 99999,
    elevation: 99999,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemText: {
    flex: 1,
    fontSize: 14,
  },
  menuCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
    marginLeft: 8,
  },
  menuCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
