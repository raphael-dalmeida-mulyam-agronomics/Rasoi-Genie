import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MealKit } from '../../../framework/services/mealKitsService';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Badge } from '../../../framework/ui/Badge';
import { Icon } from '../../../framework/ui/Icon';

interface WhatsInYourBoxViewProps {
  kit: MealKit;
}

export const WhatsInYourBoxView: React.FC<WhatsInYourBoxViewProps> = ({ kit }) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);

  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  const toggleIngredientCheck = (idx: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const totalIngredients = kit.ingredients?.length || 0;
  const isAllChecked = totalIngredients > 0 && checkedIngredients.size === totalIngredients;

  const handleToggleAll = () => {
    if (isAllChecked) {
      setCheckedIngredients(new Set());
    } else {
      setCheckedIngredients(new Set(Array.from({ length: totalIngredients }, (_, i) => i)));
    }
  };

  const allergensText =
    kit.allergens && kit.allergens.length > 0 ? kit.allergens.join(', ') : 'None reported';

  return (
    <View
      testID="whats-in-your-box-card"
      style={[
        styles.container,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderLight,
          borderRadius: radii.xl,
          ...shadows.card,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Toggle What is in your box details"
      >
        <View style={styles.headerTitleRow}>
          <Icon name="basket" size={18} color={colors.primary} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            What's in your box (Mise en Place)
          </Text>
          <Badge
            label={
              checkedIngredients.size > 0
                ? `${checkedIngredients.size}/${totalIngredients} Ready`
                : `${totalIngredients} items`
            }
            variant={isAllChecked ? 'success' : 'neutral'}
            size="sm"
          />
        </View>
        <Icon
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Quick Metrics Bar (Always Visible) */}
      <View
        style={[
          styles.metricsRow,
          {
            backgroundColor: isDark ? '#1E293B' : colors.bgSubtle,
            borderColor: colors.borderLight,
            borderRadius: radii.pill,
          },
        ]}
      >
        <View style={styles.metricItem}>
          <Icon name="time" size={14} color={colors.primary} />
          <Text style={[styles.metricText, { color: colors.textPrimary }]}>
            <Text style={{ fontWeight: '800' }}>{kit.prepTimeMinutes}m</Text> prep
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Icon name="flame" size={14} color={colors.primary} />
          <Text style={[styles.metricText, { color: colors.textPrimary }]}>
            <Text style={{ fontWeight: '800' }}>{kit.cookTimeMinutes}m</Text> cook
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Icon name="people" size={14} color={colors.primary} />
          <Text style={[styles.metricText, { color: colors.textPrimary }]}>
            <Text style={{ fontWeight: '800' }}>{kit.servings}</Text> servings
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Icon name="flash" size={14} color={colors.primary} />
          <Text style={[styles.metricText, { color: colors.textPrimary }]}>{kit.spiceLevel}</Text>
        </View>
      </View>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.expandedBody}>
          {/* Allergens Notice */}
          <View style={styles.allergensWrap}>
            <Badge
              label={`Allergens: ${allergensText}`}
              variant={kit.allergens && kit.allergens.length > 0 ? 'warning' : 'success'}
              size="sm"
            />
          </View>

          {/* Nutrition Per Serving */}
          {kit.nutrition && (
            <View
              style={[
                styles.nutritionCard,
                {
                  backgroundColor: isDark ? '#064E3B25' : '#F0FDF4',
                  borderColor: isDark ? '#065F46' : '#BBF7D0',
                  borderRadius: radii.md,
                },
              ]}
            >
              <Text style={[styles.nutritionTitle, { color: isDark ? '#A7F3D0' : '#15803D' }]}>
                Nutrition Highlights (Per Serving)
              </Text>
              <View style={styles.macroRow}>
                <View style={styles.macroCol}>
                  <Text style={[styles.macroVal, { color: colors.textPrimary }]}>
                    {kit.nutrition.calories}
                  </Text>
                  <Text style={[styles.macroLbl, { color: colors.textMuted }]}>Calories</Text>
                </View>
                <View style={styles.macroCol}>
                  <Text style={[styles.macroVal, { color: colors.textPrimary }]}>
                    {kit.nutrition.protein}g
                  </Text>
                  <Text style={[styles.macroLbl, { color: colors.textMuted }]}>Protein</Text>
                </View>
                <View style={styles.macroCol}>
                  <Text style={[styles.macroVal, { color: colors.textPrimary }]}>
                    {kit.nutrition.carbs}g
                  </Text>
                  <Text style={[styles.macroLbl, { color: colors.textMuted }]}>Carbs</Text>
                </View>
                <View style={styles.macroCol}>
                  <Text style={[styles.macroVal, { color: colors.textPrimary }]}>
                    {kit.nutrition.fat}g
                  </Text>
                  <Text style={[styles.macroLbl, { color: colors.textMuted }]}>Fat</Text>
                </View>
                <View style={styles.macroCol}>
                  <Text style={[styles.macroVal, { color: colors.textPrimary }]}>
                    {kit.nutrition.fiber}g
                  </Text>
                  <Text style={[styles.macroLbl, { color: colors.textMuted }]}>Fiber</Text>
                </View>
              </View>
            </View>
          )}

          {/* Interactive Mise en Place Checklist */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 8,
            }}
          >
            <Text
              style={[styles.sectionSubtitle, { color: colors.textSecondary, marginBottom: 0 }]}
            >
              Pre-portioned Ingredients & Masalas
            </Text>
            <TouchableOpacity
              onPress={handleToggleAll}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary }}>
                {isAllChecked ? 'Uncheck All' : 'Check All'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.ingredientsGrid}>
            {(kit.ingredients || []).map((ing, idx) => {
              const isChecked = checkedIngredients.has(idx);
              return (
                <TouchableOpacity
                  key={idx}
                  onPress={() => toggleIngredientCheck(idx)}
                  activeOpacity={0.7}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isChecked }}
                  accessibilityLabel={`${ing.name}, ${ing.quantity}. ${isChecked ? 'Checked' : 'Unchecked'}`}
                  style={[
                    styles.ingItemRow,
                    {
                      backgroundColor: isChecked
                        ? colors.bgSuccessSubtle
                        : ing.isMasalaSachet
                          ? isDark
                            ? '#451A03'
                            : '#FFF7ED'
                          : isDark
                            ? '#1E293B'
                            : colors.bgSubtle,
                      borderColor: isChecked
                        ? colors.borderSuccessSubtle
                        : ing.isMasalaSachet
                          ? isDark
                            ? '#B45309'
                            : '#FED7AA'
                          : colors.borderLight,
                      borderRadius: radii.sm,
                    },
                  ]}
                >
                  <View style={{ marginRight: 8 }}>
                    <Icon
                      name={isChecked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={isChecked ? colors.textSuccess : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.ingName,
                        {
                          color: isChecked
                            ? colors.textSecondary
                            : ing.isMasalaSachet
                              ? colors.primary
                              : colors.textPrimary,
                          fontWeight: ing.isMasalaSachet ? '700' : '500',
                          textDecorationLine: isChecked ? 'line-through' : 'none',
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {ing.name}
                      {ing.isMasalaSachet ? ' (Masala Sachet)' : ''}
                    </Text>
                  </View>
                  <Text style={[styles.ingQty, { color: colors.textSecondary }]}>
                    {ing.quantity}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
  },
  expandedBody: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
  allergensWrap: {
    marginBottom: 10,
  },
  nutritionCard: {
    padding: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  nutritionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  macroCol: {
    alignItems: 'center',
  },
  macroVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  macroLbl: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ingredientsGrid: {
    gap: 6,
  },
  ingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  ingName: {
    fontSize: 12,
  },
  ingQty: {
    fontSize: 11,
    fontWeight: '600',
  },
});
