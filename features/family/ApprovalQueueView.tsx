import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { familyStrings } from '../../framework/family/familyStrings';
import { FamilyCartItem } from '../../framework/services/familyService';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';
import { ApprovalRow } from './ApprovalRow';

export const ApprovalQueueView: React.FC = () => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { cartState, members, approveDependentItem, rejectDependentItem, refreshFamily } =
    useFamily();

  const [refreshing, setRefreshing] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isApprovingAll, setIsApprovingAll] = useState(false);

  const t = familyStrings.approvalQueue;
  const pendingItems = cartState.pendingItems;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshFamily();
    } finally {
      setRefreshing(false);
    }
  };

  const handleApprove = async (item: FamilyCartItem) => {
    setActionLoadingId(item.id);
    try {
      await approveDependentItem(item.id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (item: FamilyCartItem) => {
    Alert.prompt
      ? Alert.prompt(
          'Reject Item',
          'Optional reason for rejection:',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: async (reason?: string) => {
                setActionLoadingId(item.id);
                try {
                  await rejectDependentItem(item.id, reason?.trim());
                } finally {
                  setActionLoadingId(null);
                }
              },
            },
          ],
          'plain-text',
        )
      : (async () => {
          setActionLoadingId(item.id);
          try {
            await rejectDependentItem(item.id, 'Declined by owner');
          } finally {
            setActionLoadingId(null);
          }
        })();
  };

  const handleApproveAll = async () => {
    setIsApprovingAll(true);
    try {
      for (const item of pendingItems) {
        await approveDependentItem(item.id);
      }
    } finally {
      setIsApprovingAll(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Header */}
      <View
        style={[
          styles.topBar,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{t.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {pendingItems.length} item{pendingItems.length !== 1 ? 's' : ''} awaiting review
          </Text>
        </View>

        {pendingItems.length > 1 && (
          <Button
            title={isApprovingAll ? 'Approving...' : t.approveAllBtn}
            variant="primary"
            size="sm"
            onPress={handleApproveAll}
            disabled={isApprovingAll}
            loading={isApprovingAll}
            testID="approve-all-btn"
          />
        )}
      </View>

      {/* Empty State */}
      {pendingItems.length === 0 ? (
        <View style={styles.centerBox}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name="check" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t.emptyTitle}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t.emptySubtitle}
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollBody}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {pendingItems.map((item) => {
            const member = members.find((m) => m.user_id === item.added_by);
            const addedByName = member?.display_name || 'Dependent';

            return (
              <ApprovalRow
                key={item.id}
                item={item}
                addedByName={addedByName}
                onApprove={() => handleApprove(item)}
                onReject={() => handleReject(item)}
                actionLoading={actionLoadingId === item.id}
                testID={`approval-item-${item.id}`}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  scrollBody: {
    padding: 16,
    gap: 14,
  },
});
