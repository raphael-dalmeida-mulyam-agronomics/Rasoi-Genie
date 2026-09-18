import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Button } from '../../framework/ui/Button';
import { PillTag } from '../../framework/ui/PillTag';
import {
  CuisineType,
  DietTag,
  RegionHub,
  SpiceLevel,
} from '../../framework/services/mealKitsService';
import { PaymentMethod } from '../../framework/context/CartContext';

const { width } = Dimensions.get('window');

const ALL_CUISINES: { id: CuisineType; name: string; emoji: string }[] = [
  { id: 'North Indian', name: 'North Indian', emoji: '🥘' },
  { id: 'South Indian', name: 'South Indian', emoji: '🥞' },
  { id: 'Punjabi', name: 'Punjabi', emoji: '🫓' },
  { id: 'Hyderabadi', name: 'Hyderabadi', emoji: '🍚' },
  { id: 'Mughlai', name: 'Mughlai', emoji: '🍖' },
  { id: 'Coastal', name: 'Coastal & Malabar', emoji: '🐟' },
  { id: 'Gujarati', name: 'Gujarati', emoji: '🍲' },
  { id: 'Indo-Chinese', name: 'Indo-Chinese', emoji: '🥢' },
  { id: 'Italian', name: 'Italian', emoji: '🍕' },
  { id: 'Mexican', name: 'Mexican', emoji: '🌮' },
  { id: 'Continental', name: 'Continental', emoji: '🥗' },
  { id: 'American', name: 'American', emoji: '🍔' },
];

const DIET_OPTIONS: { id: DietTag | 'all'; label: string; emoji: string; desc: string }[] = [
  { id: 'veg', label: 'Vegetarian', emoji: '🥬', desc: '100% vegetarian dishes, paneer & lentils' },
  {
    id: 'nonveg',
    label: 'Non-Vegetarian',
    emoji: '🍗',
    desc: 'Chicken, meats, seafood & egg options',
  },
  { id: 'jain', label: 'Jain Friendly', emoji: '🌱', desc: 'No root vegetables, onions or garlic' },
  { id: 'vegan', label: 'Vegan', emoji: '🥑', desc: 'Strictly plant-based, 100% dairy-free' },
  {
    id: 'keto',
    label: 'Keto Low-Carb',
    emoji: '🥩',
    desc: 'High protein, healthy fats, under 15g carbs',
  },
  { id: 'gluten-free', label: 'Gluten-Free', emoji: '🌾', desc: 'Zero wheat, gluten-free grains' },
];

const SPICE_OPTIONS: { id: SpiceLevel; label: string; heat: string; desc: string }[] = [
  { id: 'Mild', label: 'Mild', heat: '🌶️', desc: 'Gentle, aromatic, child-friendly heat' },
  {
    id: 'Medium',
    label: 'Medium',
    heat: '🌶️🌶️',
    desc: 'Balanced authentic Indian restaurant heat',
  },
  { id: 'Spicy', label: 'Spicy', heat: '🌶️🌶️🌶️', desc: 'Rich, bold & traditional Dhaba warmth' },
  {
    id: 'Fiery',
    label: 'Fiery',
    heat: '🌶️🌶️🌶️🌶️',
    desc: 'Intense heat for Andhra & Kolhapuri lovers',
  },
];

const ALLERGY_OPTIONS = [
  'Peanuts',
  'Dairy',
  'Gluten / Wheat',
  'Tree Nuts',
  'Soy',
  'Seafood / Shellfish',
  'Sesame',
  'Mustard',
];

const REGIONAL_HUBS: { id: RegionHub; name: string; cityInfo: string }[] = [
  { id: 'South', name: 'South Hub', cityInfo: 'Bengaluru, Hyderabad, Chennai' },
  { id: 'West', name: 'West Hub', cityInfo: 'Mumbai, Pune, Ahmedabad' },
  { id: 'North', name: 'North Hub', cityInfo: 'Delhi NCR, Chandigarh, Jaipur' },
  { id: 'East', name: 'East Hub', cityInfo: 'Kolkata, Bhubaneswar' },
];

const PAYMENT_OPTIONS: { id: PaymentMethod; title: string; subtitle: string; icon: string }[] = [
  { id: 'UPI', title: 'UPI Instant Pay', subtitle: 'Google Pay, PhonePe, Paytm, BHIM', icon: '⚡' },
  {
    id: 'Card',
    title: 'Credit / Debit Card',
    subtitle: 'Visa, Mastercard, RuPay & Amex',
    icon: '💳',
  },
  {
    id: 'Cash on Delivery',
    title: 'Cash on Delivery',
    subtitle: 'Pay at your doorstep on arrival',
    icon: '💵',
  },
  {
    id: 'Wallet',
    title: 'Wallets & Net Banking',
    subtitle: 'Paytm Wallet, Amazon Pay, NetBanking',
    icon: '🏦',
  },
];

export const OnboardingWizardView: React.FC = () => {
  const { user } = useAuth();
  const { completeOnboarding } = usePreferences();
  const { colors, radii, shadows } = useTheme();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // Step 1: Cuisines & Spice
  const [selectedCuisines, setSelectedCuisines] = useState<CuisineType[]>([
    'North Indian',
    'South Indian',
  ]);
  const [spiceTolerance, setSpiceTolerance] = useState<SpiceLevel>('Medium');

  // Step 2: Diets & Allergies
  const [dietType, setDietType] = useState<DietTag | 'all'>('veg');
  const [allergies, setAllergies] = useState<string[]>([]);

  // Step 3: Address & Hub
  const [name, setName] = useState<string>(user?.displayName || '');
  const [phone, setPhone] = useState<string>(user?.phoneNumber || '');
  const [flatAndStreet, setFlatAndStreet] = useState<string>('');
  const [areaAndLandmark, setAreaAndLandmark] = useState<string>('');
  const [city, setCity] = useState<string>('Bengaluru');
  const [pincode, setPincode] = useState<string>('');
  const [regionHub, setRegionHub] = useState<RegionHub>('South');
  const [addressTag, setAddressTag] = useState<'Home' | 'Work' | 'Other'>('Home');

  // Step 4: Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleCuisine = (c: CuisineType) => {
    setSelectedCuisines((prev) =>
      prev.includes(c)
        ? prev.length > 1
          ? prev.filter((item) => item !== c)
          : prev
        : [...prev, c],
    );
  };

  const toggleAllergy = (a: string) => {
    setAllergies((prev) => (prev.includes(a) ? prev.filter((item) => item !== a) : [...prev, a]));
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      if (selectedCuisines.length === 0) {
        Alert.alert('Cuisine Selection', 'Please select at least one preferred cuisine.');
        return;
      }
    } else if (currentStep === 3) {
      if (!name.trim()) {
        Alert.alert('Name Required', 'Please enter your delivery contact name.');
        return;
      }
      if (!phone.trim()) {
        Alert.alert('Phone Required', 'Please enter a contact phone number.');
        return;
      }
      if (!flatAndStreet.trim()) {
        Alert.alert('Address Required', 'Please enter flat / house number and street.');
        return;
      }
      if (!city.trim()) {
        Alert.alert('City Required', 'Please enter your delivery city.');
        return;
      }
      if (!pincode.trim() || pincode.trim().length < 5) {
        Alert.alert('Pincode Required', 'Please enter a valid 6-digit postal pincode.');
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        cuisines: selectedCuisines,
        dietType,
        allergies,
        spiceTolerance,
        address: {
          name: name.trim() || 'Valued Chef',
          phone: phone.trim() || '+91 9876543210',
          flatAndStreet: flatAndStreet.trim() || 'Flat 101, Main Road',
          areaAndLandmark: areaAndLandmark.trim(),
          city: city.trim() || 'Bengaluru',
          pincode: pincode.trim() || '560001',
          tag: addressTag,
          isDefault: true,
        },
        paymentMethod,
        regionHub,
        currentCity: city.trim() || 'Bengaluru',
      });
    } catch (err: any) {
      Alert.alert('Save Error', err?.message || 'Could not save profile setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Header Banner */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.badgeRow}>
          <Text style={styles.brandTitle}>RasoiGenie 🪔</Text>
          <View style={[styles.stepBadge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.stepBadgeText, { color: colors.primary }]}>
              Step {currentStep} of {totalSteps}
            </Text>
          </View>
        </View>

        <Text style={[styles.welcomeHeadline, { color: colors.textPrimary }]}>
          {currentStep === 1 && 'What flavors excite your palate? 🍲'}
          {currentStep === 2 && 'Your dietary lifestyle & allergies 🥗'}
          {currentStep === 3 && 'Where should we deliver your fresh kits? 📍'}
          {currentStep === 4 && 'How would you prefer to pay? 💳'}
        </Text>
        <Text style={[styles.welcomeSubtext, { color: colors.textSecondary }]}>
          {currentStep === 1 && 'Tailor your daily meal kit recommendations and recipe discovery.'}
          {currentStep === 2 &&
            'We curate ingredients strictly following your nutrition & allergen needs.'}
          {currentStep === 3 &&
            'Fast scheduled delivery from your nearest fresh regional kitchen hub.'}
          {currentStep === 4 &&
            'Select your default checkout method (you can change this anytime).'}
        </Text>

        {/* Progress Bar */}
        <View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                backgroundColor: colors.primary,
                width: `${(currentStep / totalSteps) * 100}%`,
              },
            ]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* STEP 1: CUISINES & SPICE */}
        {currentStep === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Favorite Cuisines (Select at least 1)
            </Text>
            <View style={styles.chipsWrap}>
              {ALL_CUISINES.map((item) => {
                const isSelected = selectedCuisines.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => toggleCuisine(item.id)}
                    style={[
                      styles.cuisineChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.bgSurface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cuisineEmoji}>{item.emoji}</Text>
                    <Text
                      style={[
                        styles.cuisineChipText,
                        { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                      ]}
                    >
                      {item.name}
                    </Text>
                    {isSelected && <Text style={styles.checkIcon}> ✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
              Spice Heat Tolerance
            </Text>
            <View style={styles.listWrap}>
              {SPICE_OPTIONS.map((spice) => {
                const isSelected = spiceTolerance === spice.id;
                return (
                  <TouchableOpacity
                    key={spice.id}
                    onPress={() => setSpiceTolerance(spice.id)}
                    style={[
                      styles.selectableCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    <View style={styles.cardInfoCol}>
                      <View style={styles.cardHeaderRow}>
                        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                          {spice.label} {spice.heat}
                        </Text>
                      </View>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        {spice.desc}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 2: DIETS & ALLERGIES */}
        {currentStep === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Primary Diet Type
            </Text>
            <View style={styles.listWrap}>
              {DIET_OPTIONS.map((diet) => {
                const isSelected = dietType === diet.id;
                return (
                  <TouchableOpacity
                    key={diet.id}
                    onPress={() => setDietType(diet.id)}
                    style={[
                      styles.selectableCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dietEmoji}>{diet.emoji}</Text>
                    <View style={styles.cardInfoCol}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        {diet.label}
                      </Text>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        {diet.desc}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
              Food Allergens & Intolerances (Optional)
            </Text>
            <View style={styles.chipsWrap}>
              {ALLERGY_OPTIONS.map((allergy) => {
                const isSelected = allergies.includes(allergy);
                return (
                  <TouchableOpacity
                    key={allergy}
                    onPress={() => toggleAllergy(allergy)}
                    style={[
                      styles.allergyChip,
                      {
                        backgroundColor: isSelected ? colors.accent + '25' : colors.bgSurface,
                        borderColor: isSelected ? colors.accent : colors.borderLight,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.allergyText,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                      ]}
                    >
                      {isSelected ? `⚠️ ${allergy}` : allergy}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 3: ADDRESS & REGIONAL HUB */}
        {currentStep === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Regional Delivery Kitchen Hub
            </Text>
            <View style={styles.hubGrid}>
              {REGIONAL_HUBS.map((hub) => {
                const isSelected = regionHub === hub.id;
                return (
                  <TouchableOpacity
                    key={hub.id}
                    onPress={() => setRegionHub(hub.id)}
                    style={[
                      styles.hubCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.hubName, { color: colors.textPrimary }]}>
                      {hub.name} {isSelected ? '📍' : ''}
                    </Text>
                    <Text style={[styles.hubDesc, { color: colors.textSecondary }]}>
                      {hub.cityInfo}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginTop: 24 }]}>
              Primary Delivery Address
            </Text>

            <View style={styles.tagRow}>
              {(['Home', 'Work', 'Other'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setAddressTag(t)}
                  style={[
                    styles.tagButton,
                    {
                      backgroundColor: addressTag === t ? colors.primary : colors.bgSurface,
                      borderColor: addressTag === t ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tagButtonText,
                      { color: addressTag === t ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {t === 'Home' ? '🏠 Home' : t === 'Work' ? '🏢 Work' : '📍 Other'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formCol}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Priya Sharma"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Mobile Phone *</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
                value={phone}
                onChangeText={setPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Flat, House No. & Street *
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
                value={flatAndStreet}
                onChangeText={setFlatAndStreet}
                placeholder="Flat 402, Green Glen Layout, 14th Main"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Area & Landmark</Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    color: colors.textPrimary,
                  },
                ]}
                value={areaAndLandmark}
                onChangeText={setAreaAndLandmark}
                placeholder="Near Outer Ring Road, Bellandur"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>City *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderLight,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={city}
                    onChangeText={setCity}
                    placeholder="Bengaluru"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Pincode *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderLight,
                        color: colors.textPrimary,
                      },
                    ]}
                    value={pincode}
                    onChangeText={setPincode}
                    placeholder="560103"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* STEP 4: PAYMENT METHOD */}
        {currentStep === 4 && (
          <View style={styles.stepContent}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Default Checkout Method
            </Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              We will set this as your default when placing meal kit orders.
            </Text>

            <View style={styles.listWrap}>
              {PAYMENT_OPTIONS.map((opt) => {
                const isSelected = paymentMethod === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    onPress={() => setPaymentMethod(opt.id)}
                    style={[
                      styles.selectableCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                        borderWidth: isSelected ? 2 : 1,
                      },
                      shadows.soft,
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.payEmoji}>{opt.icon}</Text>
                    <View style={styles.cardInfoCol}>
                      <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                        {opt.title}
                      </Text>
                      <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                        {opt.subtitle}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          backgroundColor: isSelected ? colors.primary : 'transparent',
                        },
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Summary Confirmation Banner */}
            <View
              style={[
                styles.summaryBanner,
                { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' },
              ]}
            >
              <Text style={[styles.summaryTitle, { color: colors.primary }]}>
                🎉 You’re all set for the RasoiGenie experience!
              </Text>
              <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                Cuisines: {selectedCuisines.join(', ')} • Diet: {dietType.toUpperCase()} • Hub:{' '}
                {regionHub}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View
        style={[
          styles.footer,
          { backgroundColor: colors.bgSurface, borderTopColor: colors.borderLight },
          shadows.medium,
        ]}
      >
        {currentStep > 1 && (
          <TouchableOpacity
            onPress={() => setCurrentStep((prev) => prev - 1)}
            style={[styles.backBtn, { borderColor: colors.borderLight }]}
            activeOpacity={0.7}
          >
            <Text style={[styles.backBtnText, { color: colors.textPrimary }]}>← Back</Text>
          </TouchableOpacity>
        )}

        <View style={{ flex: 1, marginLeft: currentStep > 1 ? 12 : 0 }}>
          {currentStep < totalSteps ? (
            <Button
              title={`Next: Step ${currentStep + 1} →`}
              onPress={handleNextStep}
              variant="primary"
              size="lg"
            />
          ) : (
            <Button
              title={isSubmitting ? 'Saving Profile...' : 'Complete Setup & Start Cooking 🍲'}
              onPress={handleFinish}
              variant="primary"
              size="lg"
              disabled={isSubmitting}
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 48,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  stepBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  welcomeHeadline: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  welcomeSubtext: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  stepContent: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
    marginTop: -6,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 8,
  },
  cuisineEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  cuisineChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkIcon: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  listWrap: {
    gap: 10,
  },
  selectableCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  cardInfoCol: {
    flex: 1,
    paddingHorizontal: 10,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3,
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  dietEmoji: {
    fontSize: 24,
  },
  payEmoji: {
    fontSize: 24,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  allergyChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  allergyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  hubGrid: {
    gap: 8,
  },
  hubCard: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  hubName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  hubDesc: {
    fontSize: 12,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  tagButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  tagButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  formCol: {
    gap: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: -4,
  },
  input: {
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  rowInputs: {
    flexDirection: 'row',
  },
  summaryBanner: {
    marginTop: 20,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 16,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
  },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
