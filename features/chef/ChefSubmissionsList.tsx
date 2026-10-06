import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
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

function StatusBadge({ status }: { status: ChefSubmissionRecord['submissionStatus'] }) {
  const colorMap: Record<
    ChefSubmissionRecord['submissionStatus'],
    { bg: string; text: string; label: string }
  > = {
    draft: { bg: '#F3F4F6', text: '#374151', label: 'Draft' },
    pending_review: { bg: '#FEF3C7', text: '#92400E', label: 'Pending Review' },
    published: { bg: '#DCFCE7', text: '#15803D', label: 'Published' },
    rejected: { bg: '#FEE2E2', text: '#B91C1C', label: 'Rejected' },
  };
  const s = colorMap[status] ?? colorMap.draft;
  return (
    <View
      style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, backgroundColor: s.bg }}
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

  const renderItem = ({ item }: { item: ChefSubmissionRecord }) => (
    <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={[styles.cardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {item.name}
          </Text>
          <StatusBadge status={item.submissionStatus} />
        </View>
        <Text style={[styles.cardTagline, { color: colors.textSecondary }]} numberOfLines={1}>
          {item.cuisine} • {item.diet.toUpperCase()} • {item.spiceLevel}
        </Text>
        <Text style={[styles.cardDate, { color: colors.textMuted }]}>
          Submitted{' '}
          {new Date(item.submittedAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {[
          { icon: 'people', value: `${item.servings} servings` },
          { icon: 'timer', value: `${item.prepTimeMinutes + item.cookTimeMinutes} min` },
          { icon: 'leaf', value: `${item.ingredients.length} ingredients` },
        ].map(({ icon, value }) => (
          <View key={value} style={styles.statItem}>
            <Icon name={icon as any} size={13} color={colors.textMuted} />
            <Text style={[styles.statText, { color: colors.textMuted }]}>{value}</Text>
          </View>
        ))}
      </View>

      {/* Rejection feedback */}
      {item.submissionStatus === 'rejected' && item.reviewNotes && (
        <View style={[styles.feedbackBox, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
          <Icon name="alert" size={14} color="#DC2626" />
          <Text style={[styles.feedbackText, { color: '#DC2626' }]}>{item.reviewNotes}</Text>
        </View>
      )}

      {/* Published info */}
      {item.submissionStatus === 'published' && (
        <View style={[styles.feedbackBox, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
          <Icon name="check-circle" size={14} color="#15803D" />
          <Text style={[styles.feedbackText, { color: '#15803D' }]}>
            Your recipe is live! Price set by admin: {item.price ? `₹${item.price}` : 'TBD'}
          </Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.editBtn, { borderColor: colors.primary, marginRight: 8 }]}
          onPress={() => onEditRecipe(item)}
        >
          <Icon name="create" size={14} color={colors.primary} />
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
                <Icon name="trash" size={14} color={colors.danger} />
                <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={[styles.chefBadge, { backgroundColor: colors.primaryLight }]}>
            <Icon name="chef" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Chef Studio</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {activeChefProfile?.displayName ?? fallbackChefName} • Recipe Submissions
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
          <Text style={styles.createBtnText}>New Recipe</Text>
        </TouchableOpacity>
      </View>

      {/* Stats strip */}
      {submissions.length > 0 && (
        <View
          style={[
            styles.statsStrip,
            { backgroundColor: colors.bgSubtle, borderBottomColor: colors.borderLight },
          ]}
        >
          {[
            { label: 'Total', value: submissions.length, color: colors.textPrimary },
            {
              label: 'Pending',
              value: submissions.filter((s) => s.submissionStatus === 'pending_review').length,
              color: '#D97706',
            },
            {
              label: 'Published',
              value: submissions.filter((s) => s.submissionStatus === 'published').length,
              color: '#15803D',
            },
            {
              label: 'Rejected',
              value: submissions.filter((s) => s.submissionStatus === 'rejected').length,
              color: colors.danger,
            },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.stripItem}>
              <Text style={[styles.stripValue, { color }]}>{value}</Text>
              <Text style={[styles.stripLabel, { color: colors.textMuted }]}>{label}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.emptyText, { color: colors.textMuted, marginTop: 12 }]}>
            Loading your recipes...
          </Text>
        </View>
      ) : submissions.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.primaryLight }]}>
            <Icon name="chef" size={40} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No recipes yet</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Create your first recipe and submit it for admin review. Once approved it will be
            published as a live meal kit on RasoiGenie.
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
            onPress={onNewRecipe}
          >
            <Icon name="add" size={18} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Create My First Recipe</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chefBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  headerSubtitle: { fontSize: 12, marginTop: 2 },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  createBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  statsStrip: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    justifyContent: 'space-around',
  },
  stripItem: { alignItems: 'center' },
  stripValue: { fontSize: 20, fontWeight: '800' },
  stripLabel: { fontSize: 11, marginTop: 2, fontWeight: '600' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18, maxWidth: 320 },
  list: { padding: 16, gap: 12, maxWidth: 960, width: '100%', alignSelf: 'center' },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: { marginBottom: 12 },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardName: { fontSize: 16, fontWeight: '700', flex: 1, marginRight: 8 },
  cardTagline: { fontSize: 12, marginBottom: 4 },
  cardDate: { fontSize: 11 },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
    marginBottom: 12,
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: 12 },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  feedbackText: { fontSize: 12, flex: 1, lineHeight: 16 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtnText: { fontSize: 12, fontWeight: '700' },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteBtnText: { fontSize: 12, fontWeight: '700' },
});
