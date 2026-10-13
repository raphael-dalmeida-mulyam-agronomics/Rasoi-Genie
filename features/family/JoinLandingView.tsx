import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { familyStrings } from '../../framework/family/familyStrings';
import {
  redeemJoinLink,
  inspectJoinLink,
  FamilyRole,
  DependentType,
} from '../../framework/services/familyService';
import { createOrRestoreDependentSession } from '../../framework/services/familyAuthBridge';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { Icon } from '../../framework/ui/Icon';
import { Checkbox } from '../../framework/ui/Checkbox';
import { ConsentNotice } from './ConsentNotice';
import { markWelcomeScreenSeen } from '../../framework/services/guestService';
import {
  getStoredUserLocation,
  saveStoredUserLocation,
} from '../../framework/services/locationService';

export interface JoinLandingViewProps {
  token: string;
}

export const JoinLandingView: React.FC<JoinLandingViewProps> = ({ token }) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { refreshFamily } = useFamily();

  const [largeFont, setLargeFont] = useState(false);
  const [seniorAgreed, setSeniorAgreed] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [joinedSuccess, setJoinedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const t = familyStrings.joinLanding;

  const linkInfo = React.useMemo(() => {
    if (!token || token.trim().length < 8) return null;
    return inspectJoinLink(token.trim());
  }, [token]);

  useEffect(() => {
    if (!token || token.trim().length < 8) {
      setErrorMessage(t.errors.invalid);
    } else if (linkInfo?.expired) {
      setErrorMessage(t.errors.expired);
    }
  }, [token, linkInfo]);

  const handleJoin = async () => {
    if (!token || token.trim().length < 8) {
      setErrorMessage(t.errors.invalid);
      return;
    }

    if (linkInfo?.expired) {
      setErrorMessage(t.errors.expired);
      return;
    }

    if (linkInfo?.dependentType === 'senior' && !seniorAgreed) {
      setErrorMessage(t.seniorConsentCheck);
      return;
    }

    setErrorMessage(null);
    setIsJoining(true);

    try {
      // 1. Establish dependent session first to acquire its consistent UID
      const sessionResult = await createOrRestoreDependentSession(
        linkInfo?.displayName || 'Family Member',
        linkInfo?.dependentType || 'child',
        linkInfo?.familyId,
        linkInfo?.familyName,
      );

      if (!sessionResult.success || !sessionResult.session) {
        setErrorMessage(sessionResult.error || 'Failed to initialize session');
        return;
      }

      const uid = sessionResult.session.uid;

      // 2. Redeem join link using that exact UID
      const res = await redeemJoinLink(token.trim(), uid);

      if (!res.success) {
        setErrorMessage(res.error || t.errors.invalid);
        return;
      }

      // 3. Sync dependent session with authoritative server response
      if (res.familyId || res.familyName || res.displayName) {
        await createOrRestoreDependentSession(
          res.displayName || linkInfo?.displayName || 'Family Member',
          res.dependentType || linkInfo?.dependentType || 'child',
          res.familyId || linkInfo?.familyId,
          res.familyName || linkInfo?.familyName,
        );
      }

      await refreshFamily();
      await markWelcomeScreenSeen();
      const currentLoc = await getStoredUserLocation();
      if (!currentLoc) {
        await saveStoredUserLocation({
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          hub: 'North',
          isAutoDetected: false,
        });
      }
      setJoinedSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || t.errors.invalid);
    } finally {
      setIsJoining(false);
    }
  };

  const handleProceedToApp = () => {
    router.replace('/(tabs)' as any);
  };

  // Font size multiplier
  const textScale = largeFont ? 1.25 : 1.0;

  return (
    <ScrollView
      contentContainerStyle={[styles.container, { backgroundColor: colors.bgPrimary }]}
      showsVerticalScrollIndicator={false}
      testID="join-landing-view"
    >
      <View style={styles.contentWrap}>
        {/* Top Font-Size & Language Bar */}
        <View style={styles.topUtilityRow}>
          <TouchableOpacity
            testID="font-size-toggle"
            style={[
              styles.utilityChip,
              {
                backgroundColor: largeFont ? colors.primaryLight : colors.bgSurface,
                borderColor: largeFont ? colors.primary : colors.borderLight,
              },
            ]}
            onPress={() => setLargeFont(!largeFont)}
            accessibilityRole="button"
            accessibilityLabel="Toggle larger text size"
          >
            <Text
              style={[
                styles.utilityChipText,
                { color: largeFont ? colors.primary : colors.textPrimary },
              ]}
            >
              {largeFont ? 'A+ (Large Text)' : 'A (Standard Text)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Hero Branding */}
        <View style={styles.heroSection}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary }]}>
            <Icon name="restaurant" size={32 * textScale} color="#FFFFFF" />
          </View>
          <Text
            style={[styles.brandTitle, { color: colors.textPrimary, fontSize: 26 * textScale }]}
          >
            RasoiGenie
          </Text>
          <Text
            style={[styles.brandTagline, { color: colors.textSecondary, fontSize: 13 * textScale }]}
          >
            {t.logoTagline}
          </Text>
        </View>

        {/* Success View */}
        {joinedSuccess ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderColor: '#10B981',
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <View style={[styles.successIconCircle, { backgroundColor: '#D1FAE5' }]}>
              <Icon name="check" size={32 * textScale} color="#10B981" />
            </View>
            <Text
              style={[styles.cardTitle, { color: colors.textPrimary, fontSize: 20 * textScale }]}
            >
              {t.welcomeTitle}
            </Text>
            <Text
              style={[styles.cardDesc, { color: colors.textSecondary, fontSize: 14 * textScale }]}
            >
              {t.welcomeSubtitle}
            </Text>

            <TouchableOpacity
              style={[
                styles.bigCtaBtn,
                { backgroundColor: colors.primary, borderRadius: radii.xl },
              ]}
              onPress={handleProceedToApp}
              activeOpacity={0.85}
              testID="start-browsing-btn"
            >
              <Text style={[styles.bigCtaText, { fontSize: 16 * textScale }]}>
                {t.openExploreBtn}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            {/* Invitation Headline */}
            <Text
              style={[
                styles.inviteHeadline,
                { color: colors.textPrimary, fontSize: 18 * textScale },
              ]}
            >
              {linkInfo?.displayName && linkInfo?.familyName
                ? `${linkInfo.displayName}, you are invited to join ${linkInfo.familyName}!`
                : 'Your family invited you to pick authentic meal kits together!'}
            </Text>

            {/* Plain-Language Consent Explainer */}
            <ConsentNotice title={t.consentTitle} items={t.consentItems} note={t.noLoginRequired} />

            {/* Guardian Notice for Child vs Senior Consent Checkbox */}
            {linkInfo?.dependentType === 'child' ? (
              <View
                style={[
                  styles.childConsentBox,
                  {
                    backgroundColor: isDark ? 'rgba(234, 88, 12, 0.12)' : '#FFF7ED',
                    borderColor: isDark ? 'rgba(234, 88, 12, 0.3)' : '#FED7AA',
                    borderRadius: radii.md,
                  },
                ]}
              >
                <Icon
                  name="shield-checkmark"
                  size={20}
                  color={colors.primary}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    styles.childConsentText,
                    { color: colors.textPrimary, fontSize: 13 * textScale },
                  ]}
                >
                  Parent or legal guardian consent confirmed by{' '}
                  {linkInfo.familyName || 'the family owner'}.
                </Text>
              </View>
            ) : (
              <Checkbox
                card
                size={26}
                checked={seniorAgreed}
                onPress={() => setSeniorAgreed(!seniorAgreed)}
                label={t.seniorConsentCheck}
                labelStyle={{
                  fontSize: 14 * textScale,
                  lineHeight: 20 * textScale,
                  fontWeight: '600',
                }}
                accessibilityLabel={t.seniorConsentCheck}
                testID="senior-consent-check"
              />
            )}

            {/* Error Message */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Icon name="alert" size={18} color="#DC2626" style={{ marginRight: 8 }} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.errorText, { fontSize: 13 * textScale }]}>
                    {errorMessage}
                  </Text>
                  <Text style={[styles.errorHelp, { fontSize: 12 * textScale }]}>
                    {t.errors.askOwner('the family owner')}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* 56px Big Touch Target Join Button */}
            <TouchableOpacity
              style={[
                styles.bigCtaBtn,
                {
                  backgroundColor: colors.primary,
                  borderRadius: radii.xl,
                  opacity: isJoining ? 0.7 : 1,
                },
              ]}
              onPress={handleJoin}
              disabled={isJoining}
              activeOpacity={0.85}
              testID="join-family-big-btn"
            >
              {isJoining ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={[styles.bigCtaText, { fontSize: 17 * textScale }]}>{t.joinBtn}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrap: {
    width: '100%',
    maxWidth: 500,
    gap: 16,
  },
  topUtilityRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  utilityChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  utilityChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    marginVertical: 12,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  brandTitle: {
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  brandTagline: {
    marginTop: 4,
  },
  card: {
    padding: 22,
    borderWidth: 1.5,
    gap: 16,
  },
  inviteHeadline: {
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 24,
  },
  seniorCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56, // Accessible 56px touch target
    paddingVertical: 6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontWeight: '600',
    flex: 1,
  },
  childConsentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
  },
  childConsentText: {
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  bigCtaBtn: {
    height: 56, // Min 56px touch target
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  bigCtaText: {
    color: '#FFFFFF',
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  cardTitle: {
    fontWeight: '800',
    textAlign: 'center',
  },
  cardDesc: {
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  errorHelp: {
    color: '#991B1B',
    marginTop: 2,
  },
});
