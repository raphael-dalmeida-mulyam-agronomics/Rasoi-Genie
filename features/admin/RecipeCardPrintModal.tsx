import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { MealKit } from '../../framework/services/mealKitsService';
import { Button } from '../../framework/ui/Button';
import { Badge, getDietBadgeInfo } from '../../framework/ui/Badge';
import { Icon } from '../../framework/ui/Icon';

export interface RecipeCardPrintModalProps {
  visible: boolean;
  onClose: () => void;
  kit: MealKit;
  orderId?: string;
  customerName?: string;
}

export type RecipeCardSide = 'front' | 'back' | 'both';
export type CardPrintSize = 'A5' | '5x7' | 'A4';

/**
 * Triggers clean browser printing for the 2-sided recipe card.
 * Injects a dedicated print stylesheet that formats Page 1 as Front and Page 2 as Back.
 */
export function triggerRecipeCardPrint(
  kit: MealKit,
  options?: { orderId?: string; customerName?: string },
) {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const ingredientsListHtml = kit.ingredients
    .map(
      (ing) => `
      <div class="ing-item ${ing.isMasalaSachet ? 'sachet' : 'fresh'}">
        <div class="ing-bullet">${ing.isMasalaSachet ? '✦' : '•'}</div>
        <div class="ing-info">
          <div class="ing-name">${ing.name}</div>
          <div class="ing-sub">${ing.isMasalaSachet ? 'Chef Secret Masala Sachet' : 'Fresh Produce / Base'}</div>
        </div>
        <div class="ing-qty">${ing.quantity}</div>
      </div>
    `,
    )
    .join('');

  const recipeStepsHtml = (kit.recipeSteps || [])
    .map(
      (step) => `
      <div class="step-card">
        <div class="step-img-box">
          <img src="${step.imageUrl || kit.heroImage}" alt="Step ${step.stepNumber}" class="step-img" />
          <div class="step-badge">Step ${step.stepNumber}</div>
        </div>
        <div class="step-body">
          <div class="step-header">
            <span class="step-title">${step.title}</span>
            ${step.timerSeconds ? `<span class="step-timer">${Math.round(step.timerSeconds / 60)} mins</span>` : ''}
          </div>
          <div class="step-instruction">${step.instruction}</div>
          ${step.tip ? `<div class="step-tip"><strong>Chef Tip:</strong> ${step.tip}</div>` : ''}
        </div>
      </div>
    `,
    )
    .join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>RasoiGenie Recipe Card - ${kit.name}</title>
        <style>
          @page {
            size: A5 landscape;
            margin: 8mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          }
          body {
            background-color: #f3f4f6;
            color: #111827;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page {
            width: 210mm;
            min-height: 148mm;
            margin: 0 auto 20px auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            position: relative;
            display: flex;
            flex-direction: column;
            border: 2px solid #E5E7EB;
          }
          @media print {
            body {
              background: none;
            }
            .page {
              width: 100%;
              min-height: 100vh;
              margin: 0;
              border: none;
              box-shadow: none;
              page-break-after: always;
              break-after: page;
            }
            .no-print {
              display: none !important;
            }
          }
          
          /* FRONT PAGE */
          .front-header {
            background: linear-gradient(135deg, #FF6B35 0%, #D9480F 100%);
            color: #ffffff;
            padding: 14px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .brand-title {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 0.5px;
          }
          .brand-subtitle {
            font-size: 10px;
            opacity: 0.9;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          .tag-pill {
            background: rgba(255,255,255,0.25);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
          }
          .front-content {
            display: flex;
            flex: 1;
            padding: 16px;
            gap: 16px;
          }
          .front-left {
            width: 45%;
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .hero-img-container {
            position: relative;
            width: 100%;
            height: 190px;
            border-radius: 10px;
            overflow: hidden;
            border: 1px solid #E5E7EB;
          }
          .hero-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .hero-badge {
            position: absolute;
            bottom: 8px;
            left: 8px;
            background: rgba(0,0,0,0.75);
            color: #fff;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
          }
          .dish-title {
            font-size: 20px;
            font-weight: 800;
            color: #1F2937;
            line-height: 1.2;
          }
          .dish-hindi {
            font-size: 13px;
            font-weight: 700;
            color: #D9480F;
            margin-top: 2px;
          }
          .dish-meta-bar {
            display: flex;
            gap: 10px;
            font-size: 11px;
            font-weight: 700;
            color: #4B5563;
            background: #F9FAFB;
            padding: 6px 10px;
            border-radius: 6px;
            border: 1px solid #E5E7EB;
          }
          .nutrition-box {
            background: #F0FDF4;
            border: 1.5px solid #BBF7D0;
            border-radius: 8px;
            padding: 8px 6px;
            overflow: hidden;
            box-sizing: border-box;
            width: 100%;
          }
          .nutrition-title {
            font-size: 10.5px;
            font-weight: 800;
            color: #166534;
            text-transform: uppercase;
            margin-bottom: 5px;
            letter-spacing: 0.3px;
          }
          .macro-grid {
            display: grid;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            gap: 4px;
            text-align: center;
            width: 100%;
            box-sizing: border-box;
          }
          .macro-cell {
            background: #fff;
            padding: 4px 1px;
            border-radius: 4px;
            border: 1px solid #DCFCE7;
            overflow: hidden;
            min-width: 0;
            box-sizing: border-box;
          }
          .macro-val {
            font-size: 11px;
            font-weight: 800;
            color: #166534;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .macro-lbl {
            font-size: 8px;
            font-weight: 700;
            color: #4B5563;
            text-transform: uppercase;
          }
          
          .front-right {
            width: 55%;
            display: flex;
            flex-direction: column;
          }
          .ingredients-header {
            font-size: 14px;
            font-weight: 800;
            color: #1F2937;
            margin-bottom: 8px;
            padding-bottom: 4px;
            border-bottom: 2px solid #FF6B35;
            display: flex;
            justify-content: space-between;
          }
          .ingredients-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            flex: 1;
          }
          .ing-item {
            display: flex;
            align-items: center;
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 12px;
          }
          .ing-item.sachet {
            background: #FFF7ED;
            border-color: #FED7AA;
          }
          .ing-bullet {
            font-size: 14px;
            margin-right: 8px;
          }
          .ing-info {
            flex: 1;
          }
          .ing-name {
            font-weight: 700;
            color: #1F2937;
          }
          .ing-sub {
            font-size: 9px;
            color: #6B7280;
            font-weight: 600;
          }
          .ing-qty {
            font-size: 11px;
            font-weight: 800;
            color: #D9480F;
            background: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #E5E7EB;
          }
          .front-footer {
            background: #F9FAFB;
            border-top: 1px solid #E5E7EB;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 10px;
            color: #6B7280;
          }
          
          /* BACK PAGE */
          .back-header {
            background: #1F2937;
            color: #ffffff;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .back-title {
            font-size: 16px;
            font-weight: 800;
          }
          .back-steps-container {
            padding: 14px 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            flex: 1;
          }
          .step-card {
            display: flex;
            gap: 12px;
            background: #F9FAFB;
            border: 1px solid #E5E7EB;
            border-radius: 8px;
            padding: 10px;
            align-items: flex-start;
          }
          .step-img-box {
            position: relative;
            width: 110px;
            height: 75px;
            border-radius: 6px;
            overflow: hidden;
            flex-shrink: 0;
            border: 1px solid #D1D5DB;
          }
          .step-img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .step-badge {
            position: absolute;
            top: 4px;
            left: 4px;
            background: #FF6B35;
            color: #fff;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 9px;
            font-weight: 800;
          }
          .step-body {
            flex: 1;
          }
          .step-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 4px;
          }
          .step-title {
            font-size: 13px;
            font-weight: 800;
            color: #111827;
          }
          .step-timer {
            font-size: 10px;
            font-weight: 700;
            color: #D9480F;
            background: #FFF7ED;
            padding: 2px 6px;
            border-radius: 4px;
            border: 1px solid #FFEDD5;
          }
          .step-instruction {
            font-size: 11px;
            line-height: 1.4;
            color: #374151;
            margin-bottom: 4px;
          }
          .step-tip {
            font-size: 10px;
            background: #FEF3C7;
            color: #92400E;
            padding: 4px 8px;
            border-radius: 4px;
            border: 1px solid #FDE68A;
          }
          .back-footer {
            background: #111827;
            color: #9CA3AF;
            padding: 8px 16px;
            font-size: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
        </style>
      </head>
      <body>
        <!-- PAGE 1: FRONT OF CARD -->
        <div class="page">
          <div class="front-header">
            <div>
              <div class="brand-title">RASOI GENIE MEAL KIT</div>
              <div class="brand-subtitle">Chef Portion Fresh Kitchen Companion</div>
            </div>
            <div style="text-align: right;">
              <span class="tag-pill">${kit.cuisine} • ${kit.diet === 'veg' ? 'VEG' : kit.diet === 'nonveg' ? 'NON-VEG' : kit.diet.toUpperCase()} • ${kit.dishCategory || 'Curries & Gravies'}</span>
              <div style="font-size: 10px; font-weight: 700; color: #b45309; margin-top: 4px;">Allergens: ${kit.allergens && kit.allergens.length > 0 ? kit.allergens.join(', ') : 'None Reported'}</div>
            </div>
          </div>

          <div class="front-content">
            <div class="front-left">
              <div class="hero-img-container">
                <img src="${kit.heroImage}" alt="${kit.name}" class="hero-img" />
                <div class="hero-badge">Final Plating Presentation</div>
              </div>

              <div>
                <div class="dish-title">${kit.name}</div>
                ${kit.hindiName ? `<div class="dish-hindi">${kit.hindiName}</div>` : ''}
              </div>

              <div class="dish-meta-bar">
                <span>Cook: ${kit.cookTimeMinutes}m</span>
                <span>Prep: ${kit.prepTimeMinutes}m</span>
                <span>${kit.servings} Servings</span>
                <span>${kit.spiceLevel}</span>
              </div>

              <div class="nutrition-box">
                <div class="nutrition-title">Nutrition Facts (Per Serving)</div>
                <div class="macro-grid">
                  <div class="macro-cell">
                    <div class="macro-val">${kit.nutrition?.calories || 0}</div>
                    <div class="macro-lbl">Cal</div>
                  </div>
                  <div class="macro-cell">
                    <div class="macro-val">${kit.nutrition?.protein || 0}g</div>
                    <div class="macro-lbl">Prot</div>
                  </div>
                  <div class="macro-cell">
                    <div class="macro-val">${kit.nutrition?.carbs || 0}g</div>
                    <div class="macro-lbl">Carb</div>
                  </div>
                  <div class="macro-cell">
                    <div class="macro-val">${kit.nutrition?.fat || 0}g</div>
                    <div class="macro-lbl">Fat</div>
                  </div>
                  <div class="macro-cell">
                    <div class="macro-val">${kit.nutrition?.fiber || 0}g</div>
                    <div class="macro-lbl">Fib</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="front-right">
              <div class="ingredients-header">
                <span>Ingredients In This Kit Box</span>
                <span>${kit.ingredients.length} items</span>
              </div>
              <div class="ingredients-list">
                ${ingredientsListHtml}
              </div>
            </div>
          </div>

          <div class="front-footer">
            <span>Pack ID: ${options?.orderId || kit.id} • Packed for Fresh Delivery</span>
            <span>Turn card over for step-by-step cooking guide &rarr;</span>
          </div>
        </div>

        <!-- PAGE 2: BACK OF CARD -->
        <div class="page">
          <div class="back-header">
            <div>
              <div class="back-title">Master Chef Step-by-Step Cooking Guide</div>
              <div style="font-size: 10px; opacity: 0.85;">${kit.name} • Perfect restaurant taste in ${kit.cookTimeMinutes} minutes</div>
            </div>
            <div style="font-size: 11px; font-weight: 700; color: #FCA5A5;">
              Customer Prep Guide
            </div>
          </div>

          <div class="back-steps-container">
            ${recipeStepsHtml}
          </div>

          <div class="back-footer">
            <span>Crafted with authentic slow-roasted whole spices & fresh ingredients</span>
            <span>Customer Care: support@mulyam.in | WhatsApp: +91 98765 43210</span>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Visual Front Side of the Customer Recipe Card
 */
export const RecipeCardFrontView: React.FC<{
  kit: MealKit;
  orderId?: string;
}> = ({ kit, orderId }) => {
  const { colors, radii, shadows } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
      ]}
    >
      {/* Front Header */}
      <View style={[styles.cardHeader, { backgroundColor: colors.primary }]}>
        <View>
          <Text style={styles.cardHeaderBrand}>RASOI GENIE MEAL KIT</Text>
          <Text style={styles.cardHeaderSub}>Chef Portion Fresh Kitchen Companion</Text>
        </View>
        <Badge
          label={`${kit.cuisine} • ${kit.diet === 'veg' ? 'VEG' : kit.diet === 'nonveg' ? 'NON-VEG' : kit.diet.toUpperCase()} • ${kit.dishCategory || 'Curries & Gravies'}`}
          variant="accent"
          size="sm"
        />
      </View>

      <View style={styles.cardBodyRow}>
        {/* Left Column: Hero & Nutrition */}
        <View style={styles.cardLeftCol}>
          <View style={styles.heroWrapper}>
            <Image source={{ uri: kit.heroImage }} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroOverlayBadge}>
              <Text style={styles.heroOverlayText}>Final Dish Presentation</Text>
            </View>
          </View>

          <Text style={[styles.dishTitle, { color: colors.textPrimary }]} numberOfLines={2}>
            {kit.name}
          </Text>
          {kit.hindiName ? (
            <Text style={[styles.dishHindi, { color: colors.primaryDark }]}>{kit.hindiName}</Text>
          ) : null}

          {/* Quick Metrics */}
          <View
            style={[
              styles.metricsRow,
              { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
            ]}
          >
            <Text style={[styles.metricText, { color: colors.textPrimary }]}>
              <Text style={{ fontWeight: '800' }}>{kit.cookTimeMinutes}m</Text> Cook
            </Text>
            <Text style={[styles.metricText, { color: colors.textPrimary }]}>
              <Text style={{ fontWeight: '800' }}>{kit.prepTimeMinutes}m</Text> Prep
            </Text>
            <Text style={[styles.metricText, { color: colors.textPrimary }]}>
              <Text style={{ fontWeight: '800' }}>{kit.servings}</Text> Servings
            </Text>
            <Text style={[styles.metricText, { color: colors.textPrimary }]}>{kit.spiceLevel}</Text>
          </View>

          {/* Allergens Advisory */}
          <View style={{ marginTop: 6, marginBottom: 2 }}>
            <Badge
              label={`Allergens: ${kit.allergens && kit.allergens.length > 0 ? kit.allergens.join(', ') : 'None Reported'}`}
              variant={kit.allergens && kit.allergens.length > 0 ? 'warning' : 'success'}
              size="sm"
            />
          </View>

          {/* Nutritional Highlights */}
          <View
            style={[styles.nutritionBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
          >
            <Text style={styles.nutritionBoxTitle} numberOfLines={1}>
              Nutrition Facts (Per Serving)
            </Text>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroVal} numberOfLines={1}>
                  {kit.nutrition?.calories || 0}
                </Text>
                <Text style={styles.macroLbl} numberOfLines={1}>
                  Cal
                </Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroVal} numberOfLines={1}>
                  {kit.nutrition?.protein || 0}g
                </Text>
                <Text style={styles.macroLbl} numberOfLines={1}>
                  Prot
                </Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroVal} numberOfLines={1}>
                  {kit.nutrition?.carbs || 0}g
                </Text>
                <Text style={styles.macroLbl} numberOfLines={1}>
                  Carb
                </Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroVal} numberOfLines={1}>
                  {kit.nutrition?.fat || 0}g
                </Text>
                <Text style={styles.macroLbl} numberOfLines={1}>
                  Fat
                </Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroVal} numberOfLines={1}>
                  {kit.nutrition?.fiber || 0}g
                </Text>
                <Text style={styles.macroLbl} numberOfLines={1}>
                  Fib
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Right Column: Labeled Kit Ingredients */}
        <View style={styles.cardRightCol}>
          <View style={[styles.ingredientsHeaderRow, { borderBottomColor: colors.primary }]}>
            <Text style={[styles.ingredientsHeaderTitle, { color: colors.textPrimary }]}>
              Items in This Kit Box
            </Text>
            <Text style={[styles.ingredientsCountText, { color: colors.textMuted }]}>
              {kit.ingredients.length} items
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 310 }} showsVerticalScrollIndicator={false}>
            {kit.ingredients.map((ing, idx) => (
              <View
                key={idx}
                style={[
                  styles.ingItemRow,
                  {
                    backgroundColor: ing.isMasalaSachet ? '#FFF7ED' : colors.bgSubtle,
                    borderColor: ing.isMasalaSachet ? '#FED7AA' : colors.borderLight,
                  },
                ]}
              >
                <Text style={{ fontSize: 13, marginRight: 6 }}>
                  {ing.isMasalaSachet ? '✦' : '•'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.ingItemName,
                      { color: ing.isMasalaSachet ? colors.primaryDark : colors.textPrimary },
                    ]}
                    numberOfLines={1}
                  >
                    {ing.name}
                  </Text>
                  <Text style={[styles.ingItemSub, { color: colors.textMuted }]}>
                    {ing.isMasalaSachet ? 'Chef Secret Masala Sachet' : 'Fresh Kitchen Produce'}
                  </Text>
                </View>
                <Badge
                  label={ing.quantity}
                  variant={ing.isMasalaSachet ? 'primary' : 'neutral'}
                  size="sm"
                />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Front Footer */}
      <View
        style={[
          styles.cardFooter,
          { backgroundColor: colors.bgSubtle, borderTopColor: colors.borderLight },
        ]}
      >
        <Text style={[styles.cardFooterText, { color: colors.textMuted }]}>
          Pack Code: {orderId || kit.id} • Fresh Sealed Portioning
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={[styles.cardFooterText, { color: colors.primary, fontWeight: '700' }]}>
            Turn card over for step-by-step instructions
          </Text>
          <Icon name="arrow-forward" size={12} color={colors.primary} />
        </View>
      </View>
    </View>
  );
};

/**
 * Visual Back Side of the Customer Recipe Card with Step Photos
 */
export const RecipeCardBackView: React.FC<{
  kit: MealKit;
}> = ({ kit }) => {
  const { colors, radii, shadows } = useTheme();

  return (
    <View
      style={[
        styles.cardContainer,
        { backgroundColor: colors.bgSurface, borderColor: colors.borderLight },
      ]}
    >
      {/* Back Header */}
      <View style={[styles.cardHeader, { backgroundColor: '#1F2937' }]}>
        <View>
          <Text style={styles.cardHeaderBrand}>STEP-BY-STEP RECIPE INSTRUCTIONS</Text>
          <Text style={styles.cardHeaderSub}>{kit.name} • Master Chef Home Prep Guide</Text>
        </View>
        <Badge label={`⏱️ ${kit.cookTimeMinutes} mins total`} variant="accent" size="sm" />
      </View>

      <ScrollView style={{ padding: 12, maxHeight: 380 }} showsVerticalScrollIndicator={true}>
        {(kit.recipeSteps || []).map((step) => (
          <View
            key={step.stepNumber}
            style={[
              styles.stepCardRow,
              { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
            ]}
          >
            {/* Step Photo */}
            <View style={styles.stepThumbBox}>
              <Image
                source={{ uri: step.imageUrl || kit.heroImage }}
                style={styles.stepThumbImg}
                resizeMode="cover"
              />
              <View style={[styles.stepNumPill, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepNumPillText}>{step.stepNumber}</Text>
              </View>
            </View>

            {/* Step Instruction Details */}
            <View style={{ flex: 1 }}>
              <View style={styles.stepTitleRow}>
                <Text
                  style={[styles.stepTitleText, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {step.title}
                </Text>
                {step.timerSeconds ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon name="time-outline" size={12} color={colors.primary} />
                    <Text style={[styles.stepTimerText, { color: colors.primary }]}>
                      {Math.round(step.timerSeconds / 60)} mins
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={[styles.stepInstructionText, { color: colors.textSecondary }]}>
                {step.instruction}
              </Text>

              {step.tip ? (
                <View style={styles.stepTipBox}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                    <Icon name="sparkles" size={13} color="#B45309" style={{ marginTop: 1 }} />
                    <Text style={[styles.stepTipText, { flex: 1 }]}>
                      <Text style={{ fontWeight: '700' }}>Chef Tip:</Text> {step.tip}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Back Footer */}
      <View style={[styles.cardFooter, { backgroundColor: '#111827', borderTopColor: '#374151' }]}>
        <Text style={{ fontSize: 10, color: '#9CA3AF' }}>
          Freshly sourced ingredients & authentic slow-roasted spices
        </Text>
        <Text style={{ fontSize: 10, color: '#D1D5DB', fontWeight: '700' }}>
          Customer Help: support@mulyam.in
        </Text>
      </View>
    </View>
  );
};

/**
 * Full Recipe Card Print Modal with Side Switcher & Browser Print Engine
 */
export const RecipeCardPrintModal: React.FC<RecipeCardPrintModalProps> = ({
  visible,
  onClose,
  kit,
  orderId,
  customerName,
}) => {
  const { colors, radii, shadows } = useTheme();
  const [activeSide, setActiveSide] = useState<RecipeCardSide>('front');

  const handlePrint = () => {
    triggerRecipeCardPrint(kit, { orderId, customerName });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalDialog,
            { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
          ]}
        >
          {/* Top Bar */}
          <View style={[styles.topBar, { borderBottomColor: colors.borderLight }]}>
            <View>
              <Text style={[styles.topBarTitle, { color: colors.textPrimary }]}>
                Print Recipe Card For Box Package
              </Text>
              <Text style={[styles.topBarSub, { color: colors.textSecondary }]}>
                Insert card into package for customer: {kit.name}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Side Switcher & Print Controls */}
          <View style={styles.controlsRow}>
            <View style={styles.sideTabs}>
              <TouchableOpacity
                onPress={() => setActiveSide('front')}
                style={[
                  styles.sideTabBtn,
                  activeSide === 'front' && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sideTabText,
                    { color: activeSide === 'front' ? '#fff' : colors.textPrimary },
                  ]}
                >
                  Front Page (Ingredients & Nutrition)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveSide('back')}
                style={[
                  styles.sideTabBtn,
                  activeSide === 'back' && {
                    backgroundColor: colors.primary,
                    borderColor: colors.primary,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.sideTabText,
                    { color: activeSide === 'back' ? '#fff' : colors.textPrimary },
                  ]}
                >
                  Back Page (Cooking Steps & Photos)
                </Text>
              </TouchableOpacity>
            </View>

            <Button title="Print 2-Sided Card" variant="primary" size="sm" onPress={handlePrint} />
          </View>

          {/* Card View Canvas */}
          <View style={styles.canvasContainer}>
            {activeSide === 'front' ? (
              <RecipeCardFrontView kit={kit} orderId={orderId} />
            ) : (
              <RecipeCardBackView kit={kit} />
            )}
          </View>

          {/* Bottom Actions */}
          <View style={[styles.dialogFooter, { borderTopColor: colors.borderLight }]}>
            <Text style={{ fontSize: 11, color: colors.textMuted, flex: 1 }}>
              Both Front and Back pages print on standard 2-sided A5 or 5x7" packaging inserts.
            </Text>
            <Button title="Close" variant="secondary" size="sm" onPress={onClose} />
            <Button title="Print Now" variant="primary" size="sm" onPress={handlePrint} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 820,
    maxHeight: '92%',
    overflow: 'hidden',
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  topBarSub: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsRow: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  sideTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  sideTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  sideTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  canvasContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  dialogFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // Visual Card Styles
  cardContainer: {
    borderWidth: 1.5,
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderBrand: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cardHeaderSub: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardBodyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 14,
    gap: 14,
  },
  cardLeftCol: {
    flex: 1,
    minWidth: 260,
    gap: 8,
  },
  cardRightCol: {
    flex: 1.1,
    minWidth: 260,
  },
  heroWrapper: {
    position: 'relative',
    height: 140,
    borderRadius: 8,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  heroOverlayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  dishTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  dishHindi: {
    fontSize: 12,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  metricText: {
    fontSize: 11,
    fontWeight: '600',
  },
  nutritionBox: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
    width: '100%',
  },
  nutritionBoxTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#166534',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  macroRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    justifyContent: 'space-between',
    width: '100%',
  },
  macroItem: {
    flex: 1,
    minWidth: 42,
    backgroundColor: '#fff',
    paddingHorizontal: 2,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  macroVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
    textAlign: 'center',
  },
  macroLbl: {
    fontSize: 8,
    fontWeight: '700',
    color: '#4B5563',
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  ingredientsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 6,
    borderBottomWidth: 2,
    marginBottom: 6,
  },
  ingredientsHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
  },
  ingredientsCountText: {
    fontSize: 11,
  },
  ingItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 4,
  },
  ingItemName: {
    fontSize: 11,
    fontWeight: '700',
  },
  ingItemSub: {
    fontSize: 9,
  },
  cardFooter: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardFooterText: {
    fontSize: 10,
  },

  // Back Side Specific Styles
  stepCardRow: {
    flexDirection: 'row',
    gap: 10,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  stepThumbBox: {
    position: 'relative',
    width: 90,
    height: 65,
    borderRadius: 6,
    overflow: 'hidden',
  },
  stepThumbImg: {
    width: '100%',
    height: '100%',
  },
  stepNumPill: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepNumPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
  },
  stepTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepTitleText: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  stepTimerText: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stepInstructionText: {
    fontSize: 11,
    lineHeight: 15,
  },
  stepTipBox: {
    marginTop: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stepTipText: {
    fontSize: 10,
    color: '#92400E',
  },
});
