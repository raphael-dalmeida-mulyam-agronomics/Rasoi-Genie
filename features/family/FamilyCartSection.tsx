import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '../../framework/theme/ThemeContext';
import { useFamily } from '../../framework/context/FamilyContext';
import { useAuth } from '../../framework/context/AuthContext';
import { FamilyCartItem } from '../../framework/services/familyService';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { Badge } from '../../framework/ui/Badge';
import { Icon } from '../../framework/ui/Icon';
import { QuantityStepper } from '../../framework/ui/QuantityStepper';

interface FamilyCartSectionProps {
  onStartCheckout: () => void;
}

export const FamilyCartSection: React.FC<FamilyCartSectionProps> = ({ onStartCheckout }) => {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const {
    family,
    members,
    role,
    isOwner,
    isCoOwner,
    isDependent,
    canPay,
    canApproveItems,
    cartState,
    memberBreakdown,
    isCartLocked,
    isHoldActive,
    isHeldByMe,
    isHeldByOther,
    heldByOtherName,
    activeHold,
    editFamilyItem,
    removeFamilyItem,
    approveDependentItem,
    rejectDependentItem,
    toggleCartLock,
    startCheckoutHold,
    cancelCheckoutHold,
  } = useFamily();

  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [isHolding, setIsHolding] = useState(false);

  // Map member user IDs to display names
  const memberNames: Record<string, string> = {};
  members.forEach((m) => {
    memberNames[m.user_id] = m.display_name;
  });

  const getAddedByName = (userId: string) => {
    if (userId === user?.uid) return 'You';
    return memberNames[userId] || 'Member';
  };

  // Bulk Approve / Reject
  const handleApproveAll = async () => {
    for (const item of cartState.pendingItems) {
      await approveDependentItem(item.id);
    }
  };

  const handleRejectAll = async () => {
    Alert.alert(
      'Reject All Pending Items',
      'Are you sure you want to reject all unapproved dependent items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject All',
          style: 'destructive',
          onPress: async () => {
            for (const item of cartState.pendingItems) {
              await rejectDependentItem(item.id, 'Not approved by owner');
            }
          },
        },
      ],
    );
  };

  // Checkout button handler
  const handleProceedToCheckout = async () => {
    if (!canPay) {
      Alert.alert(
        'Permission Restricted',
        'Only the family owner or a co-owner can start checkout and pay.',
      );
      return;
    }

    if (cartState.approvedItems.length === 0) {
      Alert.alert('Empty Basket', 'No approved items in the family basket.');
      return;
    }

    if (isHeldByOther) {
      Alert.alert(
        'Checkout Reserved',
        `${heldByOtherName} is currently checking out. Please wait a few moments.`,
      );
      return;
    }

    // Warn if pending items exist
    if (cartState.pendingItems.length > 0) {
      Alert.alert(
        'Pending Items Notice',
        `${cartState.pendingItems.length} item(s) awaiting approval won't be included in this checkout. Proceed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Proceed',
            onPress: async () => {
              await executeCheckoutHold();
            },
          },
        ],
      );
      return;
    }

    await executeCheckoutHold();
  };

  const executeCheckoutHold = async () => {
    setIsHolding(true);
    try {
      const res = await startCheckoutHold();
      if (!res.success) {
        Alert.alert('Checkout Freeze', res.error || 'Could not start checkout hold');
      } else {
        onStartCheckout();
      }
    } finally {
      setIsHolding(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ─── CART LOCK BANNER ──────────────────────────────────────────────── */}
      {isCartLocked && (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.warning ? colors.warning + '20' : '#F59E0B20' },
          ]}
        >
          <Icon name="lock-closed" size={18} color={colors.warning || '#F59E0B'} />
          <Text style={[styles.bannerText, { color: colors.warning || '#D97706' }]}>
            {isOwner
              ? 'Family basket is locked for members. As owner, you can still add or remove items.'
              : 'Family basket is locked by the owner. Edits are disabled.'}
          </Text>
          {isOwner && (
            <TouchableOpacity onPress={() => toggleCartLock(false)}>
              <Text style={[styles.bannerAction, { color: colors.primary }]}>Unlock</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ─── CHECKOUT HOLD BANNER ──────────────────────────────────────────── */}
      {isHoldActive && (
        <View
          style={[
            styles.banner,
            {
              backgroundColor: isHeldByMe
                ? colors.primaryLight
                  ? colors.primaryLight + '25'
                  : '#E0F2FE'
                : '#FEE2E2',
            },
          ]}
        >
          <Icon
            name={isHeldByMe ? 'bag-check' : 'time'}
            size={18}
            color={isHeldByMe ? colors.primary : '#EF4444'}
          />
          <Text style={[styles.bannerText, { color: isHeldByMe ? colors.primary : '#DC2626' }]}>
            {isHeldByMe
              ? 'You have reserved checkout. (10 min hold)'
              : `${heldByOtherName} is currently checking out...`}
          </Text>
          {isHeldByMe && (
            <TouchableOpacity onPress={cancelCheckoutHold}>
              <Text style={[styles.bannerAction, { color: colors.primary }]}>Release</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Owner Lock/Unlock Quick Toggle */}
      {isOwner && !isCartLocked && (
        <View style={styles.lockRow}>
          <TouchableOpacity style={styles.lockToggle} onPress={() => toggleCartLock(true)}>
            <Icon name="lock-closed-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.lockToggleText, { color: colors.textSecondary }]}>
              Lock Basket (Prevent Changes)
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── AWAITING APPROVAL SECTION (OWNER VIEW) ─────────────────────────── */}
      {cartState.pendingItems.length > 0 && (
        <View style={styles.sectionBox}>
          <View style={styles.sectionHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Awaiting Approval
              </Text>
              <Badge label={String(cartState.pendingItems.length)} variant="accent" />
            </View>

            {canApproveItems && (
              <View style={styles.bulkRow}>
                <TouchableOpacity onPress={handleApproveAll} style={styles.bulkButton}>
                  <Text style={[styles.bulkText, { color: colors.primary }]}>Approve All</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRejectAll} style={styles.bulkButton}>
                  <Text style={[styles.bulkText, { color: colors.danger }]}>Reject All</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {cartState.pendingItems.map((item) => (
            <Card key={item.id} style={styles.itemCard}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                    {item.kit_id.replace(/_/g, ' ')}
                  </Text>
                  <View style={styles.itemMeta}>
                    <Badge
                      label={`Added by ${getAddedByName(item.added_by)}`}
                      variant="outline"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={[styles.itemSubtext, { color: colors.textSecondary }]}>
                      {item.quantity} kit • {item.servings} servings • {item.spice_level}
                    </Text>
                  </View>
                  <Text style={[styles.itemPrice, { color: colors.primary }]}>
                    ₹{item.quantity * item.unit_price}
                  </Text>
                </View>

                {/* Owner Approve / Reject Action Buttons */}
                {canApproveItems ? (
                  <View style={styles.itemActions}>
                    <TouchableOpacity
                      style={[
                        styles.circleBtn,
                        { backgroundColor: colors.success ? colors.success + '20' : '#10B98120' },
                      ]}
                      onPress={() => approveDependentItem(item.id)}
                    >
                      <Icon name="checkmark" size={18} color={colors.success || '#10B981'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.circleBtn, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => rejectDependentItem(item.id, 'Not added')}
                    >
                      <Icon name="close" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Badge label="Waiting for Owner" variant="neutral" />
                )}
              </View>
            </Card>
          ))}
        </View>
      )}

      {/* ─── APPROVED ITEMS SECTION ─────────────────────────────────────────── */}
      <View style={styles.sectionBox}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Approved Family Items
          </Text>
          <Text style={[styles.sectionCount, { color: colors.textSecondary }]}>
            {cartState.approvedItems.length} item{cartState.approvedItems.length !== 1 ? 's' : ''}
          </Text>
        </View>

        {cartState.approvedItems.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Icon name="cart-outline" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No approved items yet. Add meal kits to dine together!
            </Text>
          </Card>
        ) : (
          cartState.approvedItems.map((item) => {
            const isMyItem = item.added_by === user?.uid;
            const canModify = isOwner || (isMyItem && !isCartLocked);

            return (
              <Card key={item.id} style={styles.itemCard}>
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                      {item.kit_id.replace(/_/g, ' ')}
                    </Text>
                    <View style={styles.itemMeta}>
                      <Badge
                        label={`Added by ${getAddedByName(item.added_by)}`}
                        variant="neutral"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.itemSubtext, { color: colors.textSecondary }]}>
                        {item.servings} servings • {item.spice_level}
                      </Text>
                    </View>
                    <Text style={[styles.itemPrice, { color: colors.primary }]}>
                      ₹{item.quantity * item.unit_price}
                    </Text>
                  </View>

                  {/* Quantity Stepper & Remove */}
                  {canModify ? (
                    <View style={styles.stepperContainer}>
                      <QuantityStepper
                        value={item.quantity}
                        min={1}
                        max={10}
                        onChange={(qty) => editFamilyItem(item, qty)}
                      />
                      <TouchableOpacity
                        onPress={() => removeFamilyItem(item.id)}
                        style={styles.deleteBtn}
                      >
                        <Icon name="trash-outline" size={18} color={colors.danger} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={[styles.qtyStatic, { color: colors.textSecondary }]}>
                      Qty: {item.quantity}
                    </Text>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </View>

      {/* ─── PER-MEMBER BREAKDOWN ACCORDION ─────────────────────────────────── */}
      {memberBreakdown.length > 0 && (
        <Card style={styles.breakdownCard}>
          <TouchableOpacity
            style={styles.breakdownToggle}
            onPress={() => setBreakdownVisible(!breakdownVisible)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name="pie-chart-outline" size={18} color={colors.primary} />
              <Text style={[styles.breakdownTitle, { color: colors.textPrimary }]}>
                Per-Member Cost Allocation
              </Text>
            </View>
            <Icon
              name={breakdownVisible ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>

          {breakdownVisible && (
            <View style={styles.breakdownContent}>
              <Text style={[styles.breakdownNote, { color: colors.textSecondary }]}>
                Display-only. One payer checks out for the whole family basket. Allocated using
                Largest Remainder so paise sum exactly.
              </Text>
              {memberBreakdown.map((mb) => (
                <View key={mb.userId} style={styles.breakdownRow}>
                  <Text style={[styles.breakdownMember, { color: colors.textPrimary }]}>
                    {mb.displayName} ({mb.items.length} items)
                  </Text>
                  <Text style={[styles.breakdownAmount, { color: colors.textPrimary }]}>
                    ₹{mb.finalTotal.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      )}

      {/* ─── TOTAL & CHECKOUT BUTTON ─────────────────────────────────────────── */}
      <View style={styles.footerBox}>
        <View style={styles.totalRow}>
          <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>
            Family Basket Total
          </Text>
          <Text style={[styles.totalAmount, { color: colors.primary }]}>₹{cartState.subtotal}</Text>
        </View>

        {!isDependent && (
          <>
            <Button
              title={
                isHolding
                  ? 'Reserving Basket...'
                  : canPay
                    ? 'Proceed to Family Checkout'
                    : 'Only Owner or Co-Owner Can Pay'
              }
              onPress={handleProceedToCheckout}
              disabled={
                !canPay || cartState.approvedItems.length === 0 || isHeldByOther || isHolding
              }
              style={styles.checkoutBtn}
            />

            {!canPay && (
              <Text style={[styles.permissionNote, { color: colors.textSecondary }]}>
                You are an adult member. Co-owners and the family owner handle checkout and payment.
              </Text>
            )}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  bannerText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  bannerAction: {
    fontSize: 12,
    fontWeight: '700',
  },
  lockRow: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  lockToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 4,
  },
  lockToggleText: {
    fontSize: 12,
  },
  sectionBox: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
  },
  bulkRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bulkButton: {
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  bulkText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemCard: {
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemSubtext: {
    fontSize: 12,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 8,
  },
  circleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperContainer: {
    alignItems: 'flex-end',
    gap: 6,
  },
  deleteBtn: {
    padding: 4,
  },
  qtyStatic: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  emptyText: {
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
  breakdownCard: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 16,
  },
  breakdownToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownContent: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
    paddingTop: 8,
  },
  breakdownNote: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 8,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownMember: {
    fontSize: 13,
  },
  breakdownAmount: {
    fontSize: 13,
    fontWeight: '600',
  },
  footerBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E2E8F0',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  totalAmount: {
    fontSize: 22,
    fontWeight: '800',
  },
  checkoutBtn: {
    height: 50,
    borderRadius: 14,
  },
  permissionNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
