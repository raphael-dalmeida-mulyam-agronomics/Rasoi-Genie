import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { useAuth } from '../../framework/context/AuthContext';
import { useCart } from '../../framework/context/CartContext';
import { getMealKitById } from '../../framework/services/mealKitsService';
import { can } from '../../framework/family/permissions';
import { familyStrings } from '../../framework/family/familyStrings';
import {
  FamilyCartItem,
  FamilyMember,
  extractFirstName,
} from '../../framework/services/familyService';
import { Avatar } from '../../framework/ui/Avatar';
import { RoleBadge } from '../../framework/ui/RoleBadge';
import { Button } from '../../framework/ui/Button';
import { Badge } from '../../framework/ui/Badge';
import { Icon } from '../../framework/ui/Icon';
import { FamilyCartItemRow } from './FamilyCartItemRow';
import { CheckoutHoldBanner } from './CheckoutHoldBanner';

export interface FamilyCartViewProps {
  onProceedToCheckout?: () => void;
}

export const FamilyCartView: React.FC<FamilyCartViewProps> = ({ onProceedToCheckout }) => {
  const { colors, radii, shadows, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const isWebSplit = width >= 768;

  const { user } = useAuth();
  const { addItem } = useCart();
  const {
    family,
    role,
    members,
    currentMember,
    cartState,
    memberBreakdown,
    activeHold,
    isCartLocked,
    isHeldByMe,
    isHeldByOther,
    heldByOtherName,
    editFamilyItem,
    removeFamilyItem,
    approveDependentItem,
    rejectDependentItem,
    toggleCartLock,
    startCheckoutHold,
  } = useFamily();

  const [rejectItemTarget, setRejectItemTarget] = useState<FamilyCartItem | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const handleMoveToPersonalCart = async (item: FamilyCartItem) => {
    const kit = getMealKitById(item.kit_id);
    if (kit) {
      addItem(kit, item.quantity, item.servings, item.spice_level);
    }
    await removeFamilyItem(item.id);
  };

  const handleRemoveFamilyItem = async (itemId: string) => {
    try {
      const res = await removeFamilyItem(itemId);
      if (res && !res.success) {
        Alert.alert('Cannot Remove Item', res.error || 'Failed to remove item from basket.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not remove item.');
    }
  };

  const t = familyStrings.cart;
  const isOwner = role === 'owner';
  const isDependent = role === 'dependent';

  // Group items by member (added_by)
  const itemsByMember = useMemo(() => {
    const map = new Map<string, FamilyCartItem[]>();
    for (const item of cartState.items) {
      const list = map.get(item.added_by) || [];
      list.push(item);
      map.set(item.added_by, list);
    }
    return map;
  }, [cartState.items]);

  // Handle Checkout initiation
  const handleProceedToCheckout = async () => {
    if (isCartLocked && !isOwner) {
      Alert.alert('Cart Locked', 'The family basket is currently locked by the owner.');
      return;
    }
    if (cartState.approvedItems.length === 0) {
      Alert.alert(
        'No Approved Items',
        'There are no approved meal kits in the basket to checkout.',
      );
      return;
    }

    setIsProcessingCheckout(true);
    try {
      const holdRes = await startCheckoutHold();
      if (!holdRes.success) {
        Alert.alert(
          'Checkout In Progress',
          holdRes.error || `${holdRes.holderName || 'Another payer'} is already checking out.`,
        );
        return;
      }
      // Navigate to checkout with family mode active
      if (onProceedToCheckout) {
        onProceedToCheckout();
      } else {
        router.push({
          pathname: '/(tabs)/cart',
          params: { step: 'checkout', type: 'family' },
        } as any);
      }
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  const handleToggleLock = async () => {
    try {
      await toggleCartLock(!isCartLocked);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not toggle basket lock.');
    }
  };

  const handleRejectPrompt = (item: FamilyCartItem) => {
    Alert.prompt
      ? Alert.prompt(
          'Reject Item',
          'Optional reason for rejection (e.g. Too spicy, already ordered):',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Reject',
              style: 'destructive',
              onPress: async (reason?: string) => {
                await rejectDependentItem(item.id, reason?.trim());
              },
            },
          ],
          'plain-text',
        )
      : (async () => {
          await rejectDependentItem(item.id, 'Declined by family owner');
        })();
  };

  // 1. Empty Cart State
  if (cartState.items.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
            <Icon name="basket" size={48} color={colors.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{t.emptyTitle}</Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            {t.emptySubtitle}
          </Text>

          <Button
            title={t.browseBtn}
            variant="primary"
            size="lg"
            onPress={() => router.push('/(tabs)' as any)}
            style={{ marginTop: 16 }}
            testID="family-cart-browse-btn"
          />
        </View>
      </View>
    );
  }

  // Member Left Rail for Web (768px+)
  const renderMemberRail = () => (
    <View
      style={[
        styles.webRail,
        {
          backgroundColor: colors.bgSurface,
          borderColor: colors.borderLight,
          borderRadius: radii.xl,
        },
      ]}
    >
      <Text style={[styles.railTitle, { color: colors.textPrimary }]}>Household Members</Text>
      <View style={styles.railMemberList}>
        {members.map((m) => {
          const breakdown = memberBreakdown.find((b) => b.userId === m.user_id);
          const itemCount = (itemsByMember.get(m.user_id) || []).length;
          return (
            <View key={m.user_id} style={styles.railMemberRow}>
              <Avatar name={m.display_name} id={m.user_id} size="sm" />
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.railMemberName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {extractFirstName(m.display_name)}
                </Text>
                <Text style={[styles.railItemCount, { color: colors.textMuted }]}>
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </Text>
              </View>
              {can(role, 'view_other_members_pricing') && breakdown ? (
                <Text style={[styles.railSubtotal, { color: colors.primary }]}>
                  ₹{breakdown.subtotal}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );

  // Cart Items List
  const renderItemsList = () => (
    <View style={{ flex: 1, gap: 16 }}>
      {/* Locked Cart Banner */}
      {isCartLocked && (
        <View style={[styles.statusStrip, { backgroundColor: '#FEE2E2', borderColor: '#EF4444' }]}>
          <Icon name="lock" size={16} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.statusStripText}>
            {isOwner
              ? 'Family basket is locked for other members. You can still add, edit, or remove items.'
              : t.lockedBanner(family?.name || 'Owner')}
          </Text>
        </View>
      )}

      {/* Checkout Hold Active Banner */}
      {activeHold && (
        <CheckoutHoldBanner
          holderName={heldByOtherName}
          expiresAt={activeHold.expires_at}
          isHeldByMe={isHeldByMe}
        />
      )}

      {/* Items Grouped By Member */}
      {Array.from(itemsByMember.entries()).map(([memberId, memberItems]) => {
        const member = members.find((m) => m.user_id === memberId);
        const isMe = memberId === currentMember?.user_id;
        const displayName = isMe
          ? 'You'
          : member
            ? extractFirstName(member.display_name)
            : 'Family Member';

        const breakdown = memberBreakdown.find((b) => b.userId === memberId);

        return (
          <View
            key={memberId}
            style={[
              styles.memberGroupCard,
              {
                backgroundColor: colors.bgSurface,
                borderColor: colors.borderLight,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            {/* Member Header */}
            <View style={[styles.memberGroupHeader, { borderBottomColor: colors.borderLight }]}>
              <Avatar name={displayName} id={memberId} size="sm" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.memberGroupTitle, { color: colors.textPrimary }]}>
                  {isMe ? t.addedByYou : t.addedBy(displayName)}
                </Text>
                {member ? (
                  <RoleBadge role={member.role} dependentType={member.dependent_type} size="sm" />
                ) : null}
              </View>

              {/* Per-member subtotal (hidden for dependents) */}
              {can(role, 'view_other_members_pricing') && breakdown ? (
                <Text style={[styles.memberSubtotalText, { color: colors.primary }]}>
                  ₹{breakdown.subtotal}
                </Text>
              ) : null}
            </View>

            {/* Items inside this group */}
            <View style={styles.groupItemsList}>
              {memberItems.map((item) => {
                const isOwnItem = item.added_by === currentMember?.user_id;
                const canEditItem = isOwner
                  ? can(role, 'edit_any_item')
                  : !isCartLocked && isOwnItem && can(role, 'edit_own_item');
                const canRemoveItem = isOwner
                  ? can(role, 'remove_any_item')
                  : !isCartLocked && isOwnItem && can(role, 'remove_own_item');
                const canApproveItem = isOwner && can(role, 'approve_item');
                const canMoveToPersonal = !isDependent && (isOwner || (!isCartLocked && isOwnItem));

                return (
                  <FamilyCartItemRow
                    key={item.id}
                    item={item}
                    canEdit={canEditItem}
                    canRemove={canRemoveItem}
                    canApprove={canApproveItem}
                    canMoveToPersonal={canMoveToPersonal}
                    onQuantityChange={(qty) => editFamilyItem(item, qty)}
                    onRemove={() => handleRemoveFamilyItem(item.id)}
                    onApprove={() => approveDependentItem(item.id)}
                    onReject={() => handleRejectPrompt(item)}
                    onMoveToPersonal={() => handleMoveToPersonalCart(item)}
                    testID={`family-item-${item.id}`}
                  />
                );
              })}
            </View>
          </View>
        );
      })}

      {/* Add Item Button */}
      <Button
        title={t.addItemBtn}
        variant="outline"
        size="md"
        icon={<Icon name="add" size={18} color={colors.primary} />}
        onPress={() => router.push('/(tabs)' as any)}
        style={{ marginTop: 4 }}
        testID="family-cart-add-item-btn"
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Controls Bar */}
      <View
        style={[
          styles.topControls,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.cartHeaderTitle, { color: colors.textPrimary }]}>
            {family?.name || 'Family'} Basket
          </Text>
          <Text style={[styles.cartHeaderSubtitle, { color: colors.textSecondary }]}>
            {cartState.approvedCount} approved • {cartState.pendingCount} pending
          </Text>
        </View>

        {/* Lock/Unlock Toggle for Owner */}
        {isOwner && can(role, 'lock_cart') && (
          <TouchableOpacity
            testID="cart-lock-toggle-btn"
            style={[
              styles.lockToggleBtn,
              {
                backgroundColor: isCartLocked ? '#FEE2E2' : colors.bgSubtle,
                borderColor: isCartLocked ? '#EF4444' : colors.borderLight,
              },
            ]}
            onPress={handleToggleLock}
            accessibilityRole="button"
            accessibilityLabel={isCartLocked ? t.unlockCartBtn : t.lockCartBtn}
          >
            <Icon
              name={isCartLocked ? 'lock' : 'unlock'}
              size={16}
              color={isCartLocked ? '#DC2626' : colors.textPrimary}
            />
            <Text
              style={[
                styles.lockToggleText,
                { color: isCartLocked ? '#DC2626' : colors.textPrimary },
              ]}
            >
              {isCartLocked ? 'Locked' : 'Unlocked'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Body Content */}
      <ScrollView
        contentContainerStyle={[styles.scrollBody, isWebSplit ? styles.webSplitLayout : null]}
        showsVerticalScrollIndicator={false}
      >
        {isWebSplit && renderMemberRail()}
        {renderItemsList()}
      </ScrollView>

      {/* Bottom Sticky Action Footer */}
      <View
        style={[
          styles.bottomFooter,
          {
            backgroundColor: colors.bgSurface,
            borderTopColor: colors.borderLight,
            ...shadows.card,
          },
        ]}
      >
        {/* Total Price (Hidden for dependents) */}
        {!isDependent && (
          <View style={styles.totalRow}>
            <View>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
                {t.subtotalLabel}
              </Text>
              {cartState.pendingCount > 0 && (
                <Text style={styles.pendingExcludedNotice}>
                  ({cartState.pendingCount} pending excluded)
                </Text>
              )}
            </View>
            <Text style={[styles.totalPriceText, { color: colors.primary }]}>
              ₹{cartState.subtotal}
            </Text>
          </View>
        )}

        {/* Role Specific Bottom CTA */}
        {can(role, 'checkout') ? (
          <Button
            title={
              isProcessingCheckout
                ? 'Reserving Basket...'
                : `${t.checkoutBtn} (${cartState.approvedCount} kits)`
            }
            variant="primary"
            size="lg"
            onPress={handleProceedToCheckout}
            disabled={
              isProcessingCheckout ||
              (isCartLocked && !isOwner) ||
              cartState.approvedItems.length === 0 ||
              isHeldByOther
            }
            loading={isProcessingCheckout}
            testID="family-checkout-cta-btn"
          />
        ) : isDependent ? (
          <View style={styles.dependentFooterNote}>
            <Icon name="info" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.dependentFooterText, { color: colors.textSecondary }]}>
              {t.dependentNotice}
            </Text>
          </View>
        ) : (
          <View style={styles.memberFooterNote}>
            <Icon name="clock" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.memberFooterText, { color: colors.textMuted }]}>
              {t.waitingForOwnerNote(family?.name || 'the family owner')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  cartHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  cartHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  lockToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  lockToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 110,
    gap: 16,
  },
  webSplitLayout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 20,
  },
  webRail: {
    width: 260,
    padding: 16,
    borderWidth: 1,
    gap: 12,
  },
  railTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  railMemberList: {
    gap: 10,
  },
  railMemberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  railMemberName: {
    fontSize: 13,
    fontWeight: '600',
  },
  railItemCount: {
    fontSize: 11,
  },
  railSubtotal: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  statusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusStripText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  memberGroupCard: {
    borderWidth: 1,
    overflow: 'hidden',
  },
  memberGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
  },
  memberGroupTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  memberSubtotalText: {
    fontSize: 14,
    fontWeight: '800',
  },
  groupItemsList: {
    padding: 12,
    gap: 10,
  },
  bottomFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  pendingExcludedNotice: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '500',
  },
  totalPriceText: {
    fontSize: 22,
    fontWeight: '900',
  },
  dependentFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  dependentFooterText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  memberFooterNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  memberFooterText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
