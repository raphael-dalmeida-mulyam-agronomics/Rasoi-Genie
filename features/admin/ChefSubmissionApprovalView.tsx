import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { ChefSubmissionRecord } from '../../framework/services/chefMealKitsService';
import { STORAGE_CENTRE_REGIONS } from '../../framework/services/adminRbacService';
import { RegionHub } from '../../framework/services/mealKitsService';
import {
  INDIA_GEO,
  getSubRegionsForCity,
  getStateForCity,
  legacyHubForCity,
  SubRegion,
} from '../../framework/services/regionService';

interface ChefSubmissionApprovalViewProps {
  submission: ChefSubmissionRecord;
  onClose: () => void;
  onPublish: (
    price: number,
    storageCentres: string[],
    cities: string[],
    regions?: string[],
    subRegions?: string[],
  ) => Promise<void>;
  onReject: (notes: string) => Promise<void>;
  isProcessing?: boolean;
}

export type ApprovalStage = 'details' | 'ingredients' | 'steps' | 'review';

interface StageTab {
  key: ApprovalStage;
  label: string;
  subtitle: string;
  icon: string;
}

const STAGES: StageTab[] = [
  { key: 'details', label: 'Details', subtitle: 'Basic & Dietary', icon: 'document-text-outline' },
  { key: 'ingredients', label: 'Ingredients', subtitle: 'Formulation', icon: 'nutrition-outline' },
  { key: 'steps', label: 'Cooking Steps', subtitle: 'Method & Photos', icon: 'restaurant-outline' },
  { key: 'review', label: 'Approval & Pricing', subtitle: 'Readiness & Publish', icon: 'checkmark-circle-outline' },
];

export interface GeoCityOption {
  name: string;
  state: string;
  subRegionCount: number;
}

export const ALL_GEO_CITIES: GeoCityOption[] = INDIA_GEO.flatMap((state) =>
  state.cities.map((c) => ({
    name: c.name,
    state: state.name,
    subRegionCount: c.subRegions.length,
  })),
).sort((a, b) => a.name.localeCompare(b.name));

export const POPULAR_CITIES = [
  'Pune',
  'Mumbai',
  'Bengaluru',
  'New Delhi',
  'Hyderabad',
  'Ahmedabad',
  'Kolkata',
  'Chennai',
];

export function ChefSubmissionApprovalView({
  submission,
  onClose,
  onPublish,
  onReject,
  isProcessing = false,
}: ChefSubmissionApprovalViewProps) {
  const { colors, radii, shadows } = useTheme();

  // Default to 'review' stage so that admin pricing controls and publish button are instantly accessible
  const [currentStage, setCurrentStage] = useState<ApprovalStage>('review');
  const [price, setPrice] = useState<string>(
    submission.price ? String(submission.price) : '299',
  );
  const [rejectNotes, setRejectNotes] = useState<string>(
    submission.reviewNotes || '',
  );

  // Multiple target cities and sub-areas selection state
  const [selectedCities, setSelectedCities] = useState<string[]>(() => {
    if (submission.cities && Array.isArray(submission.cities) && submission.cities.length > 0) {
      return submission.cities;
    }
    if (submission.originCity && submission.originCity.trim()) {
      return [submission.originCity.trim()];
    }
    return ['Pune'];
  });

  // Sub-regions available across all selected cities
  const availableSubRegions = useMemo<SubRegion[]>(() => {
    const list: SubRegion[] = [];
    for (const city of selectedCities) {
      const subs = getSubRegionsForCity(city);
      if (subs && subs.length > 0) {
        list.push(...subs);
      } else {
        const citySlug = city.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        list.push(
          { id: `${citySlug}-central`, name: `${city} Central / Downtown`, keywords: [city] },
          { id: `${citySlug}-north`, name: `${city} North Zone`, keywords: [city] },
          { id: `${citySlug}-south`, name: `${city} South Zone`, keywords: [city] },
          { id: `${citySlug}-east`, name: `${city} East Zone`, keywords: [city] },
          { id: `${citySlug}-west`, name: `${city} West Zone`, keywords: [city] },
        );
      }
    }
    return list;
  }, [selectedCities]);

  // Selected sub-area IDs that admin can manually check/uncheck
  const [selectedSubAreas, setSelectedSubAreas] = useState<string[]>(() => {
    if (
      submission.subRegions &&
      Array.isArray(submission.subRegions) &&
      submission.subRegions.length > 0
    ) {
      return submission.subRegions;
    }
    const initialCities =
      submission.cities && submission.cities.length > 0
        ? submission.cities
        : submission.originCity
        ? [submission.originCity]
        : ['Pune'];
    const ids: string[] = [];
    for (const city of initialCities) {
      const subs = getSubRegionsForCity(city);
      if (subs.length > 0) {
        ids.push(...subs.map((s) => s.id));
      } else {
        ids.push(`${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-central`);
      }
    }
    return ids;
  });

  // Dropdown open/closed states
  const [isCityDropdownOpen, setIsCityDropdownOpen] = useState(false);
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [citySearch, setCitySearch] = useState('');
  const [areaSearch, setAreaSearch] = useState('');

  const heroImg =
    submission.heroImage?.trim() ||
    'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=1000&q=80';

  // 12-Item Quality Readiness Checklist Evaluation (Matching Chef Studio Stage 4)
  const readinessChecks = [
    {
      key: 'thumbnail',
      label: 'Recipe Hero Photo Uploaded',
      isValid: !!submission.heroImage && submission.heroImage.trim().length > 0,
    },
    {
      key: 'name',
      label: 'Recipe Name Provided (min 3 chars)',
      isValid: !!submission.name && submission.name.trim().length >= 3,
    },
    {
      key: 'tagline',
      label: 'Appetizing Tagline / Subtitle',
      isValid: !!submission.tagline && submission.tagline.trim().length >= 5,
    },
    {
      key: 'description',
      label: 'Culinary Description (min 15 chars)',
      isValid: !!submission.description && submission.description.trim().length >= 15,
    },
    {
      key: 'diet',
      label: 'Dietary Category Selected',
      isValid: !!submission.diet,
    },
    {
      key: 'cuisine',
      label: 'Regional Cuisine Specified',
      isValid: !!submission.cuisine && submission.cuisine.trim().length > 0,
    },
    {
      key: 'category',
      label: 'Dish Category Specified',
      isValid: !!submission.dishCategory && submission.dishCategory.trim().length > 0,
    },
    {
      key: 'spice',
      label: 'Spice Heat Level Specified',
      isValid: !!submission.spiceLevel,
    },
    {
      key: 'timings',
      label: 'Portion Servings & Prep/Cook Times',
      isValid: submission.servings >= 1 && submission.prepTimeMinutes > 0 && submission.cookTimeMinutes > 0,
    },
    {
      key: 'ingredients',
      label: 'Inventory Ingredients Added with Quantities',
      isValid:
        submission.ingredients.length > 0 &&
        submission.ingredients.every((ing) => ing.name.trim().length > 0),
    },
    {
      key: 'steps',
      label: 'Cooking Steps Defined with Instructions',
      isValid:
        submission.recipeSteps.length > 0 &&
        submission.recipeSteps.every((s) => s.instruction.trim().length >= 10),
    },
    {
      key: 'stepImages',
      label: 'Photos Provided for Cooking Steps',
      isValid:
        submission.recipeSteps.length > 0 &&
        submission.recipeSteps.every((s) => !!s.imageUrl && s.imageUrl.trim().length > 0),
    },
  ];

  const passedChecksCount = readinessChecks.filter((c) => c.isValid).length;
  const allChecksPassed = passedChecksCount === readinessChecks.length;

  // Toggle a city in/out of selectedCities
  const toggleCity = (cityName: string) => {
    setSelectedCities((prev) => {
      const isSelected = prev.some((c) => c.toLowerCase() === cityName.toLowerCase());
      if (isSelected) {
        const next = prev.filter((c) => c.toLowerCase() !== cityName.toLowerCase());
        const citySubs = getSubRegionsForCity(cityName).map((s) => s.id);
        const citySlug = cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        setSelectedSubAreas((subPrev) =>
          subPrev.filter((id) => !citySubs.includes(id) && !id.startsWith(`${citySlug}-`))
        );
        return next;
      } else {
        const next = [...prev, cityName];
        const citySubs = getSubRegionsForCity(cityName);
        const newSubIds =
          citySubs.length > 0
            ? citySubs.map((s) => s.id)
            : [`${cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-central`];
        setSelectedSubAreas((subPrev) => Array.from(new Set([...subPrev, ...newSubIds])));
        return next;
      }
    });
  };

  // Quick Action: Select Top Hubs
  const selectTopHubs = () => {
    const topHubs = ['Pune', 'Mumbai', 'Bengaluru', 'New Delhi'];
    setSelectedCities((prev) => Array.from(new Set([...prev, ...topHubs])));
    const newSubIds: string[] = [];
    for (const city of topHubs) {
      const subs = getSubRegionsForCity(city);
      if (subs.length > 0) newSubIds.push(...subs.map((s) => s.id));
    }
    setSelectedSubAreas((prev) => Array.from(new Set([...prev, ...newSubIds])));
  };

  // Quick Action: Clear All Cities
  const clearAllCities = () => {
    setSelectedCities([]);
    setSelectedSubAreas([]);
  };

  // Toggle individual sub-area checkbox
  const toggleSubArea = (subAreaId: string) => {
    setSelectedSubAreas((prev) => {
      if (prev.includes(subAreaId)) {
        return prev.filter((id) => id !== subAreaId);
      }
      return [...prev, subAreaId];
    });
  };

  // Select all sub-areas across all selected cities
  const selectAllSubAreas = () => {
    setSelectedSubAreas(availableSubRegions.map((s) => s.id));
  };

  // Clear all sub-areas
  const clearAllSubAreas = () => {
    setSelectedSubAreas([]);
  };

  // Toggle all sub-areas for a specific city
  const toggleCitySubAreas = (cityName: string) => {
    const citySubs = getSubRegionsForCity(cityName);
    const citySubIds = citySubs.length > 0
      ? citySubs.map((s) => s.id)
      : [`${cityName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-central`];
    const allChecked = citySubIds.every((id) => selectedSubAreas.includes(id));
    if (allChecked) {
      setSelectedSubAreas((prev) => prev.filter((id) => !citySubIds.includes(id)));
    } else {
      setSelectedSubAreas((prev) => Array.from(new Set([...prev, ...citySubIds])));
    }
  };

  // Filtered lists for dropdown search
  const filteredCities = useMemo(() => {
    if (!citySearch.trim()) return ALL_GEO_CITIES;
    const q = citySearch.toLowerCase().trim();
    return ALL_GEO_CITIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q),
    );
  }, [citySearch]);

  const filteredSubRegions = useMemo(() => {
    if (!areaSearch.trim()) return availableSubRegions;
    const q = areaSearch.toLowerCase().trim();
    return availableSubRegions.filter(
      (sr) =>
        sr.name.toLowerCase().includes(q) ||
        sr.id.toLowerCase().includes(q) ||
        sr.pincodes?.some((p) => p.includes(q)) ||
        sr.keywords?.some((kw) => kw.toLowerCase().includes(q)),
    );
  }, [availableSubRegions, areaSearch]);

  // Group sub-regions by city for clean presentation in checklist
  const subRegionsByCity = useMemo(() => {
    const list: { city: string; subRegions: SubRegion[] }[] = [];
    for (const city of selectedCities) {
      const citySubs = getSubRegionsForCity(city);
      const allCitySubs =
        citySubs && citySubs.length > 0
          ? citySubs
          : [
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-central`, name: `${city} Central / Downtown`, keywords: [city] },
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-north`, name: `${city} North Zone`, keywords: [city] },
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-south`, name: `${city} South Zone`, keywords: [city] },
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-east`, name: `${city} East Zone`, keywords: [city] },
              { id: `${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-west`, name: `${city} West Zone`, keywords: [city] },
            ];

      const filtered = !areaSearch.trim()
        ? allCitySubs
        : allCitySubs.filter((sr) => {
            const q = areaSearch.toLowerCase().trim();
            return (
              sr.name.toLowerCase().includes(q) ||
              sr.id.toLowerCase().includes(q) ||
              sr.pincodes?.some((p) => p.includes(q)) ||
              sr.keywords?.some((kw) => kw.toLowerCase().includes(q))
            );
          });

      if (filtered.length > 0) {
        list.push({ city, subRegions: filtered });
      }
    }
    return list;
  }, [selectedCities, areaSearch]);

  const handlePublishClick = async () => {
    const numPrice = parseFloat(price);
    if (!price || isNaN(numPrice) || numPrice <= 0) {
      Alert.alert('Price Required', 'Please enter a valid retail price before publishing.');
      return;
    }

    if (selectedCities.length === 0) {
      Alert.alert('Target City Required', 'Please select at least one target operational city before publishing.');
      return;
    }

    if (selectedSubAreas.length === 0) {
      Alert.alert(
        'Delivery Areas Required',
        `Please select at least one delivery sub-area across your target cities before publishing.`,
      );
      return;
    }

    // Automatically derive legacy regional hubs for backend compatibility
    const legacyHubs = Array.from(new Set(selectedCities.map((c) => legacyHubForCity(c))));

    // Map selected cities & sub-areas to corresponding storage centre depot IDs
    const targetStorageCentres = STORAGE_CENTRE_REGIONS.filter((sc) => {
      const matchCity = selectedCities.some(
        (c) => sc.city.toLowerCase() === c.toLowerCase() || sc.name.toLowerCase().includes(c.toLowerCase()),
      );
      const matchZone = legacyHubs.includes(sc.zone);
      return matchCity || matchZone;
    }).map((sc) => sc.id);

    await onPublish(numPrice, targetStorageCentres, selectedCities, legacyHubs, selectedSubAreas);
  };

  const handleRejectClick = async () => {
    if (!rejectNotes.trim()) {
      Alert.alert('Feedback Required', 'Please enter a reason or notes explaining why the submission was rejected.');
      return;
    }
    await onReject(rejectNotes.trim());
  };

  const padStep = (n: number) => (n < 10 ? `0${n}` : `${n}`);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* ── HEADER ── */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.backBtn, { borderColor: colors.borderLight, backgroundColor: colors.bgSubtle }]}
            accessibilityLabel="Back to Chef Submissions"
          >
            <Icon name="arrow-back" size={18} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <View style={styles.breadcrumbRow}>
              <Text style={[styles.breadcrumbRoot, { color: colors.textMuted }]}>Admin Kitchen</Text>
              <Text style={[styles.breadcrumbDivider, { color: colors.textMuted }]}>/</Text>
              <Text style={[styles.breadcrumbRoot, { color: colors.textMuted }]}>Chef Submissions</Text>
              <Text style={[styles.breadcrumbDivider, { color: colors.textMuted }]}>/</Text>
              <Text style={[styles.breadcrumbCurrent, { color: colors.primary }]}>Review & Approval</Text>
            </View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {submission.name || 'Untitled Recipe'}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          {/* Status Badge */}
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor:
                  submission.submissionStatus === 'published'
                    ? '#DCFCE7'
                    : submission.submissionStatus === 'rejected'
                    ? '#FEE2E2'
                    : '#FEF3C7',
                borderColor:
                  submission.submissionStatus === 'published'
                    ? '#86EFAC'
                    : submission.submissionStatus === 'rejected'
                    ? '#FECACA'
                    : '#FDE68A',
              },
            ]}
          >
            <Icon
              name={
                submission.submissionStatus === 'published'
                  ? 'checkmark-circle'
                  : submission.submissionStatus === 'rejected'
                  ? 'alert-circle'
                  : 'timer'
              }
              size={14}
              color={
                submission.submissionStatus === 'published'
                  ? '#166534'
                  : submission.submissionStatus === 'rejected'
                  ? '#991B1B'
                  : '#92400E'
              }
            />
            <Text
              style={[
                styles.statusPillText,
                {
                  color:
                    submission.submissionStatus === 'published'
                      ? '#166534'
                      : submission.submissionStatus === 'rejected'
                      ? '#991B1B'
                      : '#92400E',
                },
              ]}
            >
              {submission.submissionStatus === 'published'
                ? 'Published Live'
                : submission.submissionStatus === 'rejected'
                ? 'Rejected'
                : 'Pending Review'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeIconBtn, { borderColor: colors.borderLight, backgroundColor: colors.bgSubtle }]}
          >
            <Icon name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── STAGE NAVIGATION BAR (Matching Chef Studio StepNavigation) ── */}
      <View
        style={[
          styles.navigationBar,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navScrollContent}>
          {STAGES.map((s, idx) => {
            const isActive = s.key === currentStage;
            return (
              <React.Fragment key={s.key}>
                {idx > 0 && <View style={[styles.navConnector, { backgroundColor: colors.borderLight }]} />}
                <TouchableOpacity
                  onPress={() => setCurrentStage(s.key)}
                  style={[
                    styles.navTabBtn,
                    isActive && {
                      borderBottomColor: colors.primary,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.navIconBox,
                      {
                        backgroundColor: isActive ? `${colors.primary}15` : colors.bgSubtle,
                        borderColor: isActive ? colors.primary : colors.borderLight,
                      },
                    ]}
                  >
                    <Icon
                      name={s.icon as any}
                      size={16}
                      color={isActive ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={styles.navLabelCol}>
                    <Text
                      style={[
                        styles.navLabelText,
                        {
                          color: isActive ? colors.primary : colors.textPrimary,
                          fontWeight: isActive ? '700' : '600',
                        },
                      ]}
                    >
                      {s.label}
                    </Text>
                    <Text style={[styles.navSubtitleText, { color: colors.textMuted }]}>
                      {s.subtitle}
                    </Text>
                  </View>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </ScrollView>
      </View>

      {/* ── MAIN SCROLLABLE CONTENT ── */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* ========================================================
            STAGE 1: RECIPE DETAILS
            ======================================================== */}
        {currentStage === 'details' && (
          <View style={styles.stageWrap}>
            {/* Hero Image Card */}
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
              <View style={styles.heroImageWrapper}>
                <Image source={{ uri: heroImg }} style={styles.heroImage} resizeMode="cover" />
                <View style={styles.floatingBadgesRow}>
                  <View style={styles.dietBadgePill}>
                    <Text style={styles.dietBadgeText}>
                      {(submission.diet || 'veg').toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.cuisineBadgePill}>
                    <Text style={styles.cuisineBadgeText}>{submission.cuisine}</Text>
                  </View>
                  <View style={styles.spiceBadgePill}>
                    <Icon name="flame" size={12} color="#EF4444" />
                    <Text style={styles.spiceBadgeText}>{submission.spiceLevel}</Text>
                  </View>
                </View>
              </View>

              <View style={styles.heroInfoBlock}>
                <Text style={[styles.recipeTitleLarge, { color: colors.textPrimary }]}>
                  {submission.name}
                </Text>
                {submission.tagline ? (
                  <Text style={[styles.recipeTaglineLarge, { color: colors.textSecondary }]}>
                    {submission.tagline}
                  </Text>
                ) : null}
                <View style={styles.chefAuthorRow}>
                  <Icon name="person-circle-outline" size={16} color={colors.primary} />
                  <Text style={[styles.chefAuthorText, { color: colors.textSecondary }]}>
                    Authored by <Text style={{ fontWeight: '700', color: colors.textPrimary }}>{submission.chefName}</Text>
                  </Text>
                  <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.chefAuthorDate, { color: colors.textMuted }]}>
                    Submitted {new Date(submission.submittedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </View>

            {/* Timings & Portion Stats */}
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
              <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                Portions & Preparation Schedule
              </Text>
              <View style={styles.statsGrid}>
                <View style={[styles.statWidget, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                  <Icon name="people" size={20} color={colors.primary} />
                  <Text style={[styles.statWidgetVal, { color: colors.textPrimary }]}>
                    {submission.servings} Servings
                  </Text>
                  <Text style={[styles.statWidgetLbl, { color: colors.textMuted }]}>Pack Size</Text>
                </View>

                <View style={[styles.statWidget, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                  <Icon name="time" size={20} color={colors.primary} />
                  <Text style={[styles.statWidgetVal, { color: colors.textPrimary }]}>
                    {submission.prepTimeMinutes} mins
                  </Text>
                  <Text style={[styles.statWidgetLbl, { color: colors.textMuted }]}>Prep Duration</Text>
                </View>

                <View style={[styles.statWidget, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                  <Icon name="restaurant" size={20} color={colors.primary} />
                  <Text style={[styles.statWidgetVal, { color: colors.textPrimary }]}>
                    {submission.cookTimeMinutes} mins
                  </Text>
                  <Text style={[styles.statWidgetLbl, { color: colors.textMuted }]}>Cook Duration</Text>
                </View>

                <View style={[styles.statWidget, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                  <Icon name="timer" size={20} color={colors.primary} />
                  <Text style={[styles.statWidgetVal, { color: colors.textPrimary }]}>
                    {submission.prepTimeMinutes + submission.cookTimeMinutes} mins
                  </Text>
                  <Text style={[styles.statWidgetLbl, { color: colors.textMuted }]}>Total Time</Text>
                </View>
              </View>
            </View>

            {/* Culinary Description */}
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
              <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                About this Recipe
              </Text>
              <Text style={[styles.culinaryDescription, { color: colors.textSecondary }]}>
                {submission.description || 'No detailed culinary description provided.'}
              </Text>
            </View>

            {/* Dietary Tags & Allergens */}
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
              <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                Dietary Highlights & Allergen Warnings
              </Text>
              {submission.dietaryTags && submission.dietaryTags.length > 0 && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>DIETARY TAGS</Text>
                  <View style={styles.pillWrap}>
                    {submission.dietaryTags.map((tag) => (
                      <View key={tag} style={styles.dietPill}>
                        <Icon name="leaf" size={12} color="#166534" />
                        <Text style={styles.dietPillText}>{tag.toUpperCase()}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Text style={[styles.subSectionTitle, { color: colors.textMuted }]}>ALLERGENS</Text>
              {submission.allergens && submission.allergens.length > 0 ? (
                <View style={styles.pillWrap}>
                  {submission.allergens.map((alg) => (
                    <View key={alg} style={styles.allergenPill}>
                      <Icon name="alert-circle" size={12} color="#DC2626" />
                      <Text style={styles.allergenPillText}>{alg}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={{ fontSize: 13, color: colors.textMuted }}>
                  No allergen warnings declared by chef.
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ========================================================
            STAGE 2: INGREDIENTS
            ======================================================== */}
        {currentStage === 'ingredients' && (
          <View style={styles.stageWrap}>
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                    Recipe Ingredients Formulation
                  </Text>
                  <Text style={[styles.cardSectionSub, { color: colors.textMuted }]}>
                    {submission.ingredients.length} items will be packed from regional inventory fulfilment centres.
                  </Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: colors.bgSubtle }]}>
                  <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                    {submission.ingredients.length} Items
                  </Text>
                </View>
              </View>

              <View style={styles.ingredientsList}>
                {submission.ingredients.map((ing, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.ingredientRowCard,
                      { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                    ]}
                  >
                    <View style={styles.ingredientLeft}>
                      <View style={[styles.ingredientIconCircle, { backgroundColor: `${colors.primary}15` }]}>
                        <Icon name="nutrition" size={16} color={colors.primary} />
                      </View>
                      <View>
                        <Text style={[styles.ingredientName, { color: colors.textPrimary }]}>
                          {ing.name}
                        </Text>
                        <Text style={[styles.ingredientSub, { color: colors.textMuted }]}>
                          Item #{idx + 1} • Portion for {submission.servings} servings
                        </Text>
                      </View>
                    </View>

                    <View style={[styles.quantityPill, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
                      <Text style={[styles.quantityPillText, { color: colors.primary }]}>
                        {ing.quantity || '1 unit'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ========================================================
            STAGE 3: COOKING STEPS
            ======================================================== */}
        {currentStage === 'steps' && (
          <View style={styles.stageWrap}>
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                    Step-by-Step Cooking Instructions
                  </Text>
                  <Text style={[styles.cardSectionSub, { color: colors.textMuted }]}>
                    Structured method designed for customers to prepare this dish in their home kitchen.
                  </Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: colors.bgSubtle }]}>
                  <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                    {submission.recipeSteps.length} Steps
                  </Text>
                </View>
              </View>

              <View style={styles.stepsList}>
                {submission.recipeSteps.map((step) => (
                  <View
                    key={step.stepNumber}
                    style={[
                      styles.stepCard,
                      { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                    ]}
                  >
                    <View style={styles.stepHeaderRow}>
                      <View style={styles.stepNumberBadge}>
                        <Text style={styles.stepNumberBadgeText}>
                          Step {padStep(step.stepNumber)}
                        </Text>
                      </View>
                      {step.title ? (
                        <Text style={[styles.stepTitleText, { color: colors.textPrimary }]}>
                          {step.title}
                        </Text>
                      ) : null}
                    </View>

                    <Text style={[styles.stepInstructionText, { color: colors.textPrimary }]}>
                      {step.instruction}
                    </Text>

                    {step.imageUrl ? (
                      <View style={styles.stepImageWrap}>
                        <Image source={{ uri: step.imageUrl }} style={styles.stepImage} resizeMode="cover" />
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ========================================================
            STAGE 4: APPROVAL, QUALITY READINESS & PRICING
            ======================================================== */}
        {currentStage === 'review' && (
          <View style={styles.stageWrap}>
            {/* 1. Recipe Readiness Checklist (Matching Chef Studio Stage 4) */}
            <View
              style={[
                styles.card,
                {
                  backgroundColor: allChecksPassed ? '#F0FDF4' : colors.bgSurface,
                  borderColor: allChecksPassed ? '#BBF7D0' : colors.borderLight,
                },
              ]}
            >
              <View style={styles.checklistHeaderRow}>
                <View>
                  <View style={styles.checklistTitleRow}>
                    <Icon
                      name={allChecksPassed ? 'checkmark-circle' : 'shield-checkmark-outline'}
                      size={20}
                      color={allChecksPassed ? '#15803D' : colors.primary}
                    />
                    <Text style={[styles.checklistTitle, { color: colors.textPrimary }]}>
                      Recipe Readiness & Quality Standards
                    </Text>
                  </View>
                  <Text style={[styles.checklistSubtitle, { color: colors.textSecondary }]}>
                    {passedChecksCount} of 12 standards met. Verified against RasoiGenie culinary requirements.
                  </Text>
                </View>

                <View
                  style={[
                    styles.scorePill,
                    {
                      backgroundColor: allChecksPassed ? '#DCFCE7' : '#FEF3C7',
                      borderColor: allChecksPassed ? '#86EFAC' : '#FDE68A',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.scorePillText,
                      { color: allChecksPassed ? '#166534' : '#92400E' },
                    ]}
                  >
                    {allChecksPassed ? 'Quality Standards Met ✓' : `${12 - passedChecksCount} Items Flagged`}
                  </Text>
                </View>
              </View>

              <View style={styles.checklistGrid}>
                {readinessChecks.map((check) => (
                  <View
                    key={check.key}
                    style={[
                      styles.checkItemRow,
                      {
                        backgroundColor: check.isValid ? 'transparent' : '#FEF2F2',
                        borderColor: check.isValid ? '#E5E7EB' : '#FECACA',
                      },
                    ]}
                  >
                    <Icon
                      name={check.isValid ? 'checkmark-circle' : 'alert-circle'}
                      size={16}
                      color={check.isValid ? '#10B981' : '#EF4444'}
                    />
                    <Text
                      style={[
                        styles.checkLabel,
                        {
                          color: check.isValid ? colors.textPrimary : '#991B1B',
                          fontWeight: check.isValid ? '500' : '700',
                        },
                      ]}
                    >
                      {check.label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 2. Customer View Preview */}
            <View style={[styles.card, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight }]}>
              <View style={styles.previewModeBanner}>
                <Icon name="eye-outline" size={16} color="#4338CA" />
                <Text style={styles.previewModeText}>
                  CUSTOMER CATALOG PREVIEW • How customers will experience this dish
                </Text>
              </View>

              <View style={styles.previewCardWrap}>
                <Image source={{ uri: heroImg }} style={styles.previewHero} resizeMode="cover" />
                <View style={styles.previewBody}>
                  <View style={styles.previewMetaRow}>
                    <Text style={styles.previewDietBadge}>{(submission.diet || 'veg').toUpperCase()}</Text>
                    <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{submission.cuisine}</Text>
                    <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>{submission.dishCategory}</Text>
                    <Text style={[styles.metaDot, { color: colors.textMuted }]}>•</Text>
                    <Text style={[styles.metaText, { color: colors.textSecondary }]}>Heat: {submission.spiceLevel}</Text>
                  </View>
                  <Text style={[styles.previewTitle, { color: colors.textPrimary }]}>{submission.name}</Text>
                  {submission.tagline ? (
                    <Text style={[styles.previewTagline, { color: colors.textSecondary }]}>{submission.tagline}</Text>
                  ) : null}
                  <View style={styles.previewFooterRow}>
                    <Text style={[styles.previewChefName, { color: colors.textMuted }]}>
                      Curated by {submission.chefName}
                    </Text>
                    <Text style={[styles.previewPriceTag, { color: colors.primary }]}>
                      ₹{price || '299'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 3. Admin Pricing & Fulfilment Controls */}
            <View
              style={[
                styles.card,
                { backgroundColor: colors.bgSurface, borderColor: colors.primary, borderWidth: 1.5 },
              ]}
            >
              <View style={styles.pricingHeaderRow}>
                <View style={[styles.pricingIconBox, { backgroundColor: `${colors.primary}15` }]}>
                  <Icon name="card" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.cardSectionTitle, { color: colors.textPrimary }]}>
                    Admin Kitchen Pricing & Availability Setup
                  </Text>
                  <Text style={[styles.cardSectionSub, { color: colors.textMuted }]}>
                    Set customer price and assign regional fulfilment availability.
                  </Text>
                </View>
              </View>

              {/* Set Price Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  RETAIL MEAL KIT PRICE (₹) *
                </Text>
                <View style={styles.priceInputWrapper}>
                  <View style={[styles.currencyPrefix, { backgroundColor: colors.bgSubtle, borderColor: colors.border }]}>
                    <Text style={[styles.currencyPrefixText, { color: colors.textPrimary }]}>₹</Text>
                  </View>
                  <TextInput
                    testID="admin-chef-price-input"
                    style={[
                      styles.priceInput,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.border,
                        color: colors.textPrimary,
                      },
                    ]}
                    placeholder="299"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <Text style={[styles.helperText, { color: colors.textMuted }]}>
                  Suggested price: ₹249 – ₹399 based on {submission.servings} servings and {submission.ingredients.length} fresh ingredients.
                </Text>
              </View>

              {/* ── CITY DROPDOWN & AREA CHECKLIST MULTI-SELECT ── */}
              <View style={styles.inputGroup}>
                <View style={styles.dropdownHeaderRow}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary, marginBottom: 0 }]}>
                    DELIVERY COVERAGE & AREA FULFILMENT *
                  </Text>
                  <View style={[styles.scopeSummaryBadge, { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight }]}>
                    <Text style={[styles.scopeSummaryText, { color: colors.primary }]}>
                      {selectedCities.length === 1
                        ? `${selectedCities[0]} • ${selectedSubAreas.length} Areas`
                        : `${selectedCities.length} Cities • ${selectedSubAreas.length} Areas`}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.helperText, { color: colors.textMuted, marginBottom: 12 }]}>
                  Select one or more target operational cities and manually check each sub-area or neighbourhood where this meal kit can be delivered.
                </Text>

                {/* ── 1. CITY DROPDOWN MENU (MULTI-CITY SELECT) ── */}
                <View style={styles.dropdownSectionWrap}>
                  <View style={styles.areaSectionHeaderRow}>
                    <Text style={[styles.subDropdownLabel, { color: colors.textSecondary }]}>
                      1. TARGET CITIES (SELECT APPLICABLE) *
                    </Text>
                    <View style={styles.quickAreaHeaderActions}>
                      <TouchableOpacity onPress={selectTopHubs}>
                        <Text style={[styles.quickHeaderActionText, { color: colors.primary }]}>
                          Top Hubs
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ color: colors.textMuted }}>•</Text>
                      <TouchableOpacity onPress={clearAllCities}>
                        <Text style={[styles.quickHeaderActionText, { color: colors.danger }]}>
                          Clear All
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    testID="admin-chef-city-dropdown-trigger"
                    onPress={() => {
                      setIsCityDropdownOpen(!isCityDropdownOpen);
                      setIsAreaDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.dropdownTrigger,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isCityDropdownOpen ? colors.primary : colors.border,
                        ...shadows.soft,
                      },
                    ]}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <View style={[styles.triggerIconWrap, { backgroundColor: `${colors.primary}12` }]}>
                        <Icon name="business-outline" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.triggerTextCol}>
                        <Text style={[styles.triggerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {selectedCities.length === 0
                            ? 'No Cities Selected (Click to Select)'
                            : selectedCities.length === 1
                            ? `${selectedCities[0]}${getStateForCity(selectedCities[0] ?? '') ? `, ${getStateForCity(selectedCities[0] ?? '')}` : ''}`
                            : `${selectedCities.length} Cities Selected: ${selectedCities.join(', ')}`}
                        </Text>
                        <Text style={[styles.triggerSubtitle, { color: colors.textMuted }]}>
                          {isCityDropdownOpen
                            ? 'Click to close cities menu'
                            : `${availableSubRegions.length} sub-areas available • Click to toggle cities`}
                        </Text>
                      </View>
                    </View>

                    <Icon
                      name={isCityDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* City Dropdown Menu List */}
                  {isCityDropdownOpen && (
                    <View
                      style={[
                        styles.dropdownMenuCard,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.borderLight,
                          ...shadows.card,
                        },
                      ]}
                    >
                      {/* Search inside City dropdown */}
                      <View
                        style={[
                          styles.dropdownSearchWrap,
                          { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                        ]}
                      >
                        <Icon name="search" size={16} color={colors.textMuted} />
                        <TextInput
                          style={[styles.dropdownSearchInput, { color: colors.textPrimary }]}
                          placeholder="Search Indian cities..."
                          placeholderTextColor={colors.textMuted}
                          value={citySearch}
                          onChangeText={setCitySearch}
                          autoFocus={Platform.OS === 'web'}
                        />
                        {citySearch.length > 0 && (
                          <TouchableOpacity onPress={() => setCitySearch('')}>
                            <Icon name="close" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Quick City Shortcuts */}
                      <View style={[styles.quickCitiesBar, { backgroundColor: colors.bgSubtle, borderBottomColor: colors.borderLight }]}>
                        <Text style={[styles.quickCitiesLabel, { color: colors.textMuted }]}>Quick Hubs:</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickCitiesScroll}>
                          {POPULAR_CITIES.map((popCity) => {
                            const isCurrent = selectedCities.some((c) => c.toLowerCase() === popCity.toLowerCase());
                            return (
                              <TouchableOpacity
                                key={popCity}
                                onPress={() => toggleCity(popCity)}
                                style={[
                                  styles.quickCityPill,
                                  {
                                    backgroundColor: isCurrent ? colors.primary : colors.bgSurface,
                                    borderColor: isCurrent ? colors.primary : colors.borderLight,
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.quickCityPillText,
                                    { color: isCurrent ? '#fff' : colors.textPrimary },
                                  ]}
                                >
                                  {popCity}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>

                      {/* Scrollable list of cities */}
                      <ScrollView
                        style={styles.dropdownScrollList}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        <View style={styles.dropdownItemsList}>
                          {filteredCities.map((c) => {
                            const isSelected = selectedCities.some(
                              (sc) => sc.toLowerCase() === c.name.toLowerCase(),
                            );
                            return (
                              <TouchableOpacity
                                key={`${c.name}-${c.state}`}
                                onPress={() => toggleCity(c.name)}
                                activeOpacity={0.7}
                                style={[
                                  styles.dropdownOptionRow,
                                  {
                                    backgroundColor: isSelected ? `${colors.primary}0E` : 'transparent',
                                    borderColor: isSelected ? colors.primary : colors.borderLight,
                                  },
                                ]}
                              >
                                <View style={styles.optionLeft}>
                                  <View
                                    style={[
                                      styles.checkboxBox,
                                      {
                                        borderColor: isSelected ? colors.primary : colors.border,
                                        backgroundColor: isSelected ? colors.primary : 'transparent',
                                      },
                                    ]}
                                  >
                                    {isSelected && <Icon name="check" size={12} color="#fff" />}
                                  </View>

                                  <View style={styles.optionTextCol}>
                                    <View style={styles.optionTitleRow}>
                                      <Text
                                        style={[
                                          styles.optionTitle,
                                          {
                                            color: colors.textPrimary,
                                            fontWeight: isSelected ? '700' : '600',
                                          },
                                        ]}
                                      >
                                        {c.name}
                                      </Text>
                                      <View style={[styles.statePill, { backgroundColor: colors.bgSubtle }]}>
                                        <Text style={[styles.statePillText, { color: colors.textMuted }]}>
                                          {c.state}
                                        </Text>
                                      </View>
                                    </View>
                                    <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                                      {c.subRegionCount} deliverable sub-areas available
                                    </Text>
                                  </View>
                                </View>

                                {isSelected && (
                                  <View style={styles.activeTagPill}>
                                    <Text style={styles.activeTagPillText}>Selected ✓</Text>
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                          })}
                          {filteredCities.length === 0 && (
                            <View style={styles.emptyListWrap}>
                              <Text style={[styles.emptyListText, { color: colors.textMuted }]}>
                                No cities match "{citySearch}"
                              </Text>
                            </View>
                          )}
                        </View>
                      </ScrollView>

                      <View
                        style={[
                          styles.dropdownFooter,
                          { backgroundColor: colors.bgSubtle, borderTopColor: colors.borderLight },
                        ]}
                      >
                        <Text style={[styles.dropdownFooterSummary, { color: colors.textMuted }]}>
                          {selectedCities.length} of {filteredCities.length} cities selected
                        </Text>
                        <TouchableOpacity
                          onPress={() => setIsCityDropdownOpen(false)}
                          style={[styles.dropdownDoneBtn, { backgroundColor: colors.primary }]}
                        >
                          <Text style={styles.dropdownDoneBtnText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>

                {/* ── 2. AREA DROPDOWN MENU (MANUAL MULTI-CHECK) ── */}
                <View style={[styles.dropdownSectionWrap, { marginTop: 12 }]}>
                  <View style={styles.areaSectionHeaderRow}>
                    <Text style={[styles.subDropdownLabel, { color: colors.textSecondary }]}>
                      2. SUB-AREAS & NEIGHBOURHOODS (CHECK APPLICABLE) *
                    </Text>
                    <View style={styles.quickAreaHeaderActions}>
                      <TouchableOpacity onPress={selectAllSubAreas}>
                        <Text style={[styles.quickHeaderActionText, { color: colors.primary }]}>
                          Select All ({availableSubRegions.length})
                        </Text>
                      </TouchableOpacity>
                      <Text style={{ color: colors.textMuted }}>•</Text>
                      <TouchableOpacity onPress={clearAllSubAreas}>
                        <Text style={[styles.quickHeaderActionText, { color: colors.danger }]}>
                          Clear All
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Area Dropdown Trigger Button */}
                  <TouchableOpacity
                    testID="admin-chef-area-dropdown-trigger"
                    onPress={() => {
                      setIsAreaDropdownOpen(!isAreaDropdownOpen);
                      setIsCityDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.dropdownTrigger,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: isAreaDropdownOpen ? colors.primary : colors.border,
                        ...shadows.soft,
                      },
                    ]}
                  >
                    <View style={styles.dropdownTriggerLeft}>
                      <View style={[styles.triggerIconWrap, { backgroundColor: `${colors.primary}12` }]}>
                        <Icon name="map-outline" size={18} color={colors.primary} />
                      </View>
                      <View style={styles.triggerTextCol}>
                        <Text style={[styles.triggerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                          {selectedSubAreas.length === availableSubRegions.length && availableSubRegions.length > 0
                            ? `All ${availableSubRegions.length} Sub-Areas Selected across ${selectedCities.length} ${selectedCities.length === 1 ? 'City' : 'Cities'}`
                            : selectedSubAreas.length > 0
                            ? `${selectedSubAreas.length} of ${availableSubRegions.length} Sub-Areas Selected`
                            : selectedCities.length === 0
                            ? 'Select target cities above first'
                            : 'No Sub-Areas Selected (Click to Check)'}
                        </Text>
                        <Text style={[styles.triggerSubtitle, { color: colors.textMuted }]}>
                          {isAreaDropdownOpen ? 'Click to close checklist' : 'Click to manually check or uncheck individual areas'}
                        </Text>
                      </View>
                    </View>

                    <Icon
                      name={isAreaDropdownOpen ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Area Dropdown Menu Checklist (Appears when opened) */}
                  {isAreaDropdownOpen && (
                    <View
                      style={[
                        styles.dropdownMenuCard,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.borderLight,
                          ...shadows.card,
                        },
                      ]}
                    >
                      {/* Search inside Area dropdown */}
                      <View
                        style={[
                          styles.dropdownSearchWrap,
                          { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                        ]}
                      >
                        <Icon name="search" size={16} color={colors.textMuted} />
                        <TextInput
                          style={[styles.dropdownSearchInput, { color: colors.textPrimary }]}
                          placeholder="Search sub-areas or pincodes (e.g. Baner, Kothrud, Bandra)..."
                          placeholderTextColor={colors.textMuted}
                          value={areaSearch}
                          onChangeText={setAreaSearch}
                          autoFocus={Platform.OS === 'web'}
                        />
                        {areaSearch.length > 0 && (
                          <TouchableOpacity onPress={() => setAreaSearch('')}>
                            <Icon name="close" size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                        )}
                      </View>

                      {/* Action Bar */}
                      <View style={styles.dropdownActionBar}>
                        <View style={styles.dropdownAreaCounterBadge}>
                          <Text style={[styles.dropdownAreaCounterText, { color: colors.textPrimary }]}>
                            {selectedSubAreas.length} of {availableSubRegions.length} checked
                          </Text>
                        </View>

                        <View style={styles.quickActionLinks}>
                          <TouchableOpacity onPress={selectAllSubAreas}>
                            <Text style={[styles.quickActionText, { color: colors.primary }]}>
                              Check All
                            </Text>
                          </TouchableOpacity>
                          <Text style={{ color: colors.textMuted }}>•</Text>
                          <TouchableOpacity onPress={clearAllSubAreas}>
                            <Text style={[styles.quickActionText, { color: colors.danger }]}>
                              Uncheck All
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* Scrollable Sub-Areas Checklist grouped by City */}
                      <ScrollView
                        style={styles.dropdownScrollList}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        <View style={styles.dropdownItemsList}>
                          {selectedCities.length === 0 ? (
                            <View style={styles.emptyListWrap}>
                              <Text style={[styles.emptyListText, { color: colors.textMuted }]}>
                                Please select at least one target city above to view sub-areas.
                              </Text>
                            </View>
                          ) : subRegionsByCity.length === 0 ? (
                            <View style={styles.emptyListWrap}>
                              <Text style={[styles.emptyListText, { color: colors.textMuted }]}>
                                No sub-areas match "{areaSearch}"
                              </Text>
                            </View>
                          ) : (
                            subRegionsByCity.map(({ city, subRegions }) => {
                              const citySubIds = subRegions.map((sr) => sr.id);
                              const allCityChecked =
                                citySubIds.length > 0 && citySubIds.every((id) => selectedSubAreas.includes(id));
                              const checkedInCityCount = citySubIds.filter((id) =>
                                selectedSubAreas.includes(id),
                              ).length;

                              return (
                                <View key={city} style={styles.cityGroupContainer}>
                                  {/* City Group Header */}
                                  <View
                                    style={[
                                      styles.cityGroupHeader,
                                      { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
                                    ]}
                                  >
                                    <View style={styles.cityGroupTitleCol}>
                                      <Text style={[styles.cityGroupTitle, { color: colors.textPrimary }]}>
                                        {city.toUpperCase()}
                                      </Text>
                                      <Text style={[styles.cityGroupCount, { color: colors.textMuted }]}>
                                        {checkedInCityCount} of {subRegions.length} areas active
                                      </Text>
                                    </View>
                                    <TouchableOpacity
                                      onPress={() => toggleCitySubAreas(city)}
                                      style={styles.cityGroupToggleBtn}
                                    >
                                      <Text style={[styles.cityGroupToggleText, { color: colors.primary }]}>
                                        {allCityChecked ? 'Uncheck All' : 'Check All'}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>

                                  {/* City Sub-Areas Rows */}
                                  {subRegions.map((sub) => {
                                    const isChecked = selectedSubAreas.includes(sub.id);
                                    return (
                                      <TouchableOpacity
                                        key={sub.id}
                                        onPress={() => toggleSubArea(sub.id)}
                                        activeOpacity={0.7}
                                        style={[
                                          styles.dropdownOptionRow,
                                          {
                                            backgroundColor: isChecked ? `${colors.primary}0D` : 'transparent',
                                            borderColor: isChecked ? colors.primary : colors.borderLight,
                                            marginBottom: 4,
                                          },
                                        ]}
                                      >
                                        <View style={styles.optionLeft}>
                                          {/* Custom Checkbox */}
                                          <View
                                            style={[
                                              styles.checkboxBox,
                                              {
                                                backgroundColor: isChecked ? colors.primary : colors.bgSurface,
                                                borderColor: isChecked ? colors.primary : colors.border,
                                              },
                                            ]}
                                          >
                                            {isChecked && <Icon name="check" size={12} color="#fff" />}
                                          </View>

                                          <View style={styles.optionTextCol}>
                                            <View style={styles.optionTitleRow}>
                                              <Text
                                                style={[
                                                  styles.optionTitle,
                                                  {
                                                    color: colors.textPrimary,
                                                    fontWeight: isChecked ? '700' : '600',
                                                  },
                                                ]}
                                              >
                                                {sub.name}
                                              </Text>
                                              {isChecked && (
                                                <View style={styles.activeTagPill}>
                                                  <Text style={styles.activeTagPillText}>Deliverable ✓</Text>
                                                </View>
                                              )}
                                            </View>
                                            <Text style={[styles.optionDesc, { color: colors.textMuted }]}>
                                              {sub.pincodes && sub.pincodes.length > 0
                                                ? `Pincodes: ${sub.pincodes.join(', ')}`
                                                : 'Standard Delivery Hub'}
                                              {sub.keywords && sub.keywords.length > 0
                                                ? ` • ${sub.keywords.slice(0, 3).join(', ')}`
                                                : ''}
                                            </Text>
                                          </View>
                                        </View>
                                      </TouchableOpacity>
                                    );
                                  })}
                                </View>
                              );
                            })
                          )}
                        </View>
                      </ScrollView>

                      {/* Footer */}
                      <View
                        style={[
                          styles.dropdownFooter,
                          { backgroundColor: colors.bgSubtle, borderTopColor: colors.borderLight },
                        ]}
                      >
                        <Text style={[styles.dropdownFooterSummary, { color: colors.textMuted }]}>
                          {selectedSubAreas.length} sub-areas activated across {selectedCities.length} {selectedCities.length === 1 ? 'city' : 'cities'}
                        </Text>
                        <TouchableOpacity
                          onPress={() => setIsAreaDropdownOpen(false)}
                          style={[styles.dropdownDoneBtn, { backgroundColor: colors.primary }]}
                        >
                          <Text style={styles.dropdownDoneBtnText}>Done</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Rejection Feedback / Notes */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  ADMIN REVIEW NOTES / REJECTION FEEDBACK
                </Text>
                <TextInput
                  testID="admin-chef-reject-notes"
                  style={[
                    styles.notesInput,
                    {
                      backgroundColor: colors.bgSubtle,
                      borderColor: colors.border,
                      color: colors.textPrimary,
                    },
                  ]}
                  placeholder="Provide detailed feedback to the chef if rejecting (e.g. missing prep measurements, unverified ingredient proportions)..."
                  placeholderTextColor={colors.textMuted}
                  value={rejectNotes}
                  onChangeText={setRejectNotes}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── STICKY BOTTOM BAR (Action Controls) ── */}
      <View
        style={[
          styles.stickyFooter,
          { backgroundColor: colors.bgSurface, borderTopColor: colors.borderLight },
        ]}
      >
        <View style={styles.footerLeftCol}>
          <TouchableOpacity
            onPress={() => {
              const stages: ApprovalStage[] = ['details', 'ingredients', 'steps', 'review'];
              const currentIdx = stages.indexOf(currentStage);
              const prevStage = stages[currentIdx - 1];
              if (prevStage) setCurrentStage(prevStage);
            }}
            disabled={currentStage === 'details'}
            style={[
              styles.navFooterBtn,
              {
                borderColor: colors.borderLight,
                backgroundColor: colors.bgSubtle,
                opacity: currentStage === 'details' ? 0.4 : 1,
              },
            ]}
          >
            <Icon name="arrow-back" size={16} color={colors.textPrimary} />
            <Text style={[styles.navFooterBtnText, { color: colors.textPrimary }]}>Prev Stage</Text>
          </TouchableOpacity>

          {currentStage !== 'review' && (
            <TouchableOpacity
              onPress={() => {
                const stages: ApprovalStage[] = ['details', 'ingredients', 'steps', 'review'];
                const currentIdx = stages.indexOf(currentStage);
                const nextStage = stages[currentIdx + 1];
                if (nextStage) setCurrentStage(nextStage);
              }}
              style={[
                styles.navFooterBtn,
                {
                  borderColor: colors.primary,
                  backgroundColor: `${colors.primary}10`,
                },
              ]}
            >
              <Text style={[styles.navFooterBtnText, { color: colors.primary }]}>Next Stage</Text>
              <Icon name="arrow-forward" size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.footerRightCol}>
          <TouchableOpacity
            testID="admin-chef-reject-btn"
            onPress={handleRejectClick}
            disabled={isProcessing}
            style={[
              styles.rejectBtn,
              { backgroundColor: colors.danger, opacity: isProcessing ? 0.6 : 1 },
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="close" size={16} color="#fff" />
                <Text style={styles.rejectBtnText}>Reject Submission</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            testID="admin-chef-publish-btn"
            onPress={handlePublishClick}
            disabled={isProcessing}
            style={[
              styles.publishBtn,
              { backgroundColor: colors.primary, opacity: isProcessing ? 0.6 : 1 },
            ]}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.publishBtnText}>
                  Publish & Approve at ₹{price || '—'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerTitleWrap: {
    flex: 1,
  },
  breadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  breadcrumbRoot: {
    fontSize: 11,
    fontWeight: '500',
  },
  breadcrumbDivider: {
    fontSize: 11,
    marginHorizontal: 4,
  },
  breadcrumbCurrent: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationBar: {
    borderBottomWidth: 1,
  },
  navScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navConnector: {
    width: 24,
    height: 2,
    marginHorizontal: 8,
  },
  navTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 10,
  },
  navIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabelCol: {
    justifyContent: 'center',
  },
  navLabelText: {
    fontSize: 13,
  },
  navSubtitleText: {
    fontSize: 10,
  },
  mainScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  stageWrap: {
    gap: 16,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    overflow: 'hidden',
  },
  heroImageWrapper: {
    width: '100%',
    height: 260,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  floatingBadgesRow: {
    position: 'absolute',
    top: 12,
    left: 12,
    flexDirection: 'row',
    gap: 8,
  },
  dietBadgePill: {
    backgroundColor: '#166534',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  dietBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cuisineBadgePill: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cuisineBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  spiceBadgePill: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  spiceBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B91C1C',
  },
  heroInfoBlock: {
    gap: 6,
  },
  recipeTitleLarge: {
    fontSize: 24,
    fontWeight: '800',
  },
  recipeTaglineLarge: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  chefAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  chefAuthorText: {
    fontSize: 12,
  },
  chefAuthorDate: {
    fontSize: 12,
  },
  metaDot: {
    fontSize: 12,
    marginHorizontal: 2,
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  cardSectionSub: {
    fontSize: 12,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 10,
  },
  statWidget: {
    flex: 1,
    minWidth: 120,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  statWidgetVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  statWidgetLbl: {
    fontSize: 11,
    fontWeight: '500',
  },
  culinaryDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
  subSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  pillWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  dietPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  allergenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
  },
  allergenPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ingredientsList: {
    gap: 10,
  },
  ingredientRowCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  ingredientLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  ingredientIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: '700',
  },
  ingredientSub: {
    fontSize: 11,
    marginTop: 2,
  },
  quantityPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  quantityPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  stepsList: {
    gap: 14,
  },
  stepCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stepNumberBadge: {
    backgroundColor: '#4338CA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  stepNumberBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  stepTitleText: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  stepInstructionText: {
    fontSize: 13,
    lineHeight: 20,
  },
  stepImageWrap: {
    height: 180,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
  },
  stepImage: {
    width: '100%',
    height: '100%',
  },
  checklistHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 12,
  },
  checklistTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  checklistTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  checklistSubtitle: {
    fontSize: 12,
    maxWidth: 500,
  },
  scorePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  scorePillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  checklistGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    width: Platform.OS === 'web' ? '48.5%' : '100%',
  },
  checkLabel: {
    fontSize: 12,
    flex: 1,
  },
  previewModeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  previewModeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  previewCardWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  previewHero: {
    width: '100%',
    height: 200,
  },
  previewBody: {
    padding: 14,
    gap: 4,
  },
  previewMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  previewDietBadge: {
    backgroundColor: '#DCFCE7',
    color: '#166534',
    fontSize: 10,
    fontWeight: '800',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaText: {
    fontSize: 11,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  previewTagline: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  previewFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  previewChefName: {
    fontSize: 12,
  },
  previewPriceTag: {
    fontSize: 18,
    fontWeight: '800',
  },
  pricingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  pricingIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  priceInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencyPrefix: {
    height: 46,
    width: 46,
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    borderWidth: 1,
    borderRightWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPrefixText: {
    fontSize: 18,
    fontWeight: '800',
  },
  priceInput: {
    flex: 1,
    height: 46,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 11,
    marginTop: 6,
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scopeSummaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  scopeSummaryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 10,
  },
  triggerIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerTextCol: {
    flex: 1,
  },
  triggerTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  triggerSubtitle: {
    fontSize: 11,
  },
  selectedChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  selectedChipRegionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  selectedChipCityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  chipRemoveBtn: {
    padding: 2,
  },
  panIndiaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  panIndiaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  dropdownMenuCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 14,
  },
  dropdownSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 4,
  },
  dropdownActionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  quickActionLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quickActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownSectionWrap: {
    marginBottom: 4,
  },
  subDropdownLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  quickCitiesBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  quickCitiesLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickCitiesScroll: {
    flexGrow: 0,
  },
  quickCityPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 6,
  },
  quickCityPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cityRadioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  statePill: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statePillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyListWrap: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyListText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  areaSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  quickAreaHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickHeaderActionText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownAreaCounterBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dropdownAreaCounterText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownScrollList: {
    maxHeight: 280,
  },
  dropdownItemsList: {
    padding: 10,
    gap: 6,
  },
  cityGroupContainer: {
    marginBottom: 10,
  },
  cityGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  cityGroupTitleCol: {
    flex: 1,
  },
  cityGroupTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cityGroupCount: {
    fontSize: 10,
    marginTop: 1,
  },
  cityGroupToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#C7D2FE',
    backgroundColor: '#EEF2FF',
  },
  cityGroupToggleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dropdownOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextCol: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 13,
  },
  activeTagPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeTagPillText: {
    color: '#166534',
    fontSize: 9,
    fontWeight: '800',
  },
  optionDesc: {
    fontSize: 11,
  },
  dropdownFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  dropdownFooterSummary: {
    fontSize: 11,
  },
  dropdownDoneBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  dropdownDoneBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  notesInput: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    fontSize: 13,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  stickyFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  footerLeftCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  navFooterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  navFooterBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerRightCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  rejectBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  publishBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
});
