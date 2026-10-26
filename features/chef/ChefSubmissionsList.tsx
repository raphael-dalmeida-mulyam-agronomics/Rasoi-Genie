import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { ChefSubmissionRecord } from '../../framework/services/chefMealKitsService';
import { ChefProfile } from '../../framework/services/adminRbacService';

interface ChefSubmissionsListProps {
  submissions: ChefSubmissionRecord[];
  loading: boolean;
  activeChefProfile?: ChefProfile;
  fallbackChefName: string;
  deletingId: string | null;
  onNewRecipe: () => void;
  onEditRecipe: (recipe: ChefSubmissionRecord) => void;
  onDeleteRecipe: (id: string, name: string) => void;
}

type StatusFilterTab = 'all' | 'pending_review' | 'published' | 'rejected' | 'draft';

function StatusBadge({ status }: { status: ChefSubmissionRecord['submissionStatus'] }) {
  const colorMap: Record<
    ChefSubmissionRecord['submissionStatus'],
    { bg: string; text: string; label: string; border: string }
  > = {
    draft: { bg: '#F3F4F6', text: '#374151', label: 'Draft', border: '#E5E7EB' },
    pending_review: {
      bg: '#FEF3C7',
      text: '#92400E',
      label: 'Pending Review',
      border: '#FDE68A',
    },
    published: { bg: '#DCFCE7', text: '#15803D', label: 'Published', border: '#86EFAC' },
    rejected: { bg: '#FEE2E2', text: '#B91C1C', label: 'Action Needed', border: '#FCA5A5' },
  };
  const s = colorMap[status] ?? colorMap.draft;
  return (
    <View
      style={{
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        backgroundColor: s.bg,
        borderWidth: 1,
        borderColor: s.border,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: s.text }}>{s.label}</Text>
    </View>
  );
}

export function ChefSubmissionsList({
  submissions,
  loading,
  activeChefProfile,
  fallbackChefName,
  deletingId,
  onNewRecipe,
  onEditRecipe,
  onDeleteRecipe,
}: ChefSubmissionsListProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState<StatusFilterTab>('all');

  const filteredSubmissions = useMemo(() => {
    return submissions.filter((item) => {
      // Status filter
      if (selectedStatusTab !== 'all' && item.submissionStatus !== selectedStatusTab) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesCuisine = item.cuisine?.toLowerCase().includes(q);
        const matchesDiet = item.diet?.toLowerCase().includes(q);
        const matchesCategory = item.dishCategory?.toLowerCase().includes(q);
        return matchesName || matchesCuisine || matchesDiet || matchesCategory;
      }
      return true;
    });
  }, [submissions, selectedStatusTab, searchQuery]);

  const counts = useMemo(
    () => ({
      all: submissions.length,
      pending: submissions.filter((s) => s.submissionStatus === 'pending_review').length,
      published: submissions.filter((s) => s.submissionStatus === 'published').length,
      rejected: submissions.filter((s) => s.submissionStatus === 'rejected').length,
    }),
    [submissions],
  );

  const renderCard = (item: ChefSubmissionRecord) => {
    const hasVideo = !!item.videoUrl;
    const instructionMode =
      item.instructionType || (hasVideo ? (item.recipeSteps?.length ? 'both' : 'video') : 'steps');

    return (
      <View
        key={item.id}
        style={[
          styles.card,
          isDesktop && styles.cardDesktop,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
        ]}
      >
        <View style={styles.cardTopRow}>
          {item.heroImage ? (
            <Image source={{ uri: item.heroImage }} style={styles.cardThumb} />
          ) : (
            <View style={[styles.cardThumbPlaceholder, { backgroundColor: colors.bgSubtle }]}>
              <Icon name="restaurant-outline" size={24} color={colors.textMuted} />
            </View>
          )}

          <View style={styles.cardHeaderInfo}>
            <View style={styles.cardTitleRow}>
              <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.name}
              </Text>
              <StatusBadge status={item.submissionStatus} />
            </View>

            <View style={styles.tagsRow}>
              <View style={[styles.dietTagMini, { backgroundColor: '#DCFCE7' }]}>
                <Text style={styles.dietTagMiniText}>{item.diet?.toUpperCase() || 'VEG'}</Text>
              </View>
              <Text style={[styles.cardCuisineText, { color: colors.textSecondary }]}>
                {item.cuisine}
              </Text>
              {item.dishCategory && (
                <>
                  <Text style={[styles.dotSep, { color: colors.textMuted }]}>•</Text>
                  <Text style={[styles.cardCuisineText, { color: colors.textSecondary }]}>
                    {item.dishCategory}
                  </Text>
                </>
              )}
            </View>

            {/* Instruction Type Badge */}
            <View style={styles.instructionBadgeRow}>
              <View
                style={[
                  styles.instructionBadge,
                  {
                    backgroundColor:
                      instructionMode === 'video'
                        ? '#FEE2E2'
                        : instructionMode === 'both'
                          ? '#FEF3C7'
                          : colors.bgSubtle,
                    borderColor:
                      instructionMode === 'video'
                        ? '#FCA5A5'
                        : instructionMode === 'both'
                          ? '#FDE68A'
                          : colors.borderLight,
                  },
                ]}
              >
                <Icon
                  name={
                    instructionMode === 'video'
                      ? 'logo-youtube'
                      : instructionMode === 'both'
                        ? 'sparkles'
                        : 'restaurant'
                  }
                  size={11}
                  color={
                    instructionMode === 'video'
                      ? '#DC2626'
                      : instructionMode === 'both'
                        ? '#D97706'
                        : colors.textSecondary
                  }
                />
                <Text
                  style={[
                    styles.instructionBadgeText,
                    {
                      color:
                        instructionMode === 'video'
                          ? '#DC2626'
                          : instructionMode === 'both'
                            ? '#92400E'
                            : colors.textSecondary,
                    },
                  ]}
                >
                  {instructionMode === 'video'
                    ? 'YouTube Video Only'
                    : instructionMode === 'both'
                      ? 'Video + Step Cards'
                      : `${item.recipeSteps?.length || 0} Step Cards`}
                </Text>
              </View>

              <Text style={[styles.cardDate, { color: colors.textMuted }]}>
                {new Date(item.submittedAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats strip row */}
        <View style={[styles.cardStatsRow, { borderColor: colors.borderLight }]}>
          <View style={styles.statItem}>
            <Icon name="people-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>
              {item.servings} Servings
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="timer-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>
              {item.prepTimeMinutes + item.cookTimeMinutes} min
            </Text>
          </View>
          <View style={styles.statItem}>
            <Icon name="cube-outline" size={13} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>
              {item.ingredients?.length || 0} ingredients
            </Text>
          </View>
        </View>

        {/* Rejection feedback */}
        {item.submissionStatus === 'rejected' && item.reviewNotes && (
          <View
            style={[styles.feedbackBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}
          >
            <Icon name="alert-circle" size={14} color="#DC2626" />
            <Text style={[styles.feedbackText, { color: '#DC2626' }]}>
              Admin Review: {item.reviewNotes}
            </Text>
          </View>
        )}

        {/* Published info */}
        {item.submissionStatus === 'published' && (
          <View
            style={[styles.feedbackBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}
          >
            <Icon name="checkmark-circle" size={14} color="#15803D" />
            <Text style={[styles.feedbackText, { color: '#15803D' }]}>
              Live on RasoiGenie catalog! Admin price: {item.price ? `₹${item.price}` : 'TBD'}
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.editBtn,
              { borderColor: colors.primary, backgroundColor: colors.primaryLight, marginRight: 8 },
            ]}
            onPress={() => onEditRecipe(item)}
          >
            <Icon name="create-outline" size={14} color={colors.primary} />
            <Text style={[styles.editBtnText, { color: colors.primary }]}>Edit Recipe</Text>
          </TouchableOpacity>

          {(item.submissionStatus === 'draft' || item.submissionStatus === 'rejected') && (
            <TouchableOpacity
              style={[styles.deleteBtn, { borderColor: colors.danger }]}
              onPress={() => onDeleteRecipe(item.id, item.name)}
              disabled={deletingId === item.id}
            >
              {deletingId === item.id ? (
                <ActivityIndicator size="small" color={colors.danger} />
              ) : (
                <>
                  <Icon name="trash-outline" size={14} color={colors.danger} />
                  <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      contentContainerStyle={[styles.content, { backgroundColor: colors.bgPrimary }]}
    >
      {/* ── Top Header Bar ── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.bgSurface,
            borderBottomColor: colors.borderLight,
            paddingTop: isDesktop ? 24 : 56,
          },
        ]}
      >
        <View style={styles.headerInner}>
          <View style={styles.headerLeft}>
            <View style={[styles.chefAvatarBadge, { backgroundColor: colors.primaryLight }]}>
              <Icon name="restaurant" size={20} color={colors.primary} />
            </View>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Chef Studio</Text>
                <View style={[styles.activeRolePill, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.activeRolePillText, { color: colors.primary }]}>
                    Certified Chef
                  </Text>
                </View>
              </View>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {activeChefProfile?.displayName ?? fallbackChefName} • Manage, edit & author meal
                kit recipes
              </Text>
            </View>
          </View>

          <TouchableOpacity
            testID="chef-create-recipe-btn"
            id="chef-create-recipe-btn"
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={onNewRecipe}
          >
            <Icon name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create New Recipe</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── KPI Metrics Cards Grid ── */}
      {submissions.length > 0 && (
        <View style={styles.kpiContainer}>
          <View style={[styles.kpiGrid, isDesktop && styles.kpiGridDesktop]}>
            {[
              {
                label: 'Total Submitted',
                value: counts.all,
                icon: 'restaurant-outline',
                color: colors.primary,
                bg: colors.primaryLight,
              },
              {
                label: 'Pending Review',
                value: counts.pending,
                icon: 'time-outline',
                color: '#D97706',
                bg: '#FEF3C7',
              },
              {
                label: 'Published Live',
                value: counts.published,
                icon: 'checkmark-circle-outline',
                color: '#15803D',
                bg: '#DCFCE7',
              },
              {
                label: 'Action Needed',
                value: counts.rejected,
                icon: 'alert-circle-outline',
                color: colors.danger,
                bg: '#FEE2E2',
              },
            ].map((kpi) => (
              <View
                key={kpi.label}
                style={[
                  styles.kpiCard,
                  isDesktop && styles.kpiCardDesktop,
                  { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
                ]}
              >
                <View style={[styles.kpiIconWrap, { backgroundColor: kpi.bg }]}>
                  <Icon name={kpi.icon as any} size={18} color={kpi.color} />
                </View>
                <View>
                  <Text style={[styles.kpiValue, { color: colors.textPrimary }]}>{kpi.value}</Text>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>{kpi.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── Filter & Search Controls ── */}
      {submissions.length > 0 && (
        <View style={styles.controlsSection}>
          <View style={[styles.controlsRow, isDesktop && styles.controlsRowDesktop]}>
            {/* Search Input */}
            <View
              style={[
                styles.searchBox,
                isDesktop && { flex: 1, maxWidth: 360 },
                { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
              ]}
            >
              <Icon name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search by recipe, cuisine, diet..."
                placeholderTextColor={colors.textMuted}
                style={[styles.searchInput, { color: colors.textPrimary }]}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Icon name="close-circle" size={15} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterTabsRow}>
              {[
                { key: 'all', label: `All (${counts.all})` },
                { key: 'pending_review', label: `Pending (${counts.pending})` },
                { key: 'published', label: `Published (${counts.published})` },
                { key: 'rejected', label: `Action Needed (${counts.rejected})` },
              ].map((tab) => {
                const isSelected = selectedStatusTab === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    onPress={() => setSelectedStatusTab(tab.key as StatusFilterTab)}
                    style={[
                      styles.filterTab,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.bgCard,
                        borderColor: isSelected ? colors.primary : colors.borderLight,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterTabText,
                        { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

      {/* ── Main Content / Cards Grid ── */}
      {loading ? (
        <View style={[styles.center, { backgroundColor: colors.bgPrimary }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 12 }]}>
            Loading your recipes...
          </Text>
        </View>
      ) : submissions.length === 0 ? (
        <View style={[styles.center, { backgroundColor: colors.bgPrimary }]}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
            <Icon name="restaurant" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No recipes yet</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Create your first recipe and submit it for admin review. Once approved, it will be
            published as a live meal kit on RasoiGenie.
          </Text>
          <TouchableOpacity
            testID="chef-create-first-recipe-btn"
            style={[styles.createBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={onNewRecipe}
          >
            <Icon name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create My First Recipe</Text>
          </TouchableOpacity>
        </View>
      ) : filteredSubmissions.length === 0 ? (
        <View style={[styles.center, { backgroundColor: colors.bgPrimary }]}>
          <Icon name="search-outline" size={36} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.textPrimary, marginTop: 12 }]}>
            No matching recipes found
          </Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Try clearing your search query or choosing another status tab.
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.cardsContainer,
            isDesktop && styles.cardsContainerDesktop,
            { backgroundColor: colors.bgPrimary },
          ]}
        >
          {filteredSubmissions.map(renderCard)}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 80,
    flexGrow: 1,
  },
  header: {
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  headerInner: {
    maxWidth: 1160,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  chefAvatarBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12.5,
    marginTop: 2,
  },
  activeRolePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeRolePillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  kpiContainer: {
    maxWidth: 1160,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginTop: 18,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiGridDesktop: {
    flexWrap: 'nowrap',
  },
  kpiCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  kpiCardDesktop: {
    minWidth: 0,
  },
  kpiIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },
  controlsSection: {
    maxWidth: 1160,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
    marginBottom: 4,
  },
  controlsRow: {
    flexDirection: 'column',
    gap: 12,
  },
  controlsRowDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardsContainer: {
    maxWidth: 1160,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 14,
  },
  cardsContainerDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  cardDesktop: {
    width: 'calc(50% - 7px)' as any,
  },
  cardTopRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardThumb: {
    width: 80,
    height: 80,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  cardThumbPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeaderInfo: {
    flex: 1,
    gap: 4,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dietTagMini: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  dietTagMiniText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '800',
  },
  cardCuisineText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dotSep: {
    fontSize: 12,
  },
  instructionBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  instructionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  instructionBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  cardDate: {
    fontSize: 11,
  },
  cardStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    minHeight: 380,
    padding: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    maxWidth: 380,
  },
});
