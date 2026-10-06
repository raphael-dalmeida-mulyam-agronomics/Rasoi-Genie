import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { showInAppAlert, showInAppConfirm } from '../../framework/context/InAppDialogContext';
import { validateAdminEmail } from '../../framework/firebase/authService';
import {
    MOCK_ORDER_IDS,
    Order,
    OrderStatus,
    generateInvoiceText,
    isOrderApproved,
    issueRefund,
    subscribeToOrders,
    updateOrderStatus,
} from '../../framework/firebase/ordersService';
import {
    ALL_REGIONS,
    AdminProfile,
    AdminRole,
    ChefProfile,
    STORAGE_CENTRE_REGIONS,
    SUPER_ADMIN_EMAIL,
    assignAdminRegions,
    deleteAdminProfile,
    fetchAllAdminProfiles,
    fetchAllChefProfiles,
    grantChefRole,
    resolveStorageCentre,
    revokeChefRole
} from '../../framework/services/adminRbacService';
import {
    ChefSubmissionRecord,
    fetchAllChefSubmissions,
    publishChefSubmission,
    rejectChefSubmission
} from '../../framework/services/chefMealKitsService';
import {
    Coupon,
    addCoupon,
    deleteCoupon,
    getCoupons,
    toggleCouponActive,
} from '../../framework/services/couponsService';
import {
    CuisineType,
    DietTag,
    DishCategory,
    MealKit,
    RegionHub,
    addMealKit,
    compileMealKitTags,
    deleteMealKit,
    getMealKits,
    parseCategorizedTags,
    subscribeToMealKits,
    syncMealKitsWithSupabase,
    toggleMealKitTrending,
    updateMealKit,
    updateMealKitShelfLife,
    updateMealKitStock
} from '../../framework/services/mealKitsService';
import {
    OutOfStockAlertPayload,
    dismissOutOfStockAlert,
    notifyRegionalAdminsOutOfStock,
    subscribeToOutOfStockAlerts,
    subscribeToPendingApprovalCount
} from '../../framework/services/notificationService';
import {
    MONTHLY_TRENDS,
    generateRegionalCSV,
    getCrossTabAnalytics,
    getFilteredStateAnalytics
} from '../../framework/services/regionalAnalyticsService';
import {
    getCitiesForState,
    getSubRegionsForCity,
} from '../../framework/services/regionService';
import {
    ExtendedReview,
    getAllReviewsForModeration,
    moderateReview,
} from '../../framework/services/reviewsService';
import {
    deleteMealKitFromSupabase,
    filterMealKitsByAdminRegions,
    saveMealKitToSupabase,
    toggleMealKitOutOfStockStatus,
    toggleMealKitPublishStatus,
    toggleMealKitTrendingStatus,
    updateMealKitShelfLifeInSupabase,
} from '../../framework/services/supabaseMealKitsService';
import {
    approveOrderInSupabase,
    clearAllOrdersFromSupabase,
    fetchAllOrdersFromSupabase,
    processOrderRefund,
    refreshPendingApprovalCount,
    subscribeToOrdersRealtime,
    updateOrderStatusInSupabase,
} from '../../framework/services/supabaseOrdersService';
import {
    ManagedUser,
    fetchLiveManagedUsers,
    getManagedUsers,
    subscribeToManagedUsers,
    toggleUserAdminRole,
    toggleUserStatus,
    updateUserWalletBalance,
} from '../../framework/services/userManagementService';
import { adminIssueCredits } from '../../framework/services/walletService';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Badge, BadgeVariant } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Card } from '../../framework/ui/Card';
import { AppIconName, Icon } from '../../framework/ui/Icon';
import { AddMealKitWizardModal } from './AddMealKitWizardModal';
import { AdminNavigationMenu, AdminTab } from './AdminNavigationMenu';
import { AdminReferralsManagementView } from './AdminReferralsManagementView';
import { AdminWalletsManagementView } from './AdminWalletsManagementView';
import { InventoryManagementView } from './InventoryManagementView';
import { RecipeCardPrintModal } from './RecipeCardPrintModal';
import { ChefSubmissionApprovalView } from './ChefSubmissionApprovalView';

const STATUS_FILTERS: (OrderStatus | 'All')[] = [
  'All',
  'Pending',
  'Placed',
  'Confirmed',
  'Preparing',
  'Out for Delivery',
  'Delivered',
  'Cancelled',
  'Refunded',
];

const ADMIN_DIET_FILTERS: { id: 'All' | DietTag; label: string }[] = [
  { id: 'All', label: 'All Diets' },
  { id: 'veg', label: 'Pure Veg' },
  { id: 'nonveg', label: 'Non-Veg' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'jain', label: 'Jain' },
  { id: 'keto', label: 'Keto' },
  { id: 'gluten-free', label: 'Gluten-Free' },
];

const ADMIN_CUISINE_FILTERS: ('All' | CuisineType)[] = [
  'All',
  'North Indian',
  'South Indian',
  'Hyderabadi',
  'Punjabi',
  'Mughlai',
  'Coastal',
  'Gujarati',
  'Maharashtrian',
  'Indo-Chinese',
  'Italian',
  'Mexican',
  'American',
  'Continental',
  'European',
  'Mediterranean',
];

const ADMIN_DISH_FILTERS: ('All' | DishCategory)[] = [
  'All',
  'Curries & Gravies',
  'Biryani & Rice',
  'Burgers & Sliders',
  'Pizzas',
  'Tacos',
  'Burritos & Bowls',
  'Pastas',
  'Street Food',
  'Soups & Stews',
];
const ThinScrollView: React.FC<{
  maxHeight: number;
  keyboardShouldPersistTaps?: 'always' | 'never' | 'handled';
  children: React.ReactNode;
}> = ({ maxHeight, keyboardShouldPersistTaps, children }) => {
  const [contentH, setContentH] = useState(0);
  const [layoutH, setLayoutH] = useState(0);
  const [scrollY, setScrollY] = useState(0);

  const scrollable = layoutH > 0 && contentH > layoutH + 1;
  const maxScroll = Math.max(1, contentH - layoutH);
  const thumbH = scrollable ? Math.max(24, (layoutH / contentH) * layoutH) : 0;
  const clampedY = Math.min(Math.max(scrollY, 0), maxScroll);
  const thumbTop = scrollable ? (clampedY / maxScroll) * (layoutH - thumbH) : 0;

  return (
    <View style={{ position: 'relative' }}>
      <ScrollView
        nestedScrollEnabled
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        showsVerticalScrollIndicator={false}
        style={{ maxHeight }}
        scrollEventThrottle={16}
        onLayout={(e) => setLayoutH(e.nativeEvent.layout.height)}
        onContentSizeChange={(_, h) => setContentH(h)}
        onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
      >
        {children}
      </ScrollView>
      {scrollable && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            right: 2,
            top: thumbTop,
            width: 2,
            height: thumbH,
            borderRadius: 1,
            backgroundColor: '#000000',
          }}
        />
      )}
    </View>
  );
};
export const AdminDashboardView: React.FC<{ onNavigateToLogin?: () => void }> = ({
  onNavigateToLogin,
}) => {
  const { user, isAdmin, isSuperAdmin, isRegionalAdmin, assignedRegions, logout } = useAuth();
  const { colors, radii, shadows } = useTheme();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // Refund Modal State
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundOrder, setRefundOrder] = useState<Order | null>(null);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState(
    'Customer reported issue with fresh ingredients',
  );
  const [refundMethod, setRefundMethod] = useState<'WALLET' | 'ORIGINAL_PAYMENT'>('WALLET');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  // Cancel Order Modal State
  const [cancelOrderModalVisible, setCancelOrderModalVisible] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('Cancelled by Admin');

  // Order Details Inspection Modal State
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);
  const [inspectModalVisible, setInspectModalVisible] = useState(false);

  // Meal Kits Management State
  const [kits, setKits] = useState<MealKit[]>(getMealKits());
  const [kitSearchQuery, setKitSearchQuery] = useState('');
  const [selectedKitDietFilter, setSelectedKitDietFilter] = useState<'All' | DietTag>('All');
  const [selectedKitCuisineFilter, setSelectedKitCuisineFilter] = useState<'All' | CuisineType>(
    'All',
  );
  const [selectedKitDishFilter, setSelectedKitDishFilter] = useState<'All' | DishCategory>('All');
  const [openDropdown, setOpenDropdown] = useState<'diet' | 'cuisine' | 'dish' | null>(null);
  const [kitModalVisible, setKitModalVisible] = useState(false);
  const [editingKit, setEditingKit] = useState<MealKit | null>(null);
  const [printCardKit, setPrintCardKit] = useState<MealKit | null>(null);
  const [printCardModalVisible, setPrintCardModalVisible] = useState(false);
  const [kitToDelete, setKitToDelete] = useState<MealKit | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDeletingKit, setIsDeletingKit] = useState(false);

  // Super Admin Regional Management State
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminFormEmail, setAdminFormEmail] = useState('');
  const [adminFormName, setAdminFormName] = useState('');
  const [adminFormRole, setAdminFormRole] = useState<AdminRole>('regional_admin');
  const [adminFormRegions, setAdminFormRegions] = useState<(RegionHub | string)[]>(['pune-city']);
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);
  const [superAdminRegionFilter, setSuperAdminRegionFilter] = useState<'All' | RegionHub | string>(
    'All',
  );

  const formatRegionName = (regId: string) => {
    const sc = STORAGE_CENTRE_REGIONS.find(
      (r) =>
        r.id.toLowerCase() === regId.toLowerCase() || r.name.toLowerCase() === regId.toLowerCase(),
    );
    if (sc) return `${sc.name} (${sc.city})`;
    return `${regId} Region`;
  };

  // Regional Analytics State
  const [selectedState, setSelectedState] = useState('Maharashtra');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSubRegion, setSelectedSubRegion] = useState('');
  const [crossTabDiet, setCrossTabDiet] = useState<'all' | DietTag>('all');

  // Dropdown visibility for analytics region pickers
  const [showAnalyticsStateDD, setShowAnalyticsStateDD] = useState(false);
  const [showAnalyticsCityDD, setShowAnalyticsCityDD] = useState(false);
  const [showAnalyticsSubRegionDD, setShowAnalyticsSubRegionDD] = useState(false);
  const [analyticsStateSearch, setAnalyticsStateSearch] = useState('');
  const [analyticsCitySearch, setAnalyticsCitySearch] = useState('');
  const [showCrossTabDietDD, setShowCrossTabDietDD] = useState(false);
  const crossTabDietOptions: { id: 'all' | DietTag; label: string }[] = [
    { id: 'all', label: 'All Diets' },
    ...ADMIN_DIET_FILTERS.filter((d) => d.id !== 'All').map((d) => ({
      id: d.id as DietTag,
      label: d.label,
    })),
  ];

  // City and sub-region options based on selected state
  const availableCities = selectedState ? getCitiesForState(selectedState) : [];
  const availableSubRegions = selectedCity ? getSubRegionsForCity(selectedCity) : [];

  const filteredAnalyticsCities = analyticsCitySearch
    ? availableCities.filter((c: string) => c.toLowerCase().includes(analyticsCitySearch.toLowerCase()))
    : availableCities;

    const stateInputRef = useRef<TextInput>(null);
const cityInputRef = useRef<TextInput>(null);

// Taller, fully tappable field wrapper (the whole box is the touch target)
const analyticsFieldStyle = (open: boolean, disabled = false) => ({
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  borderWidth: 1.5,
  borderColor: open ? colors.primary : colors.borderLight,
  borderRadius: radii.lg,
  backgroundColor: disabled ? colors.bgSubtle : colors.bgSurface,
  paddingHorizontal: 12,
  height: 52,
  opacity: disabled ? 0.6 : 1,
});

const analyticsLabelStyle = {
  fontSize: 11,
  fontWeight: '700' as const,
  color: colors.textMuted,
  marginBottom: 4,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.5,
};

const analyticsMenuStyle = {
  position: 'absolute' as const,
  top: '100%' as const,
  left: 0,
  right: 0,
  marginTop: 2,
  borderWidth: 1,
  borderColor: colors.borderLight,
  borderRadius: radii.lg,
  backgroundColor: colors.bgSurface,
  maxHeight: 200,
  overflow: 'hidden' as const,
  ...shadows.card,
  zIndex: 99999,
  elevation: 99999,
};

  // Inventory & Shelf Life State
  const [outOfStockAlerts, setOutOfStockAlerts] = useState<OutOfStockAlertPayload[]>([]);
  const [inventoryFilter, setInventoryFilter] = useState<'all' | 'low' | 'out' | 'short_shelf'>('all');

  // Coupons State
  const [coupons, setCoupons] = useState<Coupon[]>(getCoupons());
  const [couponModalVisible, setCouponModalVisible] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDiscount, setNewCouponDiscount] = useState('100');
  const [newCouponMinOrder, setNewCouponMinOrder] = useState('499');

  // Users State
  const [users, setUsers] = useState<ManagedUser[]>(getManagedUsers());
  const [copiedCustomerId, setCopiedCustomerId] = useState<string | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Send Credits Modal in Dashboard
  const [sendCreditsModalVisible, setSendCreditsModalVisible] = useState(false);
  const [selectedCreditCustomer, setSelectedCreditCustomer] = useState<ManagedUser | null>(null);
  const [creditSendAmount, setCreditSendAmount] = useState('150');
  const [creditSendSource, setCreditSendSource] = useState<'PROMOTION' | 'ADMIN_ADJUSTMENT' | 'LOYALTY'>('PROMOTION');
  const [creditSendDescription, setCreditSendDescription] = useState('Customer appreciation promotion');
  const [isSubmittingCreditSend, setIsSubmittingCreditSend] = useState(false);

  const reloadLiveUsers = async () => {
    try {
      const live = await fetchLiveManagedUsers();
      setUsers(live);
    } catch (err) {
      console.warn('[AdminDashboard] Error loading live users:', err);
    }
  };

  const handleCopyCustomerId = (id: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(id).catch(() => {});
    }
    setCopiedCustomerId(id);
    setTimeout(() => {
      setCopiedCustomerId(null);
    }, 2000);
  };

  const handleOpenSendCreditsModal = (targetUser: ManagedUser) => {
    setSelectedCreditCustomer(targetUser);
    setCreditSendAmount('150');
    setCreditSendDescription(`Admin credit adjustment for ${targetUser.name}`);
    setSendCreditsModalVisible(true);
  };

  const handleConfirmSendCredits = async () => {
    if (!selectedCreditCustomer) return;
    const amount = parseFloat(creditSendAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid credit amount in ₹.');
      return;
    }

    setIsSubmittingCreditSend(true);
    try {
      const res = await adminIssueCredits({
        targetUserId: selectedCreditCustomer.id,
        amount,
        source: creditSendSource,
        description: creditSendDescription.trim() || 'Admin manual credit issuance',
        adminId: user?.uid || 'super_admin',
        idempotencyKey: `dash_cred_${selectedCreditCustomer.id}_${Date.now()}`,
      });

      if (res.success) {
        const newBalance =
          res.data?.newBalance ?? ((selectedCreditCustomer.walletBalance || 0) + amount);

        // Immediate responsive UI update
        updateUserWalletBalance(selectedCreditCustomer.id, newBalance);
        setUsers((prev) =>
          prev.map((u) =>
            u.id === selectedCreditCustomer.id ? { ...u, walletBalance: newBalance } : u,
          ),
        );

        Alert.alert(
          'Credits Issued!',
          `Successfully credited ₹${amount} to ${selectedCreditCustomer.name}.\nCustomer ID: ${selectedCreditCustomer.id}\nNew Balance: ₹${Math.round(newBalance).toLocaleString('en-IN')}`,
        );
        setSendCreditsModalVisible(false);
        reloadLiveUsers();
      } else {
        Alert.alert('Error', res.error || 'Failed to issue credits.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to issue credits.');
    } finally {
      setIsSubmittingCreditSend(false);
    }
  };

  // Chef Submissions State
  const [chefSubmissions, setChefSubmissions] = useState<ChefSubmissionRecord[]>([]);
  const [chefProfiles, setChefProfiles] = useState<ChefProfile[]>([]);
  const [chefSubmissionFilter, setChefSubmissionFilter] = useState<
    'all' | 'pending_review' | 'published' | 'rejected'
  >('all');
  const [selectedChefSubmission, setSelectedChefSubmission] = useState<ChefSubmissionRecord | null>(
    null,
  );
  const [chefSubmissionModalVisible, setChefSubmissionModalVisible] = useState(false);
  const [chefPublishPrice, setChefPublishPrice] = useState('');
  const [chefPublishStorageCentres, setChefPublishStorageCentres] = useState<string[]>([]);
  const [chefPublishCities, setChefPublishCities] = useState<string[]>([]);
  const [chefRejectNotes, setChefRejectNotes] = useState('');
  const [isProcessingChefSubmission, setIsProcessingChefSubmission] = useState(false);
  const [grantChefModalVisible, setGrantChefModalVisible] = useState(false);
  const [grantChefTargetUser, setGrantChefTargetUser] = useState<ManagedUser | null>(null);

  // Reviews State
  const [moderationReviews, setModerationReviews] = useState<ExtendedReview[]>(
    getAllReviewsForModeration(),
  );

  // Strict domain check check
  const isMulyamAdmin =
    user && user.role === 'admin' && user.email && validateAdminEmail(user.email);

  const [pendingApprovalCount, setPendingApprovalCount] = useState<number>(0);

  const reloadAdminProfiles = async () => {
    try {
      const list = await fetchAllAdminProfiles();
      const filtered = list.filter(
        (a) =>
          a.email &&
          a.email.toLowerCase().endsWith('@mulyam.in') &&
          a.email.toLowerCase() !== 'raphdesantos@gmail.com',
      );
      setAdminProfiles(filtered);
    } catch (err) {
      console.warn('[AdminDashboard] Error loading admin profiles:', err);
    }
  };

  const reloadChefData = async () => {
    try {
      const [submissions, profiles] = await Promise.all([
        fetchAllChefSubmissions(),
        fetchAllChefProfiles(),
      ]);
      setChefSubmissions(submissions);
      setChefProfiles(profiles);
    } catch (err) {
      console.warn('[AdminDashboard] Error loading chef data:', err);
    }
  };

  const reloadSupabaseOrders = async () => {
    try {
      const sbOrders = await fetchAllOrdersFromSupabase();
      if (sbOrders) {
        setOrders(sbOrders.filter((o) => !MOCK_ORDER_IDS.has(o.id)));
      }
    } catch (err) {
      console.warn('[AdminDashboard] Error loading Supabase orders:', err);
    }
  };

  useEffect(() => {
    if (!isMulyamAdmin) return;

    reloadSupabaseOrders();
    refreshPendingApprovalCount();
    syncMealKitsWithSupabase();
    reloadAdminProfiles();
    reloadChefData();

    reloadLiveUsers();

    const unsubscribeUsers = subscribeToManagedUsers(() => {
      reloadLiveUsers();
    });

    const unsubscribeRealtime = subscribeToOrdersRealtime(() => {
      reloadSupabaseOrders();
      refreshPendingApprovalCount();
    });

    const unsubscribeCount = subscribeToPendingApprovalCount((cnt) => {
      setPendingApprovalCount(cnt);
    });

    const unsubscribeFb = subscribeToOrders((updatedOrders) => {
      setOrders(updatedOrders.filter((o) => !MOCK_ORDER_IDS.has(o.id)));
    });

    const unsubscribeKits = subscribeToMealKits((updatedKits) => {
      setKits(updatedKits);
    });

    const unsubscribeOos = subscribeToOutOfStockAlerts((alerts) => {
      setOutOfStockAlerts(alerts);
    });

    const handleStorageChange = () => {
      reloadSupabaseOrders();
      refreshPendingApprovalCount();
      reloadLiveUsers();
    };

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('storage', handleStorageChange);
    }

    // Poll users + orders every 10s to catch new sign-ups discovered via
    // Firestore/orders that don't trigger the Supabase user_profiles channel.
    const usersInterval = setInterval(() => {
      reloadLiveUsers();
    }, 10000);

    const ordersInterval = setInterval(() => {
      reloadSupabaseOrders();
      refreshPendingApprovalCount();
    }, 15000);

    return () => {
      unsubscribeRealtime();
      unsubscribeCount();
      unsubscribeFb();
      unsubscribeKits();
      unsubscribeOos();
      unsubscribeUsers();
      clearInterval(usersInterval);
      clearInterval(ordersInterval);
      if (typeof window !== 'undefined' && window.removeEventListener) {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [isMulyamAdmin]);

  const handleApproveOrder = async (orderId: string) => {
    setUpdatingOrderId(orderId);
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === orderId ? { ...o, status: 'Confirmed', isApproved: true } : o,
      ),
    );
    try {
      await approveOrderInSupabase(orderId, user?.displayName || user?.email || 'Admin');
      await updateOrderStatus(orderId, 'Confirmed');
      await reloadSupabaseOrders();
      await refreshPendingApprovalCount();
      Alert.alert(
        'Order Approved',
        `Order ${orderId} has been confirmed. Chef packing team has been notified.`,
      );
    } catch (err: any) {
      Alert.alert('Approval Error', err?.message || 'Could not approve order.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCancelOrder = (orderId: string) => {
    setOrderToCancel(orderId);
    setCancelReason('Cancelled by Admin');
    setCancelOrderModalVisible(true);
  };

  const handleConfirmCancelOrder = async () => {
    if (!orderToCancel) return;
    const targetId = orderToCancel;
    setUpdatingOrderId(targetId);
    setOrders((prevOrders) =>
      prevOrders.map((o) =>
        o.id === targetId
          ? {
              ...o,
              status: 'Cancelled',
              isApproved: false,
              cancellationReason: cancelReason,
              adminNotes: cancelReason,
            }
          : o,
      ),
    );
    try {
      await updateOrderStatusInSupabase(targetId, 'Cancelled', cancelReason);
      await updateOrderStatus(targetId, 'Cancelled', cancelReason);
      await reloadSupabaseOrders();
      await refreshPendingApprovalCount();
      setCancelOrderModalVisible(false);
      setOrderToCancel(null);
      showInAppAlert(
        'Order Cancelled',
        `Order ${targetId} cancelled. Inventory stock has been automatically reverted to pre-order levels.`,
      );
    } catch (err: any) {
      showInAppAlert('Error', err?.message || 'Could not cancel order.');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const [isClearingOrders, setIsClearingOrders] = useState(false);

  const handleClearAllOrders = () => {
    showInAppConfirm({
      title: 'Delete All Orders?',
      message:
        'Are you sure you want to delete ALL customer orders? This will permanently wipe orders from the system, admin dashboard, and user accounts.',
      confirmText: 'Delete All',
      cancelText: 'Cancel',
      isDestructive: true,
      onConfirm: async () => {
        setIsClearingOrders(true);
        try {
          await clearAllOrdersFromSupabase();
          setOrders([]);
          setPendingApprovalCount(0);
          showInAppAlert('Orders Deleted', 'All customer orders have been deleted.');
        } catch (err: any) {
          showInAppAlert('Error', err?.message || 'Could not delete orders.');
        } finally {
          setIsClearingOrders(false);
        }
      },
    });
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    if (newStatus === 'Cancelled') {
      handleCancelOrder(orderId);
      return;
    }
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatusInSupabase(orderId, newStatus);
      await updateOrderStatus(orderId, newStatus);
      await reloadSupabaseOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleOpenRefund = (order: Order) => {
    setRefundOrder(order);
    setRefundAmount(order.totalAmount.toString());
    setRefundMethod('WALLET');
    setRefundModalVisible(true);
  };

  const handleExecuteRefund = async () => {
    if (!refundOrder) return;
    const amt = parseFloat(refundAmount) || refundOrder.totalAmount;
    setIsProcessingRefund(true);
    try {
      const adminId = user?.uid || 'super_admin';
      await processOrderRefund({
        orderId: refundOrder.id,
        refundAmount: amt,
        refundMethod,
        reason: refundReason,
        adminId,
      });
      await issueRefund(refundOrder.id, amt, refundReason);
      await reloadSupabaseOrders();
      setRefundModalVisible(false);
      Alert.alert(
        'Refund Issued Successfully',
        refundMethod === 'WALLET'
          ? `₹${amt} credited directly to customer's Rasoi Credits Wallet (no expiry).`
          : `₹${amt} marked for refund to original payment source.`,
      );
    } catch (err: any) {
      Alert.alert('Refund Error', err?.message || 'Could not process refund');
    } finally {
      setIsProcessingRefund(false);
    }
  };

  const handleStockAdjust = (kitId: string, region: RegionHub, delta: number) => {
    const kit = kits.find((k) => k.id === kitId);
    if (!kit) return;
    const current = kit.stockByRegion[region] || 0;
    const next = Math.max(0, current + delta);
    updateMealKitStock(kitId, region, next);

    if (next === 0) {
      // Automatically set item to out of stock and inform all regional admins
      updateMealKit(kitId, { isOutOfStock: true });
      toggleMealKitOutOfStockStatus(kitId, true).catch(() => {});
      notifyRegionalAdminsOutOfStock({
        kitId,
        kitName: kit.name,
        region,
        remainingStock: 0,
      });
    } else if (kit.isOutOfStock && next > 0) {
      updateMealKit(kitId, { isOutOfStock: false });
      toggleMealKitOutOfStockStatus(kitId, false).catch(() => {});
      dismissOutOfStockAlert(kitId, region);
    }
    setKits(getMealKits());
  };

  const handleAdjustShelfLife = (kitId: string, deltaDays: number) => {
    const kit = kits.find((k) => k.id === kitId);
    if (!kit) return;
    const currentDays = kit.shelfLifeDays || 4;
    const nextDays = Math.max(1, currentDays + deltaDays);
    updateMealKitShelfLife(kitId, nextDays, kit.storageCondition);
    updateMealKitShelfLifeInSupabase(kitId, nextDays, kit.storageCondition).catch(() => {});
    setKits(getMealKits());
  };

  const outOfStockCount = useMemo(() => {
    return kits.filter((k) => {
      const total = Object.values(k.stockByRegion || {}).reduce((a, b) => a + (Number(b) || 0), 0);
      return k.isOutOfStock || total === 0;
    }).length;
  }, [kits]);

  const displayedInventoryKits = useMemo(() => {
    return kits.filter((kit) => {
      const totalStock = Object.values(kit.stockByRegion || {}).reduce(
        (a, b) => a + (Number(b) || 0),
        0,
      );
      const isOut = kit.isOutOfStock || totalStock === 0;
      const isLow = Object.values(kit.stockByRegion || {}).some((s) => s > 0 && s < 20);
      const isShortShelf = (kit.shelfLifeDays || 4) <= 3;

      if (inventoryFilter === 'low') return isLow;
      if (inventoryFilter === 'out') return isOut;
      if (inventoryFilter === 'short_shelf') return isShortShelf;
      return true;
    });
  }, [kits, inventoryFilter]);

  const handleToggleOutOfStock = async (kit: MealKit) => {
    const nextStatus = !kit.isOutOfStock;
    updateMealKit(kit.id, { isOutOfStock: nextStatus });
    setKits(getMealKits());
    try {
      await toggleMealKitOutOfStockStatus(kit.id, nextStatus);
    } catch (e) {
      console.warn('[Admin] Failed to update stock status in Supabase:', e);
    }
    Alert.alert(
      nextStatus ? 'Marked Out of Stock' : 'Marked In Stock',
      `${kit.name} has been marked as ${nextStatus ? 'out of stock' : 'in stock'}.`,
    );
  };

  const handleRequestDeleteKit = (kit: MealKit) => {
    setKitToDelete(kit);
    setDeleteModalVisible(true);
  };

  const handleConfirmDeleteKit = async () => {
    if (!kitToDelete) return;
    const targetKit = kitToDelete;
    setIsDeletingKit(true);
    try {
      deleteMealKit(targetKit.id);
      await deleteMealKitFromSupabase(targetKit.id);
      await toggleMealKitPublishStatus(targetKit.id, false);
      setKits(getMealKits());
      setDeleteModalVisible(false);
      setKitToDelete(null);
      Alert.alert('Kit Deleted', `${targetKit.name} was successfully deleted.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Could not delete meal kit.');
    } finally {
      setIsDeletingKit(false);
    }
  };

  const handleExportCSV = () => {
    const csv = generateRegionalCSV(selectedState);
    Alert.alert(
      'Regional Analytics Exported',
      `CSV Report Generated:\n\n${csv.substring(0, 300)}...`,
    );
  };

  const handleToggleTrending = async (kit: MealKit) => {
    const nextVal = !kit.isTrending;
    setKits((prev) => prev.map((k) => (k.id === kit.id ? { ...k, isTrending: nextVal } : k)));
    toggleMealKitTrending(kit.id, nextVal);
    await toggleMealKitTrendingStatus(kit.id, nextVal);
    showInAppAlert(
      nextVal ? 'Dish Marked as Trending' : 'Trending Status Removed',
      `"${kit.name}" has been ${nextVal ? 'set as Trending' : 'removed from Trending'}.`,
    );
  };

  // Scoped meal kits: Regional admins ONLY see dishes in their assigned regions. Super admin sees all.
  const scopedKits = useMemo(() => {
    return filterMealKitsByAdminRegions(kits, assignedRegions, isSuperAdmin);
  }, [kits, assignedRegions, isSuperAdmin]);

  const filteredKits = useMemo(() => {
    return scopedKits.filter((kit) => {
      // 0. Super Admin Region Hub view filter
      if (isSuperAdmin && superAdminRegionFilter !== 'All') {
        const matchesHub =
          (kit.availableRegions && kit.availableRegions.includes(superAdminRegionFilter as any)) ||
          (kit.availableStorageCentres &&
            kit.availableStorageCentres.includes(superAdminRegionFilter)) ||
          (kit.originCity &&
            superAdminRegionFilter.toLowerCase().includes(kit.originCity.toLowerCase())) ||
          (kit.cities &&
            kit.cities.some((c: string) =>
              superAdminRegionFilter.toLowerCase().includes(c.toLowerCase()),
            ));
        if (!matchesHub) return false;
      }

      // 1. Text search query
      if (kitSearchQuery.trim()) {
        const q = kitSearchQuery.trim().toLowerCase();
        const matchesName = kit.name?.toLowerCase().includes(q);
        const matchesHindi = kit.hindiName ? kit.hindiName.toLowerCase().includes(q) : false;
        const matchesTagline = kit.tagline ? kit.tagline.toLowerCase().includes(q) : false;
        const matchesDesc = kit.description ? kit.description.toLowerCase().includes(q) : false;
        const matchesCuisine = kit.cuisine ? kit.cuisine.toLowerCase().includes(q) : false;
        const matchesDishCategory = kit.dishCategory
          ? kit.dishCategory.toLowerCase().includes(q)
          : false;
        const matchesIngredient = kit.ingredients?.some((ing) =>
          ing.name?.toLowerCase().includes(q),
        );
        const matchesSachet = kit.masalaSachets?.some((s) => s.toLowerCase().includes(q));
        const matchesTag = kit.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesAllergen = kit.allergens?.some((a) => a.toLowerCase().includes(q));
        const matchesRegion =
          kit.availableRegions?.some((r) => r.toLowerCase().includes(q)) ||
          kit.availableStorageCentres?.some((sc) => sc.toLowerCase().includes(q));

        if (
          !matchesName &&
          !matchesHindi &&
          !matchesTagline &&
          !matchesDesc &&
          !matchesCuisine &&
          !matchesDishCategory &&
          !matchesIngredient &&
          !matchesSachet &&
          !matchesTag &&
          !matchesAllergen &&
          !matchesRegion
        ) {
          return false;
        }
      }

      // 2. Diet Filter
      if (selectedKitDietFilter !== 'All') {
        const matchesDiet =
          kit.diet === selectedKitDietFilter ||
          (Array.isArray(kit.dietaryTags) && kit.dietaryTags.includes(selectedKitDietFilter));
        if (!matchesDiet) return false;
      }

      // 3. Cuisine Type Filter
      if (selectedKitCuisineFilter !== 'All') {
        if (kit.cuisine !== selectedKitCuisineFilter) return false;
      }

      // 4. Dish Type (Category) Filter
      if (selectedKitDishFilter !== 'All') {
        if (kit.dishCategory !== selectedKitDishFilter) return false;
      }

      return true;
    });
  }, [
    scopedKits,
    isSuperAdmin,
    superAdminRegionFilter,
    kitSearchQuery,
    selectedKitDietFilter,
    selectedKitCuisineFilter,
    selectedKitDishFilter,
  ]);

  // Regional Analytics Scope: Regional admins ONLY see statistics for their assigned regions. Super admin sees all.
  const accessibleStates = useMemo(() => {
    return getFilteredStateAnalytics(assignedRegions, isSuperAdmin);
  }, [assignedRegions, isSuperAdmin]);

  useEffect(() => {
    if (
      accessibleStates.length > 0 &&
      !accessibleStates.some((s) => s.stateName === selectedState)
    ) {
      setSelectedState(accessibleStates[0]!.stateName);
    }
  }, [accessibleStates, selectedState]);

  // Admin Management Handlers (Super Admin Only)
  const handleOpenAddAdminModal = () => {
    setAdminFormEmail('');
    setAdminFormName('');
    setAdminFormRole('regional_admin');
    setAdminFormRegions(['pune-city', 'pune-pcmc']);
    setAdminModalVisible(true);
  };

  const handleOpenEditAdminModal = (profile: AdminProfile) => {
    setAdminFormEmail(profile.email);
    setAdminFormName(profile.name);
    setAdminFormRole(profile.role);
    setAdminFormRegions(
      profile.regions && profile.regions.length > 0
        ? (profile.regions as (RegionHub | string)[])
        : ['pune-city'],
    );
    setAdminModalVisible(true);
  };

  const handleSaveAdmin = async () => {
    const emailLower = adminFormEmail.trim().toLowerCase();
    if (!emailLower || !emailLower.endsWith('@mulyam.in') || emailLower === 'raphdesantos@gmail.com') {
      showInAppAlert(
        'Invalid Domain',
        'Staff Admin privileges can strictly only be granted to email addresses ending with @mulyam.in.',
      );
      return;
    }
    if (adminFormRole !== 'super_admin' && adminFormRegions.length === 0) {
      showInAppAlert(
        'Region Required',
        'Please assign at least one operating region to this admin.',
      );
      return;
    }

    setIsSavingAdmin(true);
    try {
      const res = await assignAdminRegions(
        adminFormEmail.trim(),
        adminFormRole === 'super_admin' ? ALL_REGIONS : adminFormRegions,
        adminFormName.trim() || undefined,
        adminFormRole,
      );

      if (res.success) {
        showInAppAlert(
          'Admin Assigned',
          `Region access permissions saved for ${adminFormEmail.trim()}.`,
        );
        await reloadAdminProfiles();
        setAdminModalVisible(false);
      } else {
        showInAppAlert('Save Failed', res.error || 'Could not save admin permissions.');
      }
    } finally {
      setIsSavingAdmin(false);
    }
  };

  const handleDeleteAdmin = (email: string) => {
    showInAppConfirm({
      title: 'Revoke Admin Access',
      message: `Are you sure you want to remove admin permissions for ${email}?`,
      confirmText: 'Revoke',
      isDestructive: true,
      onConfirm: async () => {
        const res = await deleteAdminProfile(email);
        if (res.success) {
          await reloadAdminProfiles();
          showInAppAlert('Admin Revoked', `${email} has been removed from regional staff.`);
        } else {
          showInAppAlert('Revoke Failed', res.error || 'Could not revoke admin.');
        }
      },
    });
  };

  const activeKitFilterCount = useMemo(() => {
    let count = 0;
    if (kitSearchQuery.trim()) count++;
    if (selectedKitDietFilter !== 'All') count++;
    if (selectedKitCuisineFilter !== 'All') count++;
    if (selectedKitDishFilter !== 'All') count++;
    return count;
  }, [kitSearchQuery, selectedKitDietFilter, selectedKitCuisineFilter, selectedKitDishFilter]);

  const handleClearKitFilters = () => {
    setKitSearchQuery('');
    setSelectedKitDietFilter('All');
    setSelectedKitCuisineFilter('All');
    setSelectedKitDishFilter('All');
    setOpenDropdown(null);
  };

  const getBadgeVariant = (status: OrderStatus): BadgeVariant => {
    switch (status) {
      case 'Pending':
      case 'Placed':
        return 'warning';
      case 'Preparing':
      case 'Confirmed':
      case 'Out for Delivery':
        return 'info';
      case 'Delivered':
        return 'success';
      case 'Cancelled':
      case 'Refunded':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const filteredOrders = useMemo(() => {
    const cleanOrders = orders
      .filter((o) => !MOCK_ORDER_IDS.has(o.id) && o.id.startsWith('ORD-'))
      .map((o) => {
        if ((isOrderApproved(o.id) || o.isApproved) && o.status === 'Placed') {
          return { ...o, isApproved: true, status: 'Confirmed' as OrderStatus };
        }
        return o;
      });

    // Deduplicate by ID and transactionId
    const seenIds = new Set<string>();
    const seenTxns = new Set<string>();
    const deduped: Order[] = [];
    for (const ord of cleanOrders) {
      if (seenIds.has(ord.id)) continue;
      if (ord.transactionId && seenTxns.has(ord.transactionId)) continue;
      seenIds.add(ord.id);
      if (ord.transactionId) seenTxns.add(ord.transactionId);
      deduped.push(ord);
    }

    if (selectedStatusFilter === 'All') return deduped;
    return deduped.filter((o) => o.status === selectedStatusFilter);
  }, [orders, selectedStatusFilter]);

  const crossTabResult = useMemo(() => {
    return getCrossTabAnalytics({
      stateName: selectedState,
      dietType: crossTabDiet,
      cuisine: 'all',
    });
  }, [selectedState, crossTabDiet]);

  // If user is not logged in as @mulyam.in admin
  if (!isMulyamAdmin) {
    return (
      <View style={[styles.accessDeniedContainer, { backgroundColor: colors.bgPrimary }]}>
        <Card style={styles.accessDeniedCard}>
          <View style={{ marginBottom: 12, alignItems: 'center' }}>
            <Icon name="lock" size={44} color={colors.primary} />
          </View>
          <Text style={[styles.accessDeniedTitle, { color: colors.textPrimary }]}>
            Admin Access Restricted
          </Text>
          <Text style={[styles.accessDeniedText, { color: colors.textSecondary }]}>
            This control center is strictly reserved for authorized company personnel with a valid{' '}
            <Text style={{ fontWeight: '800', color: colors.primary }}>@mulyam.in</Text> email
            address.
          </Text>
          <Button
            title="Log In with Admin Account"
            variant="primary"
            size="md"
            onPress={onNavigateToLogin || logout}
            style={{ marginTop: 20 }}
          />
        </Card>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      {/* Top Header Bar */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        <View style={styles.headerTitleCol}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            RasoiGenie Admin Control
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Master operations, catalog, kitchen orders & regional logistics
          </Text>
        </View>

        <View style={styles.headerRightActions}>
          <View
            style={[
              styles.adminPill,
              {
                backgroundColor: isSuperAdmin ? '#FEF3C7' : colors.primaryLight,
                borderColor: isSuperAdmin ? '#F59E0B' : colors.primary + '40',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 5,
              },
            ]}
          >
            <View
              style={{
                width: 7,
                height: 7,
                borderRadius: 4,
                backgroundColor: isSuperAdmin ? '#D97706' : colors.primary,
              }}
            />
            <Text
              style={[
                styles.adminPillText,
                {
                  color: isSuperAdmin ? '#B45309' : colors.primary,
                  fontWeight: '700',
                  fontSize: 12,
                },
              ]}
            >
              {isSuperAdmin
                ? 'Super Admin (All Regions)'
                : `Regional Admin (${assignedRegions && assignedRegions.length > 0 ? assignedRegions.map(formatRegionName).join(', ') : 'Pune City (Pune)'})`}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: colors.borderLight }]}
            onPress={logout}
          >
            <Text style={[styles.logoutText, { color: colors.danger }]}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Unified Navigation Menu Bar */}
      <AdminNavigationMenu
        activeTab={activeTab}
        onTabChange={setActiveTab}
        ordersCount={orders.length}
        pendingApprovalCount={pendingApprovalCount}
        kitsCount={scopedKits.length}
        usersCount={users.length}
        customersCount={users.filter((u) => u.role !== 'admin').length}
        adminsCount={adminProfiles.length}
        chefsCount={chefSubmissions.length}
        pendingChefSubmissions={
          chefSubmissions.filter((s) => s.submissionStatus === 'pending_review').length
        }
        couponsCount={coupons.length}
        reviewsCount={moderationReviews.length}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* MODULE 0: OVERVIEW HOME */}
        {activeTab === 'overview' && (
          <View>
            {/* Small subtle status indicator replacing the large card */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: isSuperAdmin ? '#FEF3C7' : colors.bgSubtle,
                  borderColor: isSuperAdmin ? '#F59E0B60' : colors.borderLight,
                  borderWidth: 1,
                  borderRadius: radii.pill,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: isSuperAdmin ? '#D97706' : colors.primary,
                  }}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: isSuperAdmin ? '#92400E' : colors.textSecondary,
                  }}
                >
                  {isSuperAdmin
                    ? 'Super Admin Mode • Pan-India Region Access'
                    : `Regional Admin Scope: ${assignedRegions && assignedRegions.length > 0 ? assignedRegions.map(formatRegionName).join(', ') : 'Pune City (Pune)'}`}
                </Text>
              </View>
            </View>

            {/* Realtime Pending Approval Alert Banner */}
            {pendingApprovalCount > 0 && (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  borderColor: '#F87171',
                  borderWidth: 1.5,
                  borderRadius: radii.lg,
                  padding: 16,
                  marginBottom: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  ...shadows.card,
                }}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}
                  >
                    <Icon name="alert" size={18} color="#DC2626" />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '800',
                        color: '#991B1B',
                      }}
                    >
                      {pendingApprovalCount} New Order(s) Awaiting Approval!
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#B91C1C' }}>
                    Customer orders are currently in 'Placed' status. Click to approve and confirm.
                  </Text>
                </View>
                <Button
                  title="Review Orders"
                  size="sm"
                  onPress={() => setActiveTab('orders')}
                  style={{ backgroundColor: '#DC2626' }}
                />
              </View>
            )}

            {/* Quick Metrics KPI Cards */}
            <View style={styles.metricsGrid}>
              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
                onPress={() => setActiveTab('orders')}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.metricVal,
                    { color: pendingApprovalCount > 0 ? '#DC2626' : colors.primary },
                  ]}
                >
                  {orders.length}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  {pendingApprovalCount > 0
                    ? `${pendingApprovalCount} Awaiting Approval`
                    : 'Customer Orders'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
                onPress={() => setActiveTab('kits')}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricVal, { color: colors.primary }]}>{kits.length}</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Active Meal Kits
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
                onPress={() => setActiveTab('inventory')}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricVal, { color: colors.primary }]}>4</Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Operating Regions
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
                ]}
                onPress={() => setActiveTab('analytics')}
                activeOpacity={0.8}
              >
                <Text style={[styles.metricVal, { color: colors.primary }]}>
                  ₹{(orders.reduce((acc, o) => acc + o.totalAmount, 0) / 1000).toFixed(1)}k
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
                  Gross Revenue
                </Text>
              </TouchableOpacity>
            </View>

            {/* Quick-Access Operational Modules Grid */}
            <Text
              style={[
                styles.sectionHeading,
                { color: colors.textPrimary, marginTop: 14, marginBottom: 12 },
              ]}
            >
              Control Center Modules
            </Text>

            <View style={styles.modulesGrid}>
              {[
                {
                  id: 'orders' as AdminTab,
                  title: 'Orders & Live Approvals',
                  desc: 'Real-time order feed, approval workflow, status changes & customer refunds',
                  icon: 'cube' as AppIconName,
                  badge:
                    pendingApprovalCount > 0
                      ? `${pendingApprovalCount} Awaiting Approval`
                      : `${orders.length} Orders`,
                  badgeVariant:
                    pendingApprovalCount > 0
                      ? ('danger' as BadgeVariant)
                      : ('primary' as BadgeVariant),
                },
                {
                  id: 'kits' as AdminTab,
                  title: 'Meal Kits & Recipes',
                  desc: 'Publish chef-crafted recipes, modify spice levels, servings, ingredients & prices',
                  icon: 'restaurant' as AppIconName,
                  badge: `${kits.length} Kits Active`,
                  badgeVariant: 'success' as BadgeVariant,
                },
                {
                  id: 'inventory' as AdminTab,
                  title: 'Regional Inventory',
                  desc: 'Monitor cold-chain safety buffer stocks across South, West, North & East Regions',
                  icon: 'business' as AppIconName,
                  badge: '4 Regions',
                  badgeVariant: 'neutral' as BadgeVariant,
                },
                {
                  id: 'analytics' as AdminTab,
                  title: 'Regional Analytics',
                  desc: 'State-by-state consumption trends, dietary split, and downloadable CSV exports',
                  icon: 'bar-chart' as AppIconName,
                  badge: 'India Live',
                  badgeVariant: 'accent' as BadgeVariant,
                },
                {
                  id: 'customers' as AdminTab,
                  title: 'Customer Accounts',
                  desc: 'Real registered customers, live wallet credits, Customer IDs & quick credit issuance',
                  icon: 'people' as AppIconName,
                  badge: `${users.filter((u) => u.role !== 'admin').length} Customers`,
                  badgeVariant: 'info' as BadgeVariant,
                },
                {
                  id: 'admins' as AdminTab,
                  title: 'Staff Admins & RBAC',
                  desc: 'Manage staff admin accounts, multi-region jurisdictions & RBAC permissions',
                  icon: 'lock' as AppIconName,
                  badge: `${adminProfiles.length} Staff Admins`,
                  badgeVariant: 'warning' as BadgeVariant,
                },
                {
                  id: 'coupons' as AdminTab,
                  title: 'Promotions & Coupons',
                  desc: 'Create discount codes, flat reductions, and minimum cart value requirements',
                  icon: 'tag' as AppIconName,
                  badge: `${coupons.length} Coupons`,
                  badgeVariant: 'warning' as BadgeVariant,
                },
                {
                  id: 'revenue' as AdminTab,
                  title: 'Revenue & Financials',
                  desc: 'Monthly sales metrics, Average Order Value (AOV), and customer repeat rates',
                  icon: 'trending-up' as AppIconName,
                  badge: 'Financials',
                  badgeVariant: 'success' as BadgeVariant,
                },
                {
                  id: 'reviews' as AdminTab,
                  title: 'Review Moderation',
                  desc: 'Inspect customer meal kit reviews, verify feedback, and moderate flagged entries',
                  icon: 'star' as AppIconName,
                  badge: `${moderationReviews.length} Reviews`,
                  badgeVariant: 'neutral' as BadgeVariant,
                },
                {
                  id: 'wallets' as AdminTab,
                  title: 'Customer Credits Wallets',
                  desc: 'Inspect customer balances, active credit lots, transaction ledger, and issue promotional adjustments',
                  icon: 'wallet' as AppIconName,
                  badge: 'Credits Hub',
                  badgeVariant: 'warning' as BadgeVariant,
                },
                {
                  id: 'referrals' as AdminTab,
                  title: 'Referral & Rewards Engine',
                  desc: 'Configure reward amounts, qualification rules, credit expiration dates, and monitor referrals',
                  icon: 'gift' as AppIconName,
                  badge: 'Growth Engine',
                  badgeVariant: 'success' as BadgeVariant,
                },
              ].map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  style={[
                    styles.moduleCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderLight,
                      borderRadius: radii.xl,
                      ...shadows.card,
                    },
                  ]}
                  onPress={() => setActiveTab(mod.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.moduleCardTop}>
                    <View style={{ marginRight: 12 }}>
                      <Icon name={mod.icon} size={26} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.moduleCardTitle, { color: colors.textPrimary }]}>
                        {mod.title}
                      </Text>
                      <Text
                        style={[styles.moduleCardDesc, { color: colors.textSecondary }]}
                        numberOfLines={2}
                      >
                        {mod.desc}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.moduleCardBottom}>
                    <Badge label={mod.badge} variant={mod.badgeVariant} size="sm" />
                    <Text style={[styles.moduleCardArrow, { color: colors.primary }]}>
                      Open Module
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* MODULE 1: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <View>
            {/* Orders Header Row with Clear All Orders Button */}
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Customer Orders ({orders.length})
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Live kitchen order flow & fulfillment
                </Text>
              </View>
              {orders.length > 0 && (
                <Button
                  title={isClearingOrders ? 'Clearing...' : 'Clear All Orders'}
                  variant="outline"
                  size="sm"
                  loading={isClearingOrders}
                  style={{ borderColor: '#DC2626' }}
                  textStyle={{ color: '#DC2626', fontSize: 11 }}
                  onPress={handleClearAllOrders}
                />
              )}
            </View>

            {/* Realtime Pending Approval Alert Banner */}
            {pendingApprovalCount > 0 && (
              <View
                style={{
                  backgroundColor: '#FEF2F2',
                  borderColor: '#F87171',
                  borderWidth: 1.5,
                  borderRadius: radii.lg,
                  padding: 12,
                  marginBottom: 14,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}
                  >
                    <Icon name="alert" size={16} color="#DC2626" />
                    <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 13 }}>
                      {pendingApprovalCount} New Order(s) Awaiting Approval!
                    </Text>
                  </View>
                  <Text style={{ color: '#B91C1C', fontSize: 11, marginTop: 2 }}>
                    Review customer recipe orders and approve them to start kitchen prep.
                  </Text>
                </View>
                <TouchableOpacity
                  style={{
                    backgroundColor: '#DC2626',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: radii.sm,
                  }}
                  onPress={() => setSelectedStatusFilter('Placed')}
                >
                  <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                    View Placed
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Filter pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.statusFilterRow}
            >
              {STATUS_FILTERS.map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.statusFilterChip,
                    {
                      backgroundColor:
                        selectedStatusFilter === s ? colors.primary : colors.bgSurface,
                      borderColor: selectedStatusFilter === s ? colors.primary : colors.borderLight,
                      borderRadius: radii.pill,
                    },
                  ]}
                  onPress={() => setSelectedStatusFilter(s)}
                >
                  <Text
                    style={{
                      color: selectedStatusFilter === s ? '#FFFFFF' : colors.textPrimary,
                      fontSize: 12,
                      fontWeight: '700',
                    }}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredOrders.length === 0 ? (
              <View
                style={[
                  styles.adminKitCard,
                  {
                    backgroundColor: colors.bgSurface,
                    padding: 32,
                    alignItems: 'center',
                    borderRadius: radii.xl,
                  },
                ]}
              >
                <View style={{ marginBottom: 12 }}>
                  <Icon name="cube" size={38} color={colors.textMuted} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary }}>
                  No Orders Found
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    marginTop: 4,
                    textAlign: 'center',
                  }}
                >
                  There are currently no orders under "{selectedStatusFilter}".
                </Text>
              </View>
            ) : (
              filteredOrders.map((order) => (
                <View
                  key={order.id}
                  style={[
                    styles.adminOrderCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: colors.borderLight,
                      ...shadows.card,
                    },
                  ]}
                >
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setInspectOrder(order);
                      setInspectModalVisible(true);
                    }}
                    style={{ marginBottom: 4 }}
                  >
                    <View style={styles.orderTopRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={[styles.adminOrderId, { color: colors.textPrimary }]}>
                            {order.id}
                          </Text>
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                            View Details
                          </Text>
                        </View>
                        <Text style={[styles.adminOrderCustomer, { color: colors.textSecondary }]}>
                          {order.customerName} ({order.customerPhone})
                        </Text>
                      </View>
                      <View testID={`admin-order-status-${order.id}`}>
                        <Badge label={order.status} variant={getBadgeVariant(order.status)} />
                      </View>
                    </View>

                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        marginVertical: 2,
                      }}
                    >
                      <Icon name="location" size={13} color={colors.textSecondary} />
                      <Text
                        style={[
                          styles.adminOrderAddress,
                          { color: colors.textSecondary, marginBottom: 0 },
                        ]}
                      >
                        {order.deliveryAddress}
                      </Text>
                    </View>
                    {(() => {
                      const sc = resolveStorageCentre(order.deliveryAddress);
                      return (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            marginTop: 4,
                            marginBottom: 4,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            backgroundColor: colors.bgSubtle,
                            borderRadius: radii.sm,
                            borderLeftWidth: 2,
                            borderLeftColor: colors.primary,
                            alignSelf: 'flex-start',
                          }}
                        >
                          <Icon name="cube" size={11} color={colors.primary} />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                            Fulfillment: {sc.storageCentreName} ({sc.name})
                          </Text>
                        </View>
                      );
                    })()}
                    <Text style={[styles.adminOrderSlot, { color: colors.textMuted }]}>
                      Slot: {order.deliverySlot} • Paid: ₹{order.totalAmount} via{' '}
                      {order.paymentMethod}
                    </Text>

                    {/* Summary Preview of Ordered Dishes & Customizations */}
                    {order.items && order.items.length > 0 && (
                      <View
                        style={{
                          backgroundColor: colors.bgSubtle,
                          borderRadius: radii.md,
                          padding: 10,
                          marginTop: 8,
                          borderWidth: 1,
                          borderColor: colors.borderLight,
                        }}
                      >
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 4,
                          }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Icon name="restaurant" size={14} color={colors.textPrimary} />
                            <Text
                              style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}
                            >
                              Ordered Dishes ({order.items.length}):
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}>
                            Inspect Details
                          </Text>
                        </View>
                        {order.items.map((it, idx) => (
                          <View
                            key={idx}
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginTop: 4,
                            }}
                          >
                            <Text
                              style={{ fontSize: 12, color: colors.textSecondary, flex: 1 }}
                              numberOfLines={1}
                            >
                              • {it.quantity}x {it.name}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                {it.servings || 2}p
                              </Text>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                <Icon
                                  name="flame"
                                  size={11}
                                  color={
                                    (it.spiceLevel || '').toLowerCase().includes('spicy')
                                      ? '#DC2626'
                                      : colors.primary
                                  }
                                />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '700',
                                    color: (it.spiceLevel || '').toLowerCase().includes('spicy')
                                      ? '#DC2626'
                                      : colors.primary,
                                  }}
                                >
                                  {it.spiceLevel || 'Medium'}
                                </Text>
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Cancelled Order Notice */}
                  {order.status === 'Cancelled' && (
                    <View
                      style={{
                        marginVertical: 10,
                        padding: 12,
                        backgroundColor: '#FEF2F2',
                        borderRadius: radii.md,
                        borderWidth: 1.5,
                        borderColor: '#F87171',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ marginRight: 8 }}>
                          <Icon name="close" size={16} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>
                            Order Cancelled
                          </Text>
                          <Text style={{ color: '#B91C1C', fontSize: 11 }}>
                            Reason:{' '}
                            {order.cancellationReason ||
                              order.adminNotes ||
                              'Cancelled by Kitchen Management.'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Direct Action Required Approval Section */}
                  {order.status === 'Placed' && !order.isApproved && !isOrderApproved(order.id) && (
                    <View
                      style={{
                        marginVertical: 10,
                        padding: 12,
                        backgroundColor: '#FEF2F2',
                        borderRadius: radii.md,
                        borderWidth: 1.5,
                        borderColor: '#F87171',
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ marginRight: 6 }}>
                          <Icon name="time" size={16} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#991B1B', fontWeight: '800', fontSize: 12 }}>
                            Awaiting Admin Approval
                          </Text>
                          <Text style={{ color: '#B91C1C', fontSize: 11 }}>
                            Customer placed this order. Approve to confirm and begin fresh
                            ingredient packaging.
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Button
                          testID={`admin-approve-order-${order.id}`}
                          title={updatingOrderId === order.id ? 'Approving...' : 'Approve Order'}
                          variant="primary"
                          size="sm"
                          loading={updatingOrderId === order.id}
                          style={{ backgroundColor: '#16A34A', flex: 1 }}
                          onPress={() => handleApproveOrder(order.id)}
                        />
                        <Button
                          testID={`admin-reject-order-${order.id}`}
                          title="Reject / Cancel"
                          variant="outline"
                          size="sm"
                          style={{ borderColor: '#DC2626', flex: 1 }}
                          textStyle={{ color: '#DC2626' }}
                          onPress={() => handleCancelOrder(order.id)}
                        />
                      </View>
                    </View>
                  )}

                  {/* Status transition buttons (only for active orders) */}
                  {order.status !== 'Cancelled' &&
                    order.status !== 'Delivered' &&
                    order.status !== 'Refunded' && (
                      <View style={styles.orderActionsRow}>
                        <Text style={[styles.actionLabel, { color: colors.textMuted }]}>
                          Update Status:
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={{ marginVertical: 6 }}
                        >
                          {(
                            [
                              'Placed',
                              'Confirmed',
                              'Preparing',
                              'Out for Delivery',
                              'Delivered',
                              'Cancelled',
                            ] as OrderStatus[]
                          ).map((st) => (
                            <TouchableOpacity
                              key={st}
                              style={[
                                styles.statusBtn,
                                {
                                  backgroundColor:
                                    order.status === st ? colors.primary : colors.bgSubtle,
                                  borderColor: colors.borderLight,
                                  borderRadius: radii.sm,
                                },
                              ]}
                              onPress={() => handleStatusChange(order.id, st)}
                            >
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: order.status === st ? '#FFFFFF' : colors.textPrimary,
                                  fontWeight: order.status === st ? '800' : '500',
                                }}
                              >
                                {st}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}

                  <View style={styles.orderBottomBar}>
                    <Button
                      title={`Inspect Items (${order.items?.length || 0})`}
                      variant="outline"
                      size="sm"
                      style={{ borderColor: colors.primary, marginRight: 8 }}
                      textStyle={{ color: colors.primary, fontWeight: '700', fontSize: 11 }}
                      onPress={() => {
                        setInspectOrder(order);
                        setInspectModalVisible(true);
                      }}
                    />

                    <TouchableOpacity
                      onPress={() => Alert.alert('Invoice', generateInvoiceText(order))}
                      style={styles.actionLink}
                    >
                      <Text style={[styles.actionLinkText, { color: colors.primary }]}>
                        View Invoice
                      </Text>
                    </TouchableOpacity>

                    {order.status !== 'Cancelled' &&
                      order.status !== 'Delivered' &&
                      order.status !== 'Refunded' && (
                        <Button
                          title="Cancel Order"
                          variant="outline"
                          size="sm"
                          style={{ borderColor: '#DC2626', marginRight: 8 }}
                          textStyle={{ color: '#DC2626', fontSize: 11 }}
                          onPress={() => handleCancelOrder(order.id)}
                        />
                      )}

                    {order.status !== 'Refunded' && (
                      <Button
                        title="Issue Refund"
                        variant="outline"
                        size="sm"
                        textStyle={{ fontSize: 11 }}
                        onPress={() => handleOpenRefund(order)}
                      />
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* MODULE 2: MEAL KITS CATALOG MANAGEMENT */}
        {activeTab === 'kits' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Meal Prep Kits ({scopedKits.length})
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  {isSuperAdmin
                    ? 'All regions catalog (Super Admin view - full access)'
                    : `Dishes scoped to your assigned region(s): ${assignedRegions && assignedRegions.length > 0 ? assignedRegions.map(formatRegionName).join(', ') : 'Pune City (Pune)'}`}
                </Text>
              </View>
              <Button
                title="+ Add Meal Kit"
                size="sm"
                onPress={() => {
                  setEditingKit(null);
                  setKitModalVisible(true);
                }}
              />
            </View>

            {/* Super Admin Region Filter Pills */}
            {isSuperAdmin && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 12 }}
              >
                {[
                  { id: 'All', label: 'All Regions' },
                  { id: 'West', label: 'West Hub' },
                  { id: 'pune-city', label: 'Pune City' },
                  { id: 'pune-pcmc', label: 'Pimpri Chinchwad' },
                  { id: 'pune-west', label: 'Pune West (Hinjawadi)' },
                  { id: 'mumbai-south', label: 'South Mumbai' },
                  { id: 'mumbai-suburbs-west', label: 'Mumbai West' },
                  { id: 'South', label: 'South Hub' },
                  { id: 'blr-east', label: 'Bengaluru East (Whitefield)' },
                  { id: 'blr-south', label: 'Bengaluru South (Koramangala)' },
                  { id: 'hyd-west', label: 'Hyderabad West (Hitec)' },
                  { id: 'chn-south', label: 'Chennai South (OMR)' },
                  { id: 'North', label: 'North Hub' },
                  { id: 'delhi-south-central', label: 'Delhi South' },
                  { id: 'delhi-noida', label: 'Noida' },
                  { id: 'delhi-gurugram', label: 'Gurugram' },
                  { id: 'East', label: 'East Hub' },
                  { id: 'kol-south-central', label: 'Kolkata South' },
                ].map((item) => {
                  const isSelected = superAdminRegionFilter === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => setSuperAdminRegionFilter(item.id as any)}
                      style={[
                        styles.statePill,
                        {
                          backgroundColor: isSelected ? colors.primary : colors.bgSurface,
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          borderRadius: radii.pill,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isSelected ? '#fff' : colors.textPrimary,
                          fontWeight: '700',
                          fontSize: 12,
                        }}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* MEAL KITS SEARCH BAR & FILTERING SYSTEM */}
            <View
              style={[
                styles.kitFilterContainer,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  borderColor: colors.borderLight,
                  position: 'relative',
                  ...shadows.card,
                },
                {
                  zIndex: openDropdown ? 99999 : 10,
                  elevation: openDropdown ? 99999 : 2,
                },
              ]}
            >
              {/* Search Bar Input */}
              <View
                style={[
                  styles.kitSearchBar,
                  {
                    backgroundColor: colors.bgSubtle,
                    borderColor: colors.border,
                    borderRadius: radii.lg,
                  },
                ]}
              >
                <Icon name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  style={[styles.kitSearchInput, { color: colors.textPrimary }]}
                  placeholder="Search meal kits by name, ingredient, cuisine..."
                  placeholderTextColor={colors.textMuted}
                  value={kitSearchQuery}
                  onChangeText={setKitSearchQuery}
                  autoCorrect={false}
                />
                {kitSearchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setKitSearchQuery('')}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 4 }}
                  >
                    <Icon name="close" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              {/* Dropdown Filters Row: Diet, Cuisine Type & Dish Type */}
              <View
                style={[
                  styles.dropdownFiltersRow,
                  {
                    position: 'relative',
                    zIndex: openDropdown ? 99999 : 5,
                    elevation: openDropdown ? 99999 : 1,
                  },
                ]}
              >
                {/* 1. Diet Dropdown */}
                <View
                  style={[
                    styles.dropdownContainer,
                    {
                      zIndex: openDropdown === 'diet' ? 99999 : 1,
                      elevation: openDropdown === 'diet' ? 99999 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.dropdownLabel, { color: colors.textSecondary }]}>DIET</Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      {
                        backgroundColor:
                          selectedKitDietFilter !== 'All' ? colors.primary + '12' : colors.bgSubtle,
                        borderColor:
                          openDropdown === 'diet'
                            ? colors.primary
                            : selectedKitDietFilter !== 'All'
                              ? colors.primary
                              : colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                    onPress={() => setOpenDropdown((prev) => (prev === 'diet' ? null : 'diet'))}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerContent}>
                      <Icon
                        name="restaurant"
                        size={14}
                        color={
                          selectedKitDietFilter !== 'All' ? colors.primary : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.dropdownTriggerText,
                          {
                            color:
                              selectedKitDietFilter !== 'All' ? colors.primary : colors.textPrimary,
                            fontWeight: selectedKitDietFilter !== 'All' ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedKitDietFilter === 'All'
                          ? 'All Diets'
                          : ADMIN_DIET_FILTERS.find((d) => d.id === selectedKitDietFilter)?.label ||
                            selectedKitDietFilter}
                      </Text>
                    </View>
                    <Icon
                      name={openDropdown === 'diet' ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={selectedKitDietFilter !== 'All' ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>

                  {openDropdown === 'diet' && (
                    <View
                      style={[
                        styles.dropdownMenu,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.borderLight,
                          borderRadius: radii.lg,
                          ...shadows.card,
                        },
                      ]}
                    >
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.dropdownMenuList}
                        showsVerticalScrollIndicator
                      >
                        {ADMIN_DIET_FILTERS.map((f) => {
                          const isSelected = selectedKitDietFilter === f.id;
                          return (
                            <TouchableOpacity
                              key={f.id}
                              style={[
                                styles.dropdownMenuItem,
                                {
                                  backgroundColor: isSelected
                                    ? colors.primary + '15'
                                    : 'transparent',
                                },
                              ]}
                              onPress={() => {
                                setSelectedKitDietFilter(f.id);
                                setOpenDropdown(null);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownMenuItemText,
                                  {
                                    color: isSelected ? colors.primary : colors.textPrimary,
                                    fontWeight: isSelected ? '700' : '500',
                                  },
                                ]}
                              >
                                {f.label}
                              </Text>
                              {isSelected && <Icon name="check" size={14} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* 2. Cuisine Type Dropdown */}
                <View
                  style={[
                    styles.dropdownContainer,
                    {
                      zIndex: openDropdown === 'cuisine' ? 99999 : 1,
                      elevation: openDropdown === 'cuisine' ? 99999 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.dropdownLabel, { color: colors.textSecondary }]}>
                    CUISINE TYPE
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      {
                        backgroundColor:
                          selectedKitCuisineFilter !== 'All'
                            ? colors.primary + '12'
                            : colors.bgSubtle,
                        borderColor:
                          openDropdown === 'cuisine'
                            ? colors.primary
                            : selectedKitCuisineFilter !== 'All'
                              ? colors.primary
                              : colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                    onPress={() =>
                      setOpenDropdown((prev) => (prev === 'cuisine' ? null : 'cuisine'))
                    }
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerContent}>
                      <Icon
                        name="globe"
                        size={14}
                        color={
                          selectedKitCuisineFilter !== 'All' ? colors.primary : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.dropdownTriggerText,
                          {
                            color:
                              selectedKitCuisineFilter !== 'All'
                                ? colors.primary
                                : colors.textPrimary,
                            fontWeight: selectedKitCuisineFilter !== 'All' ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedKitCuisineFilter === 'All'
                          ? 'All Cuisines'
                          : selectedKitCuisineFilter}
                      </Text>
                    </View>
                    <Icon
                      name={openDropdown === 'cuisine' ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={selectedKitCuisineFilter !== 'All' ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>

                  {openDropdown === 'cuisine' && (
                    <View
                      style={[
                        styles.dropdownMenu,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.borderLight,
                          borderRadius: radii.lg,
                          ...shadows.card,
                        },
                      ]}
                    >
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.dropdownMenuList}
                        showsVerticalScrollIndicator
                      >
                        {ADMIN_CUISINE_FILTERS.map((c) => {
                          const isSelected = selectedKitCuisineFilter === c;
                          return (
                            <TouchableOpacity
                              key={c}
                              style={[
                                styles.dropdownMenuItem,
                                {
                                  backgroundColor: isSelected
                                    ? colors.primary + '15'
                                    : 'transparent',
                                },
                              ]}
                              onPress={() => {
                                setSelectedKitCuisineFilter(c);
                                setOpenDropdown(null);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownMenuItemText,
                                  {
                                    color: isSelected ? colors.primary : colors.textPrimary,
                                    fontWeight: isSelected ? '700' : '500',
                                  },
                                ]}
                              >
                                {c === 'All' ? 'All Cuisines' : c}
                              </Text>
                              {isSelected && <Icon name="check" size={14} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* 3. Dish Type Dropdown */}
                <View
                  style={[
                    styles.dropdownContainer,
                    {
                      zIndex: openDropdown === 'dish' ? 99999 : 1,
                      elevation: openDropdown === 'dish' ? 99999 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.dropdownLabel, { color: colors.textSecondary }]}>
                    DISH TYPE
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdownTrigger,
                      {
                        backgroundColor:
                          selectedKitDishFilter !== 'All' ? colors.primary + '12' : colors.bgSubtle,
                        borderColor:
                          openDropdown === 'dish'
                            ? colors.primary
                            : selectedKitDishFilter !== 'All'
                              ? colors.primary
                              : colors.border,
                        borderRadius: radii.md,
                      },
                    ]}
                    onPress={() => setOpenDropdown((prev) => (prev === 'dish' ? null : 'dish'))}
                    activeOpacity={0.8}
                  >
                    <View style={styles.dropdownTriggerContent}>
                      <Icon
                        name="options"
                        size={14}
                        color={
                          selectedKitDishFilter !== 'All' ? colors.primary : colors.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.dropdownTriggerText,
                          {
                            color:
                              selectedKitDishFilter !== 'All' ? colors.primary : colors.textPrimary,
                            fontWeight: selectedKitDishFilter !== 'All' ? '700' : '500',
                          },
                        ]}
                        numberOfLines={1}
                      >
                        {selectedKitDishFilter === 'All' ? 'All Dish Types' : selectedKitDishFilter}
                      </Text>
                    </View>
                    <Icon
                      name={openDropdown === 'dish' ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={selectedKitDishFilter !== 'All' ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>

                  {openDropdown === 'dish' && (
                    <View
                      style={[
                        styles.dropdownMenu,
                        {
                          backgroundColor: colors.bgSurface,
                          borderColor: colors.borderLight,
                          borderRadius: radii.lg,
                          ...shadows.card,
                        },
                      ]}
                    >
                      <ScrollView
                        nestedScrollEnabled
                        style={styles.dropdownMenuList}
                        showsVerticalScrollIndicator
                      >
                        {ADMIN_DISH_FILTERS.map((d) => {
                          const isSelected = selectedKitDishFilter === d;
                          return (
                            <TouchableOpacity
                              key={d}
                              style={[
                                styles.dropdownMenuItem,
                                {
                                  backgroundColor: isSelected
                                    ? colors.primary + '15'
                                    : 'transparent',
                                },
                              ]}
                              onPress={() => {
                                setSelectedKitDishFilter(d);
                                setOpenDropdown(null);
                              }}
                            >
                              <Text
                                style={[
                                  styles.dropdownMenuItemText,
                                  {
                                    color: isSelected ? colors.primary : colors.textPrimary,
                                    fontWeight: isSelected ? '700' : '500',
                                  },
                                ]}
                              >
                                {d === 'All' ? 'All Dish Types' : d}
                              </Text>
                              {isSelected && <Icon name="check" size={14} color={colors.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>

              {/* Active Filter Counter & Quick Reset Bar */}
              <View style={[styles.filterStatsBar, { borderTopColor: colors.borderLight }]}>
                <Text style={[styles.filterStatsText, { color: colors.textSecondary }]}>
                  Showing{' '}
                  <Text style={{ fontWeight: '800', color: colors.textPrimary }}>
                    {filteredKits.length}
                  </Text>{' '}
                  of {kits.length} meal kits
                </Text>
                {activeKitFilterCount > 0 && (
                  <TouchableOpacity style={styles.clearAllBtn} onPress={handleClearKitFilters}>
                    <Icon name="close-circle" size={14} color="#DC2626" />
                    <Text style={styles.clearAllBtnText}>
                      Clear Filters ({activeKitFilterCount})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Results or Empty State */}
            {filteredKits.length === 0 ? (
              <View
                style={[
                  styles.adminKitCard,
                  {
                    backgroundColor: colors.bgSurface,
                    padding: 32,
                    alignItems: 'center',
                    borderRadius: radii.xl,
                    borderColor: colors.borderLight,
                    ...shadows.card,
                    position: 'relative',
                    zIndex: 1,
                    elevation: 1,
                  },
                ]}
              >
                <View style={{ marginBottom: 12 }}>
                  <Icon name="search" size={40} color={colors.textMuted} />
                </View>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: colors.textPrimary,
                    marginBottom: 4,
                  }}
                >
                  No Meal Kits Found
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: colors.textSecondary,
                    textAlign: 'center',
                    marginBottom: 16,
                    lineHeight: 18,
                  }}
                >
                  {kitSearchQuery
                    ? `No meal kits matched "${kitSearchQuery}" with current filter options.`
                    : 'No meal kits matched the selected filter criteria.'}
                </Text>
                <Button
                  title="Reset All Filters"
                  variant="outline"
                  size="sm"
                  onPress={handleClearKitFilters}
                />
              </View>
            ) : (
              <View style={styles.kitsCardsListContainer}>
                {filteredKits.map((kit) => (
                  <TouchableOpacity
                    key={kit.id}
                    testID={`admin-meal-kit-card-${kit.id}`}
                    activeOpacity={0.88}
                    onPress={() => {
                      setEditingKit(kit);
                      setKitModalVisible(true);
                    }}
                    style={[
                      styles.adminKitCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderRadius: radii.xl,
                        borderColor: colors.borderLight,
                        ...shadows.card,
                      },
                    ]}
                  >
                    <View style={styles.kitCardTop}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text style={[styles.kitCardName, { color: colors.textPrimary }]}>
                            {kit.name}
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}>
                              Edit Details
                            </Text>
                            <Icon name="chevron-right" size={12} color={colors.primary} />
                          </View>
                        </View>
                        <Text style={[styles.kitCardTag, { color: colors.textSecondary }]}>
                          {kit.tagline}
                        </Text>

                        {/* Categorized Meal Kit Tags: Diet, Cuisine, Dish Type, Allergens (Excluding region and subregion tags) */}
                        <View
                          style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 6,
                            marginTop: 6,
                            marginBottom: 6,
                          }}
                        >
                          {parseCategorizedTags(
                            kit.tags && kit.tags.length > 0 ? kit.tags : compileMealKitTags(kit),
                          )
                            .filter(
                              (tag) =>
                                tag.category !== 'region' &&
                                !tag.label.toLowerCase().startsWith('region:') &&
                                !tag.label.toLowerCase().startsWith('subregion:') &&
                                !tag.label.toLowerCase().startsWith('state:'),
                            )
                            .map((tag, idx) => (
                              <Badge
                                key={`${kit.id}-tag-${tag.category}-${idx}`}
                                label={tag.label}
                                variant={tag.variant}
                                size="sm"
                              />
                            ))}
                        </View>

                        <Text style={[styles.kitCardMeta, { color: colors.textMuted }]}>
                          {kit.spiceLevel} Spice • ₹{kit.price} • {kit.prepTimeMinutes || 15}m prep
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4, marginLeft: 8 }}>
                        {kit.isTrending ? (
                          <Badge label="TRENDING" variant="warning" size="sm" />
                        ) : null}
                        {kit.isOutOfStock ? (
                          <Badge label="OUT OF STOCK" variant="danger" size="sm" />
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.kitActionsRow}>
                      <Button
                        title={kit.isTrending ? 'Remove Trending' : 'Set Trending'}
                        variant={kit.isTrending ? 'secondary' : 'outline'}
                        size="sm"
                        style={{ marginRight: 8, marginBottom: 4 }}
                        onPress={() => handleToggleTrending(kit)}
                      />
                      <Button
                        title="Print Recipe Card"
                        variant="primary"
                        size="sm"
                        style={{ marginRight: 8, marginBottom: 4 }}
                        onPress={() => {
                          setPrintCardKit(kit);
                          setPrintCardModalVisible(true);
                        }}
                      />
                      <Button
                        title="Edit Recipe & Price"
                        variant="outline"
                        size="sm"
                        style={{ marginRight: 8, marginBottom: 4 }}
                        onPress={() => {
                          setEditingKit(kit);
                          setKitModalVisible(true);
                        }}
                      />
                      <Button
                        title={kit.isOutOfStock ? 'Mark In Stock' : 'Mark Out of Stock'}
                        variant={kit.isOutOfStock ? 'secondary' : 'outline'}
                        size="sm"
                        style={{ marginRight: 8, marginBottom: 4 }}
                        onPress={() => handleToggleOutOfStock(kit)}
                      />
                      <Button
                        title="Delete"
                        variant="danger"
                        size="sm"
                        style={{ marginBottom: 4 }}
                        onPress={() => handleRequestDeleteKit(kit)}
                      />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}


        {/* MODULE 3: INVENTORY & STOCK MANAGEMENT */}
        {activeTab === 'inventory' && <InventoryManagementView />}

        {/* MODULE 4: REGIONAL ANALYTICS DASHBOARD */}
        {activeTab === 'analytics' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View style={{ marginBottom: 14 }}>
              <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                {isSuperAdmin
                  ? 'Pan-India Regional Analytics (Super Admin View)'
                  : 'Regional Analytics (' + (assignedRegions && assignedRegions.length > 0 ? assignedRegions.map(formatRegionName).join(', ') : 'Pune City (Pune)') + ')'}
              </Text>
              <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                {isSuperAdmin
                  ? 'Complete sales data, growth metrics & dietary split across all India operating regions'
                  : 'State & fulfillment metrics strictly restricted to your assigned jurisdiction: ' + (assignedRegions && assignedRegions.length > 0 ? assignedRegions.map(formatRegionName).join(', ') : 'Pune City (Pune)')}
              </Text>
              <View style={{ marginTop: 10, alignSelf: 'flex-start' }}>
                <Button title="Export CSV" size="sm" onPress={handleExportCSV} />
              </View>
            </View>
            </View>

            {/* RLS Status Badge Banner */}
            <View
              style={{
                backgroundColor: isSuperAdmin ? '#FFFBEB' : colors.primaryLight,
                borderColor: isSuperAdmin ? '#F59E0B' : colors.primary + '50',
                borderWidth: 1,
                borderRadius: radii.md,
                padding: 10,
                marginBottom: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <Icon
                  name={isSuperAdmin ? 'globe' : 'shield-checkmark'}
                  size={16}
                  color={isSuperAdmin ? '#B45309' : colors.primary}
                />
                <Text
                  style={{
                    fontSize: 12,
                    color: isSuperAdmin ? '#92400E' : colors.textPrimary,
                    fontWeight: '600',
                  }}
                >
                  {isSuperAdmin
                    ? 'Super Admin: Full visibility across North, South, West & East Regions'
                    : 'Row Level Security (RLS) Active: Showing statistics only for ' + (assignedRegions && assignedRegions.length > 0 ? assignedRegions.map(formatRegionName).join(', ') : 'Pune City (Pune)')}
                </Text>
              </View>
              <Badge
                label={isSuperAdmin ? 'ALL STATES' : 'SCOPED REGIONS'}
                variant={isSuperAdmin ? 'warning' : 'info'}
                size="sm"
              />
            </View>

          {/* Region Filters: State | City | Area in one horizontal row */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14, zIndex: 1000, elevation: 1000 }}>
            {/* STATE */}
            <View style={{ flex: 1, position: 'relative', zIndex: showAnalyticsStateDD ? 3000 : 1 }}>
              <Text style={analyticsLabelStyle}>State</Text>
              <TouchableOpacity
                activeOpacity={1}
                style={analyticsFieldStyle(showAnalyticsStateDD)}
                onPress={() => {
                  setShowAnalyticsStateDD(true);
                  stateInputRef.current?.focus();
                }}
              >
                <TextInput
                  ref={stateInputRef}
                  style={{ flex: 1, height: '100%', fontSize: 14, color: colors.textPrimary, paddingVertical: 0 }}
                  placeholder="Search state..."
                  placeholderTextColor={colors.textMuted}
                  value={selectedState || analyticsStateSearch}
                  onChangeText={(t) => {
                    setAnalyticsStateSearch(t);
                    setSelectedState('');
                    setSelectedCity('');
                    setSelectedSubRegion('');
                    if (t) setShowAnalyticsStateDD(true);
                  }}
                  onFocus={() => setShowAnalyticsStateDD(true)}
                  onBlur={() => setTimeout(() => setShowAnalyticsStateDD(false), 200)}
                />
              </TouchableOpacity>

              {showAnalyticsStateDD && (() => {
                const filtered = analyticsStateSearch
                  ? accessibleStates.filter((s) => s.stateName.toLowerCase().includes(analyticsStateSearch.toLowerCase()))
                  : accessibleStates;
                return filtered.length > 0 ? (
                  <View style={analyticsMenuStyle}>
                    <ThinScrollView maxHeight={200} keyboardShouldPersistTaps="handled">
                      {filtered.map((st) => (
                        <TouchableOpacity
                          key={st.stateCode}
                          style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: selectedState === st.stateName ? colors.primaryLight : 'transparent' }}
                          onPress={() => {
                            setSelectedState(st.stateName);
                            setSelectedCity('');
                            setSelectedSubRegion('');
                            setShowAnalyticsStateDD(false);
                            setAnalyticsStateSearch('');
                          }}
                        >
                          <Text style={{ fontSize: 14, color: selectedState === st.stateName ? colors.primary : colors.textPrimary, fontWeight: selectedState === st.stateName ? '700' : '400' }}>
                            {st.stateName}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ThinScrollView>
                  </View>
                ) : null;
              })()}
            </View>

            {/* CITY */}
            <View style={{ flex: 1, position: 'relative', zIndex: showAnalyticsCityDD ? 3000 : 1 }}>
              <Text style={analyticsLabelStyle}>City</Text>
              <TouchableOpacity
                activeOpacity={1}
                disabled={availableCities.length === 0}
                style={analyticsFieldStyle(showAnalyticsCityDD, availableCities.length === 0)}
                onPress={() => {
                  setShowAnalyticsCityDD(true);
                  cityInputRef.current?.focus();
                }}
              >
                <TextInput
                  ref={cityInputRef}
                  editable={availableCities.length > 0}
                  style={{ flex: 1, height: '100%', fontSize: 14, color: colors.textPrimary, paddingVertical: 0 }}
                  placeholder="All cities"
                  placeholderTextColor={colors.textMuted}
                  value={selectedCity || analyticsCitySearch}
                  onChangeText={(t) => {
                    setAnalyticsCitySearch(t);
                    setSelectedCity('');
                    setSelectedSubRegion('');
                    if (t) setShowAnalyticsCityDD(true);
                  }}
                  onFocus={() => setShowAnalyticsCityDD(true)}
                  onBlur={() => setTimeout(() => setShowAnalyticsCityDD(false), 200)}
                />
                {!!selectedCity && (
                <TouchableOpacity
                  onPress={() => { setSelectedCity(''); setSelectedSubRegion(''); setAnalyticsCitySearch(''); }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Icon name="close" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              </TouchableOpacity>

              {showAnalyticsCityDD && filteredAnalyticsCities.length > 0 && (
                <View style={analyticsMenuStyle}>
                  <ThinScrollView maxHeight={200} keyboardShouldPersistTaps="handled">
                    {filteredAnalyticsCities.map((city: string) => (
                      <TouchableOpacity
                        key={city}
                        style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: selectedCity === city ? colors.primaryLight : 'transparent' }}
                        onPress={() => {
                          setSelectedCity(city);
                          setSelectedSubRegion('');
                          setShowAnalyticsCityDD(false);
                          setAnalyticsCitySearch('');
                        }}
                      >
                        <Text style={{ fontSize: 14, color: selectedCity === city ? colors.primary : colors.textPrimary, fontWeight: selectedCity === city ? '700' : '400' }}>
                          {city}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ThinScrollView>
                </View>
              )}
            </View>

            {/* AREA / NEIGHBORHOOD */}
            <View style={{ flex: 1, position: 'relative', zIndex: showAnalyticsSubRegionDD ? 3000 : 1 }}>
              <Text style={analyticsLabelStyle}>Area</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                disabled={!selectedCity || availableSubRegions.length === 0}
                style={analyticsFieldStyle(showAnalyticsSubRegionDD, !selectedCity || availableSubRegions.length === 0)}
                onPress={() => setShowAnalyticsSubRegionDD((v) => !v)}
              >
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 14, color: selectedSubRegion ? colors.textPrimary : colors.textMuted }}
                >
                  {selectedSubRegion
                    ? availableSubRegions.find((sr) => sr.id === selectedSubRegion)?.name || 'All areas'
                    : selectedCity ? 'All areas' : 'Select city first'}
                </Text>
                {!!selectedSubRegion && (
                <TouchableOpacity
                  onPress={() => { setSelectedSubRegion(''); setShowAnalyticsSubRegionDD(false); }}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Icon name="close" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              )}
              </TouchableOpacity>

              {showAnalyticsSubRegionDD && availableSubRegions.length > 0 && (
                <View style={analyticsMenuStyle}>
                  <ThinScrollView maxHeight={200}>
                    {availableSubRegions.map((sr) => (
                      <TouchableOpacity
                        key={sr.id}
                        style={{ paddingVertical: 12, paddingHorizontal: 14, backgroundColor: selectedSubRegion === sr.id ? colors.primaryLight : 'transparent' }}
                        onPress={() => { setSelectedSubRegion(sr.id); setShowAnalyticsSubRegionDD(false); }}
                      >
                        <Text style={{ fontSize: 14, color: selectedSubRegion === sr.id ? colors.primary : colors.textPrimary, fontWeight: selectedSubRegion === sr.id ? '700' : '400' }}>
                          {sr.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ThinScrollView>
                </View>
              )}
            </View>
          </View>

            {/* State Deep-Dive Card */}
            {(() => {
              const stateData =
                accessibleStates.find((s) => s.stateName === selectedState) || accessibleStates[0];
              if (!stateData) {
                return (
                  <View
                    style={[
                      styles.stateDetailCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderRadius: radii.xl,
                        padding: 24,
                        alignItems: 'center',
                      },
                    ]}
                  >
                    <Text style={{ color: colors.textSecondary }}>
                      No state data available for your assigned regions.
                    </Text>
                  </View>
                );
              }
              return (
                <View
                  style={[
                    styles.stateDetailCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: colors.borderLight,
                      ...shadows.card,
                    },
                  ]}
                >
                  <View style={styles.stateDetailTop}>
                    <View>
                      <Text style={[styles.stateName, { color: colors.textPrimary }]}>
                        {stateData.stateName} ({stateData.capitalCity})
                      </Text>
                      <Text style={[styles.stateHub, { color: colors.textSecondary }]}>
                        Fulfillment: {stateData.hubName}
                      </Text>
                    </View>
                    <Badge label={`+${stateData.growthRate}% MoM`} variant="success" />
                  </View>

                  <View style={styles.metricsGrid}>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                      ]}
                    >
                      <Text style={[styles.metricVal, { color: colors.primary }]}>
                        {stateData.totalOrders}
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                        TOTAL ORDERS
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                      ]}
                    >
                      <Text style={[styles.metricVal, { color: colors.textPrimary }]}>
                        ₹{(stateData.totalRevenue / 100000).toFixed(1)}L
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>REVENUE</Text>
                    </View>
                    <View
                      style={[
                        styles.metricCard,
                        { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                      ]}
                    >
                      <Text style={[styles.metricVal, { color: colors.veg }]}>
                        {stateData.vegOrderPercentage}%
                      </Text>
                      <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                        VEG SHARE
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.topSellingCallout,
                      {
                        backgroundColor: colors.primaryLight,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      },
                    ]}
                  >
                    <Icon name="star" size={14} color={colors.primaryDark} />
                    <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: 13 }}>
                      Top Selling: {stateData.topMealKitName}
                    </Text>
                  </View>
                </View>
              );
            })()}

            {/* Cross-Tab View: E.g., Top Meals among Vegetarians in Maharashtra */}
            <View
              style={[
                styles.crossTabCard,
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  borderColor: colors.borderLight,
                  ...shadows.card,
                },{ zIndex: showCrossTabDietDD ? 2000 : 1, elevation: showCrossTabDietDD ? 2000 : 1 }
              ]}
            >
              <Text style={[styles.crossTabTitle, { color: colors.textPrimary }]}>
                Cross-Tab: Top Meals Among {crossTabDiet.toUpperCase()} in {selectedState}
              </Text>
              <View
              style={{
                position: 'relative',
                zIndex: showCrossTabDietDD ? 3000 : 1,
                marginBottom: 12,
                maxWidth: 280,
              }}
            >
              <Text style={analyticsLabelStyle}>Diet</Text>
              <TouchableOpacity
                activeOpacity={0.8}
                style={analyticsFieldStyle(showCrossTabDietDD)}
                onPress={() => setShowCrossTabDietDD((v) => !v)}
              >
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '600' }}
                >
                  {crossTabDietOptions.find((d) => d.id === crossTabDiet)?.label || 'All Diets'}
                </Text>
              </TouchableOpacity>

              {showCrossTabDietDD && (
                <View style={analyticsMenuStyle}>
                  <ThinScrollView maxHeight={200}>
                    {crossTabDietOptions.map((d) => (
                      <TouchableOpacity
                        key={d.id}
                        style={{
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          backgroundColor: crossTabDiet === d.id ? colors.primaryLight : 'transparent',
                        }}
                        onPress={() => {
                          setCrossTabDiet(d.id);
                          setShowCrossTabDietDD(false);
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 14,
                            color: crossTabDiet === d.id ? colors.primary : colors.textPrimary,
                            fontWeight: crossTabDiet === d.id ? '700' : '400',
                          }}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ThinScrollView>
                </View>
              )}
            </View>

              <View style={{ gap: 8 }}>
                {crossTabResult.topItems.map((dish, idx) => (
                  <View
                    key={dish.mealKitId || idx}
                    style={[
                      styles.crossTabItem,
                      {
                        backgroundColor: colors.bgSubtle,
                        borderRadius: radii.md,
                        paddingHorizontal: 12,
                      },
                    ]}
                  >
                    <Text style={[styles.crossTabRank, { color: colors.primary }]}>#{idx + 1}</Text>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={[styles.crossTabName, { color: colors.textPrimary }]}>
                        {dish.name}
                      </Text>
                      <Text style={[styles.crossTabCuisine, { color: colors.textSecondary }]}>
                        {dish.unitsSold} kits sold • {dish.shareInRegion}% region share
                      </Text>
                    </View>
                    <Text style={[styles.crossTabUnits, { color: colors.primary }]}>
                      ₹{dish.revenueGenerated.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* MODULE 5A: STAFF ADMIN MANAGEMENT */}
        {activeTab === 'admins' && (
          <View>
            {/* Top Subtab Switcher */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setActiveTab('customers')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: radii.pill,
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                }}
              >
                <Icon name="people" size={16} color={colors.textSecondary} />
                <Text style={{ fontWeight: '700', fontSize: 13, color: colors.textSecondary }}>
                  Customers ({users.filter((u) => u.role !== 'admin').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('admins')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: radii.pill,
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  borderWidth: 1,
                }}
              >
                <Icon name="lock" size={16} color="#FFF" />
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#FFF' }}>
                  Staff Admins ({adminProfiles.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Regional Admin Role & Many-to-Many Region Assignments */}
            <View
              style={[
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  padding: 20,
                  marginBottom: 20,
                  borderColor: isSuperAdmin ? '#F59E0B' : colors.borderLight,
                  borderWidth: isSuperAdmin ? 1.5 : 1,
                  ...shadows.card,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.moduleTitle, { color: colors.textPrimary, fontSize: 18 }]}>
                      {isSuperAdmin
                        ? `Staff Admin Management (${adminProfiles.length})`
                        : 'Your Regional Admin Jurisdiction'}
                    </Text>
                  </View>
                  <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                    {isSuperAdmin
                      ? 'Super Admin (raphael.dalmeida@mulyam.in) can assign staff admins to specific regions. Admins and regions have a many-to-many relationship.'
                      : `You are authenticated with regional access to: ${assignedRegions && assignedRegions.length > 0 ? assignedRegions.map(formatRegionName).join(', ') : 'Pune City (Pune)'}. Only the Super Admin can reassign regional access.`}
                  </Text>
                </View>

                {isSuperAdmin && (
                  <Button
                    title="+ Assign Regional Admin"
                    size="sm"
                    onPress={handleOpenAddAdminModal}
                    style={{ backgroundColor: '#F59E0B' }}
                  />
                )}
              </View>

              {/* Admin Staff List */}
              <View style={{ gap: 10, marginTop: 12 }}>
                {adminProfiles.map((adm) => (
                  <View
                    key={adm.id}
                    style={{
                      backgroundColor: colors.bgSubtle,
                      borderColor: colors.borderLight,
                      borderWidth: 1,
                      borderRadius: radii.lg,
                      padding: 14,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text
                          style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}
                        >
                          {adm.name}
                        </Text>
                        <Badge
                          label={adm.role === 'super_admin' ? 'SUPER ADMIN' : 'REGIONAL ADMIN'}
                          variant={adm.role === 'super_admin' ? 'warning' : 'info'}
                          size="sm"
                        />
                      </View>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        {adm.email}
                      </Text>

                      {/* Many-to-Many Assigned Regions Tags */}
                      <View
                        style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}
                      >
                        {adm.role === 'super_admin' ? (
                          <Badge
                            label="All Operating Regions (Pan-India)"
                            variant="neutral"
                            size="sm"
                          />
                        ) : adm.regions && adm.regions.length > 0 ? (
                          adm.regions.map((reg) => {
                            const sc = STORAGE_CENTRE_REGIONS.find(
                              (r) => r.id === reg || r.name.toLowerCase() === reg.toLowerCase(),
                            );
                            return (
                              <Badge
                                key={reg}
                                label={sc ? `${sc.name} (${sc.city})` : `${reg} Region`}
                                variant="accent"
                                size="sm"
                              />
                            );
                          })
                        ) : (
                          <Badge label="No Region Assigned" variant="danger" size="sm" />
                        )}
                      </View>
                    </View>

                    {isSuperAdmin && (
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <Button
                          title="Edit Access"
                          size="sm"
                          variant="outline"
                          onPress={() => handleOpenEditAdminModal(adm)}
                        />
                        {adm.role !== 'super_admin' && adm.email !== SUPER_ADMIN_EMAIL && (
                          <Button
                            title="Revoke"
                            size="sm"
                            variant="danger"
                            onPress={() => handleDeleteAdmin(adm.email)}
                          />
                        )}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* MODULE 5B: CUSTOMER ACCOUNTS (LIVE) */}
        {(activeTab === 'customers' || activeTab === 'users') && (
          <View>
            {/* Top Subtab Switcher */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => setActiveTab('customers')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: radii.pill,
                  backgroundColor: colors.primary,
                  borderColor: colors.primary,
                  borderWidth: 1,
                }}
              >
                <Icon name="people" size={16} color="#FFF" />
                <Text style={{ fontWeight: '700', fontSize: 13, color: '#FFF' }}>
                  Customers ({users.filter((u) => u.role !== 'admin').length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveTab('admins')}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderRadius: radii.pill,
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                }}
              >
                <Icon name="lock" size={16} color={colors.textSecondary} />
                <Text style={{ fontWeight: '700', fontSize: 13, color: colors.textSecondary }}>
                  Staff Admins ({adminProfiles.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* Customer Accounts Header & Live Sync Status */}
            <View style={styles.moduleHeaderRow}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                    Customer Accounts ({users.filter((u) => u.role !== 'admin').length})
                  </Text>
                </View>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Live accounts, Customer IDs, live wallet balances & credit allocations
                </Text>
              </View>
              <Button title="Refresh Live" size="sm" variant="outline" onPress={reloadLiveUsers} />
            </View>

            {/* Search Customers Bar */}
            <View style={{ marginBottom: 14 }}>
              <TextInput
                style={{
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                  borderRadius: radii.md,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  color: colors.textPrimary,
                  fontSize: 14,
                }}
                placeholder="Search by Customer ID, Name, Phone, or Email..."
                placeholderTextColor={colors.textMuted}
                value={customerSearchQuery}
                onChangeText={setCustomerSearchQuery}
              />
            </View>

            {/* Filtered Customer List */}
            {(() => {
              const customerList = users.filter(
                (u) =>
                  u.role !== 'admin' &&
                  (u.id.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    u.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
                    u.phone.includes(customerSearchQuery) ||
                    u.email.toLowerCase().includes(customerSearchQuery.toLowerCase())),
              );

              if (customerList.length === 0) {
                return (
                  <View
                    style={[
                      styles.emptyStateCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderLight,
                        borderRadius: radii.xl,
                      },
                    ]}
                  >
                    <View style={{ marginBottom: 12 }}>
                      <Icon name="people" size={38} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                      No Customer Accounts Found
                    </Text>
                    <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
                      Registered customers will appear here automatically with their live Customer ID and wallet balance.
                    </Text>
                  </View>
                );
              }

              return customerList.map((u) => (
                <View
                  key={u.id}
                  style={[
                    styles.userCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      borderColor: colors.borderLight,
                      marginBottom: 14,
                      ...shadows.card,
                    },
                  ]}
                >
                  <View style={styles.userTopRow}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.userNameText, { color: colors.textPrimary, fontSize: 16 }]}>
                          {u.name}
                        </Text>
                        {u.role === 'chef' && (
                          <Badge label="CHEF" variant="warning" size="sm" />
                        )}
                      </View>
                      
                      {/* Prominent Customer ID with 1-click Copy */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <TouchableOpacity
                          onPress={() => handleCopyCustomerId(u.id)}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 5,
                            backgroundColor: colors.bgSubtle,
                            borderColor: colors.borderLight,
                            borderWidth: 1,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: radii.sm,
                          }}
                          activeOpacity={0.7}
                        >
                          <Icon name="document" size={12} color={colors.primary} />
                          <Text style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: '700', color: colors.primary }}>
                            Customer ID: {u.id}
                          </Text>
                          <Text style={{ fontSize: 11, color: copiedCustomerId === u.id ? '#10B981' : colors.textMuted }}>
                            {copiedCustomerId === u.id ? '✓ Copied!' : 'Copy'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Badge
                      label={u.status === 'active' ? 'ACTIVE' : 'SUSPENDED'}
                      variant={u.status === 'active' ? 'success' : 'danger'}
                    />
                  </View>

                  <Text style={[styles.userStats, { color: colors.textSecondary, marginTop: 8 }]}>
                    📞 {u.phone} • ✉️ {u.email} • 📍 {u.city} • 📅 Joined {u.joinedDate}
                  </Text>

                  <Text style={[styles.userStats, { color: colors.textMuted, marginTop: 2 }]}>
                    Orders: {u.ordersCount} • Total Spent: ₹{Math.round(u.totalSpend).toLocaleString('en-IN')}
                  </Text>

                  {/* Live Wallet Balance Banner & Quick Credit Issue */}
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: colors.primaryLight + '35',
                      borderColor: colors.primary + '30',
                      borderWidth: 1,
                      borderRadius: radii.md,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      marginVertical: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="wallet" size={16} color={colors.primary} />
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                        Wallet Balance: ₹{Math.round(u.walletBalance ?? 0).toLocaleString('en-IN')}
                      </Text>
                      {(u.walletReserved ?? 0) > 0 && (
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          (₹{u.walletReserved} reserved)
                        </Text>
                      )}
                    </View>
                    <Button
                      title="+ Send Credits"
                      size="sm"
                      variant="primary"
                      onPress={() => handleOpenSendCreditsModal(u)}
                    />
                  </View>

                  <View style={styles.userActionRow}>
                    <Button
                      title="View Wallet"
                      variant="outline"
                      size="sm"
                      style={{ marginRight: 8 }}
                      onPress={() => setActiveTab('wallets')}
                    />
                    <Button
                      title={u.status === 'active' ? 'Suspend Account' : 'Activate Account'}
                      variant={u.status === 'active' ? 'outline' : 'primary'}
                      size="sm"
                      style={{ marginRight: 8 }}
                      onPress={() => {
                        toggleUserStatus(u.id);
                        reloadLiveUsers();
                      }}
                    />
                    <Button
                      title={u.role === 'chef' ? 'Revoke Chef' : 'Promote to Chef'}
                      variant="outline"
                      size="sm"
                      style={{ marginRight: 8 }}
                      onPress={async () => {
                        if (u.role === 'chef') {
                          await revokeChefRole(u.id, u.email);
                          showInAppAlert('Chef Revoked', `${u.name} role reset to regular customer.`);
                        } else {
                          await grantChefRole(u.id, u.email, u.name, user?.email || 'admin');
                          showInAppAlert(
                            'Promoted to Chef',
                            `${u.name} has been promoted to Chef! They can now access Chef Studio to create and manage their meal kit recipes.`,
                          );
                        }
                        reloadLiveUsers();
                        reloadChefData();
                      }}
                    />

                    {u.email &&
                      u.email.trim().toLowerCase().endsWith('@mulyam.in') &&
                      u.email.trim().toLowerCase() !== 'raphdesantos@gmail.com' && (
                        <Button
                          title={u.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
                          variant="outline"
                          size="sm"
                          onPress={() => {
                            toggleUserAdminRole(u.id);
                            reloadLiveUsers();
                          }}
                        />
                      )}
                  </View>
                </View>
              ));
            })()}
          </View>
        )}

        {/* MODULE 6: COUPONS & PROMOTIONS */}
        {activeTab === 'coupons' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Discounts & Coupons ({coupons.length})
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Manage promo codes and checkout discounts
                </Text>
              </View>
              <Button title="+ New Coupon" size="sm" onPress={() => setCouponModalVisible(true)} />
            </View>

            {coupons.map((c) => (
              <View
                key={c.code}
                style={[
                  styles.couponCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.xl,
                    borderColor: colors.borderLight,
                    ...shadows.card,
                  },
                ]}
              >
                <View style={styles.couponTop}>
                  <Text style={[styles.couponCodeHeading, { color: colors.primary }]}>
                    {c.code}
                  </Text>
                  <Badge
                    label={c.isActive ? 'ACTIVE' : 'INACTIVE'}
                    variant={c.isActive ? 'success' : 'neutral'}
                  />
                </View>

                <Text style={[styles.couponDesc, { color: colors.textPrimary }]}>
                  {c.type === 'percentage'
                    ? `${c.discountValue}% OFF`
                    : `Flat ₹${c.discountValue} OFF`}
                  {c.minOrderValue ? ` • Min Order: ₹${c.minOrderValue}` : ''}
                </Text>
                <Text style={[styles.couponTerms, { color: colors.textMuted }]}>
                  Max Discount: ₹{c.maxDiscount || 'Unlimited'} • Valid until {c.expiryDate}
                </Text>

                <View style={styles.couponActionRow}>
                  <Button
                    title={c.isActive ? 'Deactivate' : 'Activate'}
                    variant="outline"
                    size="sm"
                    style={{ marginRight: 8 }}
                    onPress={() => {
                      toggleCouponActive(c.code);
                      setCoupons(getCoupons());
                    }}
                  />
                  <Button
                    title="Delete"
                    variant="danger"
                    size="sm"
                    onPress={() => {
                      deleteCoupon(c.code);
                      setCoupons(getCoupons());
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* MODULE 7: REVENUE & FINANCIAL REPORT */}
        {activeTab === 'revenue' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Financial Dashboard
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Monthly sales, AOV & growth indicators
                </Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                ]}
              >
                <Text style={[styles.metricVal, { color: colors.primary }]}>₹4.8L</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
                  OCTOBER REVENUE
                </Text>
              </View>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                ]}
              >
                <Text style={[styles.metricVal, { color: colors.textPrimary }]}>₹612</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>AVERAGE ORDER</Text>
              </View>
              <View
                style={[
                  styles.metricCard,
                  { backgroundColor: colors.bgSubtle, borderRadius: radii.md },
                ]}
              >
                <Text style={[styles.metricVal, { color: colors.success }]}>68%</Text>
                <Text style={[styles.metricLabel, { color: colors.textMuted }]}>REPEAT RATE</Text>
              </View>
            </View>

            <Text
              style={[
                styles.trendCardTitle,
                { color: colors.textPrimary, marginTop: 14, marginBottom: 10 },
              ]}
            >
              Quarterly Trajectory (2024)
            </Text>

            {MONTHLY_TRENDS.map((t) => (
              <View
                key={t.month}
                style={[
                  styles.trendRow,
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.lg,
                    borderColor: colors.borderLight,
                    borderWidth: 1,
                    padding: 12,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.trendMonth, { color: colors.textPrimary, width: 'auto' }]}>
                    {t.month} 2024
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    {t.orders} kits shipped
                  </Text>
                </View>
                <Text style={[styles.trendRevenue, { color: colors.primary }]}>
                  ₹{(t.revenue / 1000).toFixed(0)}k
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* MODULE 7B: CHEF SUBMISSIONS */}
        {activeTab === 'chefs' && (
          <View>
            {/* Header */}
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Chef Submissions ({chefSubmissions.length})
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Review recipes submitted by approved chefs. Set price and availability regions
                  before publishing.
                </Text>
              </View>
            </View>

            {/* Approved Chefs panel */}
            <View
              style={[
                {
                  backgroundColor: colors.bgSurface,
                  borderRadius: radii.xl,
                  padding: 20,
                  marginBottom: 20,
                  borderColor: colors.borderLight,
                  borderWidth: 1,
                  ...shadows.card,
                },
              ]}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                <Text style={[styles.moduleTitle, { color: colors.textPrimary, fontSize: 16 }]}>
                  Approved Chefs ({chefProfiles.length})
                </Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>

                  <TouchableOpacity
                    style={[
                      {
                        backgroundColor: colors.primaryLight,
                        borderRadius: radii.md,
                        paddingHorizontal: 14,
                        paddingVertical: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                      },
                    ]}
                    onPress={() => {
                      setGrantChefTargetUser(null);
                      setGrantChefModalVisible(true);
                    }}
                  >
                    <Icon name="add" size={14} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                      Grant Chef Role
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {chefProfiles.length === 0 ? (
                <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                  No chefs approved yet. Search for a registered customer in the Users tab and grant
                  them the chef role.
                </Text>
              ) : (
                chefProfiles.map((chef) => (
                  <View
                    key={chef.uid}
                    style={[
                      {
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 12,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderLight,
                      },
                    ]}
                  >
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                        {chef.displayName}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>{chef.email}</Text>
                      {chef.speciality && (
                        <Text style={{ fontSize: 11, color: colors.primary, marginTop: 2 }}>
                          {chef.speciality}
                        </Text>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert(
                            'Revoke Chef Role',
                            `Remove chef role from ${chef.displayName}? They will revert to a regular customer.`,
                            [
                              { text: 'Cancel', style: 'cancel' },
                              {
                                text: 'Revoke',
                                style: 'destructive',
                                onPress: async () => {
                                  await revokeChefRole(chef.uid, chef.email);
                                  reloadChefData();
                                  showInAppAlert(
                                    'Chef Role Revoked',
                                    `${chef.displayName} is now a regular customer.`,
                                  );
                                },
                              },
                            ],
                          );
                        }}
                        style={[
                          {
                            borderWidth: 1,
                            borderColor: colors.danger,
                            borderRadius: radii.md,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                          },
                        ]}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '700', color: colors.danger }}>
                          Revoke
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Filter tabs */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
              {(['all', 'pending_review', 'published', 'rejected'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setChefSubmissionFilter(f)}
                  style={[
                    {
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: radii.pill,
                      backgroundColor:
                        chefSubmissionFilter === f ? colors.primary : colors.bgSubtle,
                      borderWidth: 1,
                      borderColor: chefSubmissionFilter === f ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: chefSubmissionFilter === f ? '#fff' : colors.textSecondary,
                    }}
                  >
                    {f === 'all'
                      ? 'All'
                      : f === 'pending_review'
                        ? 'Pending Review'
                        : f === 'published'
                          ? 'Published'
                          : 'Rejected'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submission cards */}
            {(chefSubmissionFilter === 'all'
              ? chefSubmissions
              : chefSubmissions.filter((s) => s.submissionStatus === chefSubmissionFilter)
            ).length === 0 ? (
              <View
                style={[
                  {
                    backgroundColor: colors.bgSurface,
                    borderRadius: radii.xl,
                    padding: 40,
                    alignItems: 'center',
                    borderColor: colors.borderLight,
                    borderWidth: 1,
                  },
                ]}
              >
                <Icon name="chef" size={36} color={colors.textMuted} />
                <Text style={{ color: colors.textMuted, marginTop: 12, fontSize: 14 }}>
                  {chefSubmissionFilter === 'all'
                    ? 'No chef submissions yet.'
                    : `No ${chefSubmissionFilter.replace('_', ' ')} submissions.`}
                </Text>
              </View>
            ) : (
              (chefSubmissionFilter === 'all'
                ? chefSubmissions
                : chefSubmissions.filter((s) => s.submissionStatus === chefSubmissionFilter)
              ).map((sub) => (
                <View
                  key={sub.id}
                  style={[
                    {
                      backgroundColor: colors.bgSurface,
                      borderRadius: radii.xl,
                      padding: 18,
                      marginBottom: 14,
                      borderColor:
                        sub.submissionStatus === 'pending_review'
                          ? '#F59E0B'
                          : sub.submissionStatus === 'published'
                            ? '#22C55E'
                            : sub.submissionStatus === 'rejected'
                              ? colors.danger
                              : colors.borderLight,
                      borderWidth: sub.submissionStatus === 'pending_review' ? 1.5 : 1,
                      ...shadows.card,
                    },
                  ]}
                >
                  {/* Title row */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '800',
                          color: colors.textPrimary,
                          marginBottom: 2,
                        }}
                      >
                        {sub.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        by {sub.chefName} • {sub.cuisine} • {sub.diet.toUpperCase()}
                      </Text>
                    </View>
                    <View
                      style={[
                        {
                          paddingHorizontal: 9,
                          paddingVertical: 3,
                          borderRadius: 20,
                          backgroundColor:
                            sub.submissionStatus === 'pending_review'
                              ? '#FEF3C7'
                              : sub.submissionStatus === 'published'
                                ? '#DCFCE7'
                                : sub.submissionStatus === 'rejected'
                                  ? '#FEE2E2'
                                  : colors.bgSubtle,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '800',
                          color:
                            sub.submissionStatus === 'pending_review'
                              ? '#92400E'
                              : sub.submissionStatus === 'published'
                                ? '#15803D'
                                : sub.submissionStatus === 'rejected'
                                  ? '#B91C1C'
                                  : colors.textSecondary,
                        }}
                      >
                        {sub.submissionStatus === 'pending_review'
                          ? 'Pending Review'
                          : sub.submissionStatus === 'published'
                            ? 'Published'
                            : sub.submissionStatus === 'rejected'
                              ? 'Rejected'
                              : 'Draft'}
                      </Text>
                    </View>
                  </View>

                  {/* Description */}
                  <Text
                    style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 10 }}
                    numberOfLines={2}
                  >
                    {sub.description}
                  </Text>

                  {/* Stats */}
                  <View style={{ flexDirection: 'row', gap: 16, marginBottom: 12 }}>
                    {[
                      { label: 'Servings', value: sub.servings },
                      { label: 'Prep', value: `${sub.prepTimeMinutes}m` },
                      { label: 'Cook', value: `${sub.cookTimeMinutes}m` },
                      { label: 'Ingredients', value: sub.ingredients.length },
                      { label: 'Steps', value: sub.recipeSteps.length },
                    ].map(({ label, value }) => (
                      <View key={label}>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>{label}</Text>
                        <Text
                          style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}
                        >
                          {value}
                        </Text>
                      </View>
                    ))}
                  </View>

                  {/* Admin actions */}
                  {sub.submissionStatus === 'pending_review' ? (
                    <TouchableOpacity
                      testID={`admin-review-chef-btn-${sub.id}`}
                      style={[
                        {
                          backgroundColor: colors.primary,
                          borderRadius: radii.md,
                          paddingVertical: 10,
                          alignItems: 'center',
                        },
                      ]}
                      onPress={() => {
                        setSelectedChefSubmission(sub);
                        setChefSubmissionModalVisible(true);
                      }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                        Review & Publish / Reject
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      testID={`admin-review-chef-btn-${sub.id}`}
                      style={[
                        {
                          backgroundColor: colors.bgSubtle,
                          borderColor: colors.borderLight,
                          borderWidth: 1,
                          borderRadius: radii.md,
                          paddingVertical: 9,
                          alignItems: 'center',
                          marginTop: 6,
                        },
                      ]}
                      onPress={() => {
                        setSelectedChefSubmission(sub);
                        setChefSubmissionModalVisible(true);
                      }}
                    >
                      <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
                        View Recipe Details & Quality Check →
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Rejection notes */}
                  {sub.submissionStatus === 'rejected' && sub.reviewNotes && (
                    <View
                      style={{
                        backgroundColor: '#FEF2F2',
                        borderRadius: radii.md,
                        padding: 10,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.danger }}>
                        Rejected: {sub.reviewNotes}
                      </Text>
                    </View>
                  )}

                  {/* Published info */}
                  {sub.submissionStatus === 'published' && (
                    <View
                      style={{
                        backgroundColor: '#F0FDF4',
                        borderRadius: radii.md,
                        padding: 10,
                        marginTop: 8,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#15803D' }}>
                        Published at Rs. {sub.price ?? 'N/A'}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}

            {/* Review Submission Modal (Matches Chef Studio full authoring experience) */}
            <Modal
              visible={chefSubmissionModalVisible}
              animationType="slide"
              presentationStyle="fullScreen"
              onRequestClose={() => {
                setChefSubmissionModalVisible(false);
                setSelectedChefSubmission(null);
              }}
            >
              {selectedChefSubmission && (
                <ChefSubmissionApprovalView
                  submission={selectedChefSubmission}
                  isProcessing={isProcessingChefSubmission}
                  onClose={() => {
                    setChefSubmissionModalVisible(false);
                    setSelectedChefSubmission(null);
                  }}
                  onReject={async (notes) => {
                    if (!selectedChefSubmission) return;
                    setIsProcessingChefSubmission(true);
                    await rejectChefSubmission(
                      selectedChefSubmission.id,
                      notes,
                    );
                    await reloadChefData();
                    setIsProcessingChefSubmission(false);
                    const subName = selectedChefSubmission.name;
                    const cName = selectedChefSubmission.chefName;
                    setChefSubmissionModalVisible(false);
                    setSelectedChefSubmission(null);
                    showInAppAlert(
                      'Recipe Rejected',
                      `"${subName}" has been rejected with feedback sent to ${cName}.`,
                    );
                  }}
                  onPublish={async (pubPrice, storageCentres, cities, customRegions, subRegions) => {
                    if (!selectedChefSubmission) return;
                    setIsProcessingChefSubmission(true);
                    const regions =
                      customRegions && customRegions.length > 0
                        ? customRegions
                        : storageCentres.length > 0
                        ? [
                            ...new Set(
                              STORAGE_CENTRE_REGIONS.filter((r) =>
                                storageCentres.includes(r.id),
                              ).map((r) => r.zone),
                            ),
                          ]
                        : ['North', 'South', 'West', 'East'];
                    const res = await publishChefSubmission(
                      selectedChefSubmission.id,
                      pubPrice,
                      regions,
                      storageCentres,
                      cities,
                      undefined,
                      subRegions,
                    );
                    if (res.kit) {
                      addMealKit(res.kit as MealKit);
                    }
                    setKits(getMealKits());
                    await reloadChefData();
                    setIsProcessingChefSubmission(false);
                    const subName = selectedChefSubmission.name;
                    const cName = selectedChefSubmission.chefName;
                    setChefSubmissionModalVisible(false);
                    setSelectedChefSubmission(null);
                    showInAppAlert(
                      'Recipe Published',
                      `"${subName}" by ${cName} is now live at Rs. ${pubPrice} and added to the meal kit database.`,
                    );
                  }}
                />
              )}
            </Modal>

            {/* Grant Chef Role Modal */}
            <Modal
              visible={grantChefModalVisible}
              animationType="slide"
              presentationStyle="pageSheet"
              onRequestClose={() => setGrantChefModalVisible(false)}
            >
              <View style={{ flex: 1, backgroundColor: colors.bgSurface, padding: 20 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                  }}
                >
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.textPrimary }}>
                    Grant Chef Role
                  </Text>
                  <TouchableOpacity onPress={() => setGrantChefModalVisible(false)}>
                    <Icon name="close" size={22} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    fontSize: 14,
                    color: colors.textSecondary,
                    marginBottom: 20,
                    lineHeight: 22,
                  }}
                >
                  To grant the chef role, go to the Users tab and select a registered customer.
                  Their account will be upgraded to a Chef and they will see the Chef Studio tab
                  after their next login.
                </Text>
                {/* Users list to pick from */}
                {users.length === 0 ? (
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    No registered customers found.
                  </Text>
                ) : (
                  users.map((u) => (
                    <View
                      key={u.id}
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingVertical: 14,
                        borderBottomWidth: 1,
                        borderBottomColor: colors.borderLight,
                      }}
                    >
                      <View>
                        <Text
                          style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}
                        >
                          {u.name}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.textMuted }}>{u.email}</Text>
                      </View>
                      <TouchableOpacity
                        style={{
                          backgroundColor: colors.primaryLight,
                          borderRadius: radii.md,
                          paddingHorizontal: 14,
                          paddingVertical: 8,
                        }}
                        onPress={async () => {
                          const result = await grantChefRole(
                            u.id,
                            u.email || '',
                            u.name,
                            user?.email || 'admin',
                          );
                          if (result.success) {
                            reloadChefData();
                            setGrantChefModalVisible(false);
                            showInAppAlert(
                              'Chef Role Granted',
                              `${u.name} is now an approved chef. They will see the Chef Studio tab after their next login.`,
                            );
                          } else {
                            Alert.alert('Error', result.error || 'Could not grant chef role.');
                          }
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary }}>
                          Make Chef
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
            </Modal>
          </View>
        )}

        {/* MODULE 8: REVIEWS MODERATION */}
        {activeTab === 'reviews' && (
          <View>
            <View style={styles.moduleHeaderRow}>
              <View>
                <Text style={[styles.moduleTitle, { color: colors.textPrimary }]}>
                  Customer Reviews ({moderationReviews.length})
                </Text>
                <Text style={[styles.moduleSubtitle, { color: colors.textSecondary }]}>
                  Moderation queue for meal kit ratings and feedback
                </Text>
              </View>
            </View>

            {moderationReviews.length === 0 ? (
              <View
                style={[
                  styles.emptyStateCard,
                  {
                    backgroundColor: colors.bgSurface,
                    borderColor: colors.borderLight,
                    borderRadius: radii.xl,
                  },
                ]}
              >
                <Text style={[styles.emptyStateTitle, { color: colors.textPrimary }]}>
                  No Pending Reviews
                </Text>
                <Text style={[styles.emptyStateSubtitle, { color: colors.textSecondary }]}>
                  All customer reviews have been reviewed.
                </Text>
              </View>
            ) : (
              moderationReviews.map((rev) => (
                <View
                  key={rev.id}
                  style={[
                    styles.reviewModCard,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: rev.status === 'flagged' ? colors.danger : colors.borderLight,
                      borderRadius: radii.xl,
                      borderWidth: rev.status === 'flagged' ? 2 : 1,
                      ...shadows.card,
                    },
                  ]}
                >
                  <View style={styles.reviewModTop}>
                    <View>
                      <Text style={[styles.reviewKitName, { color: colors.textPrimary }]}>
                        {rev.mealKitName}
                      </Text>
                      <View
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}
                      >
                        <Text style={[styles.reviewAuthor, { color: colors.textSecondary }]}>
                          {rev.userName} ({rev.userCity}) •
                        </Text>
                        <Icon name="star" size={12} color="#EAB308" />
                        <Text style={[styles.reviewAuthor, { color: colors.textSecondary }]}>
                          {rev.rating}
                        </Text>
                      </View>
                    </View>
                    <Badge
                      label={rev.status.toUpperCase()}
                      variant={
                        rev.status === 'approved'
                          ? 'success'
                          : rev.status === 'flagged'
                            ? 'warning'
                            : 'danger'
                      }
                    />
                  </View>

                  <Text style={[styles.reviewCommentText, { color: colors.textPrimary }]}>
                    "{rev.comment}"
                  </Text>

                  {rev.reportReason && (
                    <Text style={[styles.flaggedReason, { color: colors.danger }]}>
                      Flag reason: {rev.reportReason}
                    </Text>
                  )}

                  <View style={styles.reviewActionRow}>
                    <Button
                      title="Approve Review"
                      variant="outline"
                      size="sm"
                      style={{ marginRight: 8 }}
                      onPress={() => {
                        moderateReview(rev.id, 'approved');
                        setModerationReviews(getAllReviewsForModeration());
                      }}
                    />
                    <Button
                      title="Hide Review"
                      variant="danger"
                      size="sm"
                      onPress={() => {
                        moderateReview(rev.id, 'hidden');
                        setModerationReviews(getAllReviewsForModeration());
                      }}
                    />
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* MODULE 9: WALLETS MANAGEMENT */}
        {activeTab === 'wallets' && <AdminWalletsManagementView />}

        {/* MODULE 10: REFERRALS ENGINE */}
        {activeTab === 'referrals' && <AdminReferralsManagementView />}
      </ScrollView>

      {/* REFUND MODAL */}
      <Modal visible={refundModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>
              Issue Order Refund
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Order {refundOrder?.id} • Original Total: ₹{refundOrder?.totalAmount}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Refund Amount (₹)
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              value={refundAmount}
              onChangeText={setRefundAmount}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Reason for Refund
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              value={refundReason}
              onChangeText={setRefundReason}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>
              Refund Destination
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <TouchableOpacity
                style={[
                  {
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    alignItems: 'center',
                    backgroundColor: refundMethod === 'WALLET' ? colors.primaryLight + '30' : colors.bgSubtle,
                    borderColor: refundMethod === 'WALLET' ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => setRefundMethod('WALLET')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: refundMethod === 'WALLET' ? colors.primary : colors.textPrimary }}>
                  ⚡ Rasoi Wallet Credits
                </Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                  Instant • Never Expires
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  {
                    flex: 1,
                    paddingVertical: 10,
                    paddingHorizontal: 8,
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    alignItems: 'center',
                    backgroundColor: refundMethod === 'ORIGINAL_PAYMENT' ? colors.primaryLight + '30' : colors.bgSubtle,
                    borderColor: refundMethod === 'ORIGINAL_PAYMENT' ? colors.primary : colors.borderLight,
                  },
                ]}
                onPress={() => setRefundMethod('ORIGINAL_PAYMENT')}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: refundMethod === 'ORIGINAL_PAYMENT' ? colors.primary : colors.textPrimary }}>
                  💳 Original Payment
                </Text>
                <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                  Gateway (5-7 days)
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
                onPress={() => setRefundModalVisible(false)}
                disabled={isProcessingRefund}
              />
              <Button
                title={isProcessingRefund ? 'Processing...' : 'Confirm Refund'}
                variant="danger"
                style={{ flex: 1 }}
                loading={isProcessingRefund}
                disabled={isProcessingRefund}
                onPress={handleExecuteRefund}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* CANCEL ORDER CONFIRMATION MODAL */}
      <Modal
        visible={cancelOrderModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCancelOrderModalVisible(false);
          setOrderToCancel(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.modalHeading, { color: '#DC2626' }]}>Cancel Order</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              {orderToCancel ? `Order ID: ${orderToCancel}` : ''}
            </Text>

            <Text
              style={{
                fontSize: 13,
                color: colors.textSecondary,
                lineHeight: 18,
                marginTop: 8,
                marginBottom: 14,
              }}
            >
              Are you sure you want to cancel this order? This will mark the order as Cancelled and
              remove it from active kitchen prep.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Cancellation Reason
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason (e.g. Cancelled by Admin, Out of Stock)"
              placeholderTextColor={colors.textMuted}
            />

            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <Button
                title="Keep Order"
                variant="secondary"
                style={{ flex: 1 }}
                onPress={() => {
                  setCancelOrderModalVisible(false);
                  setOrderToCancel(null);
                }}
              />
              <Button
                title="Confirm Cancel"
                variant="danger"
                style={{ flex: 1 }}
                onPress={handleConfirmCancelOrder}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE MEAL KIT CONFIRMATION MODAL */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isDeletingKit) {
            setDeleteModalVisible(false);
            setKitToDelete(null);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: '#FEE2E2',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 10,
                }}
              >
                <Icon name="trash" size={24} color="#DC2626" />
              </View>
              <Text style={[styles.modalHeading, { color: '#DC2626', textAlign: 'center' }]}>
                Delete Meal Kit
              </Text>
            </View>

            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: colors.textPrimary,
                textAlign: 'center',
                lineHeight: 22,
                marginTop: 4,
                marginBottom: 12,
              }}
            >
              Are you sure you want to delete this meal kit?
            </Text>

            {kitToDelete ? (
              <View
                style={{
                  backgroundColor: colors.bgSubtle,
                  padding: 12,
                  borderRadius: radii.md,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 14, color: colors.textPrimary }}>
                  {kitToDelete.name}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {kitToDelete.cuisine} • {kitToDelete.diet.toUpperCase()} • ₹{kitToDelete.price}
                </Text>
              </View>
            ) : null}

            <Text
              style={{
                fontSize: 12,
                color: colors.textMuted,
                textAlign: 'center',
                marginBottom: 16,
              }}
            >
              This will permanently delete the recipe from your catalog and fulfillment inventory.
            </Text>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button
                title="Cancel"
                variant="secondary"
                disabled={isDeletingKit}
                style={{ flex: 1 }}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setKitToDelete(null);
                }}
              />
              <Button
                title={isDeletingKit ? 'Deleting...' : 'Delete'}
                variant="danger"
                disabled={isDeletingKit}
                loading={isDeletingKit}
                style={{ flex: 1 }}
                onPress={handleConfirmDeleteKit}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* INSPECT ORDER DETAILS MODAL */}
      <Modal
        visible={inspectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setInspectModalVisible(false);
          setInspectOrder(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.orderDetailModalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 16,
              }}
            >
              <View>
                <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>
                  Order Inspection
                </Text>
                <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                  {inspectOrder?.id} • Placed{' '}
                  {inspectOrder?.createdAt
                    ? new Date(inspectOrder.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'recently'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setInspectModalVisible(false);
                  setInspectOrder(null);
                }}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: colors.bgSubtle,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Icon name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={true}>
              {inspectOrder && (
                <View>
                  {/* Customer & Delivery Section */}
                  <View
                    style={{
                      backgroundColor: colors.bgSubtle,
                      borderRadius: radii.lg,
                      padding: 12,
                      marginBottom: 14,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        marginBottom: 8,
                      }}
                    >
                      <Icon name="people" size={14} color={colors.textPrimary} />
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '800',
                          color: colors.textPrimary,
                        }}
                      >
                        Customer & Delivery Details
                      </Text>
                    </View>
                    <View style={{ gap: 4 }}>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Customer:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          {inspectOrder.customerName}
                        </Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Phone:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          {inspectOrder.customerPhone}
                        </Text>
                        {inspectOrder.customerEmail ? (
                          <Text style={{ fontWeight: '400', color: colors.textMuted }}>
                            {' '}
                            • {inspectOrder.customerEmail}
                          </Text>
                        ) : null}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Delivery Address:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          {inspectOrder.deliveryAddress}{' '}
                          {inspectOrder.addressTag ? `[${inspectOrder.addressTag}]` : ''}
                        </Text>
                      </Text>
                      {(() => {
                        const sc = resolveStorageCentre(inspectOrder.deliveryAddress);
                        return (
                          <View
                            style={{
                              marginTop: 6,
                              marginBottom: 4,
                              padding: 8,
                              backgroundColor: colors.bgSurface,
                              borderRadius: radii.sm,
                              borderLeftWidth: 3,
                              borderLeftColor: colors.primary,
                            }}
                          >
                            <Text
                              style={{ fontSize: 11, fontWeight: '800', color: colors.primary }}
                            >
                              Fulfillment Storage Centre:
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: colors.textPrimary,
                                marginTop: 2,
                              }}
                            >
                              {sc.storageCentreName} ({sc.name}, {sc.city})
                            </Text>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                              Depot: {sc.storageCentreAddress}
                            </Text>
                          </View>
                        );
                      })()}
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Slot:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          {inspectOrder.deliveryDate || 'Today'} • {inspectOrder.deliverySlot}
                        </Text>
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '700' }}>
                        Payment:{' '}
                        <Text style={{ fontWeight: '400', color: colors.textSecondary }}>
                          {inspectOrder.paymentMethod} • Status:{' '}
                          {inspectOrder.paymentStatus || 'Paid'} (Txn:{' '}
                          {inspectOrder.transactionId || inspectOrder.id})
                        </Text>
                      </Text>
                    </View>
                  </View>

                  {/* Dishes & Meal Kits Section */}
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Icon name="restaurant" size={16} color={colors.textPrimary} />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '800',
                          color: colors.textPrimary,
                        }}
                      >
                        Dishes & Customizations ({inspectOrder.items?.length || 0})
                      </Text>
                    </View>
                    {inspectOrder.items && inspectOrder.items.length > 0 && (
                      <Button
                        title="Print Recipe Cards"
                        variant="outline"
                        size="sm"
                        onPress={() => {
                          const item = inspectOrder.items?.[0];
                          if (!item) return;
                          const matchedKit =
                            kits.find(
                              (k) =>
                                k.name.toLowerCase() === item.name.toLowerCase() ||
                                k.id === item.id,
                            ) ||
                            kits[0] ||
                            null;
                          setPrintCardKit(matchedKit);
                          setPrintCardModalVisible(true);
                        }}
                      />
                    )}
                  </View>

                  {!inspectOrder.items || inspectOrder.items.length === 0 ? (
                    <Text
                      style={{
                        fontSize: 12,
                        color: colors.textMuted,
                        fontStyle: 'italic',
                        marginBottom: 12,
                      }}
                    >
                      No items recorded for this order.
                    </Text>
                  ) : (
                    inspectOrder.items.map((item, index) => (
                      <View
                        key={item.id || index}
                        style={{
                          backgroundColor: colors.bgSurface,
                          borderRadius: radii.lg,
                          padding: 14,
                          marginBottom: 10,
                          borderWidth: 1.5,
                          borderColor: colors.borderLight,
                          ...shadows.card,
                        }}
                      >
                        {/* Item Name & Quantity & Price */}
                        <View
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                          }}
                        >
                          <View style={{ flex: 1, marginRight: 8 }}>
                            <Text
                              style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary }}
                            >
                              {item.name}
                            </Text>
                            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                              ₹{item.price} each × {item.quantity} kit{item.quantity > 1 ? 's' : ''}
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                const matchedKit =
                                  kits.find(
                                    (k) =>
                                      k.name.toLowerCase() === item.name.toLowerCase() ||
                                      k.id === item.id,
                                  ) ||
                                  kits[0] ||
                                  null;
                                setPrintCardKit(matchedKit);
                                setPrintCardModalVisible(true);
                              }}
                              style={{
                                marginTop: 6,
                                alignSelf: 'flex-start',
                                backgroundColor: '#FFF7ED',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#FED7AA',
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Icon name="document-text" size={12} color={colors.primary} />
                              <Text
                                style={{ fontSize: 11, fontWeight: '700', color: colors.primary }}
                              >
                                Print Recipe Card for Box Package
                              </Text>
                            </TouchableOpacity>
                          </View>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.primary }}>
                            ₹{item.price * item.quantity}
                          </Text>
                        </View>

                        {/* Customization Details Grid */}
                        <View
                          style={{
                            marginTop: 10,
                            paddingTop: 10,
                            borderTopWidth: 1,
                            borderTopColor: colors.borderLight,
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          {/* Serving Size Badge */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: colors.bgSubtle,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: radii.md,
                              borderWidth: 1,
                              borderColor: colors.borderLight,
                            }}
                          >
                            <Text
                              style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}
                            >
                              Serving Size:
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '700',
                                color: colors.primary,
                                marginLeft: 4,
                              }}
                            >
                              {item.servings || 2} Persons
                            </Text>
                          </View>

                          {/* Spice Level Badge */}
                          <View
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: (item.spiceLevel || '')
                                .toLowerCase()
                                .includes('mild')
                                ? '#ECFDF5'
                                : (item.spiceLevel || '').toLowerCase().includes('spicy')
                                  ? '#FEF2F2'
                                  : '#FFFBEB',
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                              borderRadius: radii.md,
                              borderWidth: 1,
                              borderColor: (item.spiceLevel || '').toLowerCase().includes('mild')
                                ? '#A7F3D0'
                                : (item.spiceLevel || '').toLowerCase().includes('spicy')
                                  ? '#FCA5A5'
                                  : '#FDE68A',
                              gap: 4,
                            }}
                          >
                            <Icon
                              name="flame"
                              size={12}
                              color={
                                (item.spiceLevel || '').toLowerCase().includes('mild')
                                  ? '#065F46'
                                  : (item.spiceLevel || '').toLowerCase().includes('spicy')
                                    ? '#991B1B'
                                    : '#92400E'
                              }
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: '800',
                                color: (item.spiceLevel || '').toLowerCase().includes('mild')
                                  ? '#065F46'
                                  : (item.spiceLevel || '').toLowerCase().includes('spicy')
                                    ? '#991B1B'
                                    : '#92400E',
                              }}
                            >
                              Spice Level: {item.spiceLevel || 'Medium'}
                            </Text>
                          </View>
                        </View>

                        {/* Masala Sachets Included */}
                        <View style={{ marginTop: 10 }}>
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: '800',
                              color: colors.textMuted,
                              textTransform: 'uppercase',
                              marginBottom: 4,
                            }}
                          >
                            Masala Sachets & Prep Packs:
                          </Text>
                          {item.masalaSachets && item.masalaSachets.length > 0 ? (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {item.masalaSachets.map((sachet, sIdx) => (
                                <View
                                  key={sIdx}
                                  style={{
                                    backgroundColor: colors.bgSubtle,
                                    paddingHorizontal: 8,
                                    paddingVertical: 3,
                                    borderRadius: radii.sm,
                                    borderWidth: 1,
                                    borderColor: colors.borderLight,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <Icon name="sparkles" size={10} color={colors.primary} />
                                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                                    {sachet}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          ) : (
                            <Text
                              style={{
                                fontSize: 11,
                                color: colors.textSecondary,
                                fontStyle: 'italic',
                              }}
                            >
                              Standard Chef Spice Pack
                            </Text>
                          )}
                        </View>
                      </View>
                    ))
                  )}

                  {/* Financial Bill Breakdown */}
                  <View
                    style={{
                      backgroundColor: colors.bgSubtle,
                      borderRadius: radii.lg,
                      padding: 12,
                      marginTop: 6,
                      marginBottom: 12,
                      borderWidth: 1,
                      borderColor: colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color: colors.textPrimary,
                        marginBottom: 6,
                      }}
                    >
                      Bill Summary
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 3,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>Subtotal</Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '600' }}>
                        ₹{inspectOrder.subtotal}
                      </Text>
                    </View>
                    {inspectOrder.discount ? (
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          marginBottom: 3,
                        }}
                      >
                        <Text style={{ fontSize: 12, color: '#16A34A' }}>
                          Discount {inspectOrder.couponCode ? `(${inspectOrder.couponCode})` : ''}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#16A34A', fontWeight: '700' }}>
                          -₹{inspectOrder.discount}
                        </Text>
                      </View>
                    ) : null}
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginBottom: 3,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                        Delivery Fee
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textPrimary, fontWeight: '600' }}>
                        {inspectOrder.deliveryFee === 0 ? 'FREE' : `₹${inspectOrder.deliveryFee}`}
                      </Text>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        marginTop: 6,
                        paddingTop: 6,
                        borderTopWidth: 1,
                        borderTopColor: colors.borderLight,
                      }}
                    >
                      <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>
                        Total Amount
                      </Text>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: colors.primary }}>
                        ₹{inspectOrder.totalAmount}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Actions Footer */}
            {inspectOrder && (
              <View
                style={{
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: colors.borderLight,
                  flexDirection: 'row',
                  gap: 8,
                }}
              >
                {inspectOrder.status === 'Placed' &&
                !inspectOrder.isApproved &&
                !isOrderApproved(inspectOrder.id) ? (
                  <>
                    <Button
                      title="Approve Order"
                      variant="primary"
                      size="sm"
                      style={{ flex: 1, backgroundColor: '#16A34A' }}
                      onPress={async () => {
                        await handleApproveOrder(inspectOrder.id);
                        setInspectOrder((prev) =>
                          prev ? { ...prev, status: 'Confirmed', isApproved: true } : null,
                        );
                      }}
                    />
                    <Button
                      title="Reject / Cancel"
                      variant="outline"
                      size="sm"
                      style={{ borderColor: '#DC2626', flex: 1 }}
                      textStyle={{ color: '#DC2626' }}
                      onPress={() => {
                        setInspectModalVisible(false);
                        handleCancelOrder(inspectOrder.id);
                      }}
                    />
                  </>
                ) : (
                  <>
                    <Button
                      title="Print Recipe Card"
                      variant="primary"
                      size="sm"
                      style={{ flex: 1, marginRight: 6 }}
                      onPress={() => {
                        const firstItem = inspectOrder.items?.[0];
                        const matched =
                          (firstItem &&
                            kits.find(
                              (k) => k.name.toLowerCase() === firstItem.name.toLowerCase(),
                            )) ||
                          kits[0] ||
                          null;
                        setPrintCardKit(matched);
                        setPrintCardModalVisible(true);
                      }}
                    />
                    <Button
                      title="View Invoice"
                      variant="outline"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => Alert.alert('Invoice', generateInvoiceText(inspectOrder))}
                    />
                    {inspectOrder.status !== 'Cancelled' &&
                      inspectOrder.status !== 'Delivered' &&
                      inspectOrder.status !== 'Refunded' && (
                        <Button
                          title="Cancel Order"
                          variant="outline"
                          size="sm"
                          style={{ borderColor: '#DC2626', flex: 1 }}
                          textStyle={{ color: '#DC2626' }}
                          onPress={() => {
                            setInspectModalVisible(false);
                            handleCancelOrder(inspectOrder.id);
                          }}
                        />
                      )}
                    <Button
                      title="Close"
                      variant="secondary"
                      size="sm"
                      style={{ minWidth: 70 }}
                      onPress={() => {
                        setInspectModalVisible(false);
                        setInspectOrder(null);
                      }}
                    />
                  </>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* CHEF FRIENDLY ADD / EDIT MEAL KIT WIZARD */}
      <AddMealKitWizardModal
        visible={kitModalVisible}
        onClose={() => {
          setKitModalVisible(false);
          setEditingKit(null);
        }}
        initialKit={editingKit}
        onSaveKit={async (savedKit) => {
          if (editingKit) {
            updateMealKit(editingKit.id, savedKit);
          } else {
            addMealKit(savedKit);
          }
          try {
            await saveMealKitToSupabase(savedKit, true);
          } catch (err) {
            console.warn('[Admin] Failed saving meal kit to Supabase:', err);
          }
          setKits(getMealKits());
          setKitModalVisible(false);
          setEditingKit(null);
        }}
      />

      {/* REGIONAL ADMIN ASSIGNMENT MODAL (SUPER ADMIN ONLY) */}
      <Modal visible={adminModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                maxWidth: 480,
                ...shadows.card,
              },
            ]}
          >
            <View style={{ marginBottom: 4 }}>
              <Text style={[styles.modalHeading, { color: colors.textPrimary, marginBottom: 0 }]}>
                {adminProfiles.some(
                  (a) => a.email.toLowerCase() === adminFormEmail.trim().toLowerCase(),
                )
                  ? 'Edit Regional Admin Access'
                  : 'Assign New Regional Admin'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16 }}>
              Admins and regions have a many-to-many relationship. One admin can manage several
              regions, and one region can have several admins.
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Staff Admin Email
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="e.g. karthik.raman@mulyam.in"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={adminFormEmail}
              onChangeText={setAdminFormEmail}
              editable={
                !adminProfiles.some(
                  (a) =>
                    a.email.toLowerCase() === adminFormEmail.trim().toLowerCase() &&
                    a.role === 'super_admin',
                )
              }
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Staff Name</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="e.g. Karthik Raman"
              placeholderTextColor={colors.textMuted}
              value={adminFormName}
              onChangeText={setAdminFormName}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Admin Role</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              <TouchableOpacity
                onPress={() => setAdminFormRole('regional_admin')}
                style={[
                  {
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    backgroundColor:
                      adminFormRole === 'regional_admin' ? colors.primary : colors.bgSubtle,
                    borderColor:
                      adminFormRole === 'regional_admin' ? colors.primary : colors.borderLight,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  },
                ]}
              >
                <Text
                  style={{
                    color: adminFormRole === 'regional_admin' ? '#fff' : colors.textPrimary,
                    fontWeight: '700',
                    fontSize: 12,
                  }}
                >
                  Regional Admin
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAdminFormRole('super_admin')}
                style={[
                  {
                    borderRadius: radii.pill,
                    borderWidth: 1,
                    backgroundColor: adminFormRole === 'super_admin' ? '#F59E0B' : colors.bgSubtle,
                    borderColor: adminFormRole === 'super_admin' ? '#F59E0B' : colors.borderLight,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                  },
                ]}
              >
                <Text
                  style={{
                    color: adminFormRole === 'super_admin' ? '#fff' : colors.textPrimary,
                    fontWeight: '700',
                    fontSize: 12,
                  }}
                >
                  Super Admin (All Regions)
                </Text>
              </TouchableOpacity>
            </View>

            {adminFormRole === 'regional_admin' && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                  Assigned Micro-Regions & Storage Centres (Many-to-Many)
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 8 }}>
                  Select the local storage centre regions this admin oversees. Meal kits are
                  dispatched to customers based on these regional boundaries:
                </Text>

                <ScrollView
                  style={{ maxHeight: 280, marginBottom: 14 }}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {/* Grouped by City */}
                  {Array.from(new Set(STORAGE_CENTRE_REGIONS.map((r) => r.city))).map(
                    (cityName) => {
                      const cityRegions = STORAGE_CENTRE_REGIONS.filter((r) => r.city === cityName);
                      const allSelectedForCity = cityRegions.every((r) =>
                        adminFormRegions.includes(r.id),
                      );
                      return (
                        <View
                          key={cityName}
                          style={{
                            marginBottom: 10,
                            backgroundColor: colors.bgSubtle,
                            borderRadius: radii.md,
                            padding: 10,
                            borderWidth: 1,
                            borderColor: colors.borderLight,
                          }}
                        >
                          <View
                            style={{
                              flexDirection: 'row',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: 6,
                              paddingBottom: 4,
                              borderBottomWidth: 1,
                              borderBottomColor: colors.borderLight,
                            }}
                          >
                            <Text
                              style={{ fontSize: 12, fontWeight: '800', color: colors.textPrimary }}
                            >
                              {cityName} ({cityRegions.length} Storage Centres)
                            </Text>
                            <TouchableOpacity
                              onPress={() => {
                                if (allSelectedForCity) {
                                  setAdminFormRegions((prev) =>
                                    prev.filter((id) => !cityRegions.some((cr) => cr.id === id)),
                                  );
                                } else {
                                  setAdminFormRegions((prev) => [
                                    ...prev,
                                    ...cityRegions
                                      .map((cr) => cr.id)
                                      .filter((id) => !prev.includes(id)),
                                  ]);
                                }
                              }}
                            >
                              <Text
                                style={{ fontSize: 11, color: colors.primary, fontWeight: '700' }}
                              >
                                {allSelectedForCity ? 'Deselect All' : 'Select All'}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <View style={{ gap: 6 }}>
                            {cityRegions.map((reg) => {
                              const isSelected = adminFormRegions.includes(reg.id);
                              return (
                                <TouchableOpacity
                                  key={reg.id}
                                  onPress={() => {
                                    setAdminFormRegions((prev) =>
                                      prev.includes(reg.id)
                                        ? prev.length > 1
                                          ? prev.filter((r) => r !== reg.id)
                                          : prev
                                        : [...prev, reg.id],
                                    );
                                  }}
                                  style={{
                                    borderRadius: radii.sm,
                                    borderWidth: 1,
                                    backgroundColor: isSelected
                                      ? colors.primary + '18'
                                      : colors.bgSurface,
                                    borderColor: isSelected ? colors.primary : colors.borderLight,
                                    padding: 8,
                                  }}
                                >
                                  <View
                                    style={{
                                      flexDirection: 'row',
                                      justifyContent: 'space-between',
                                      alignItems: 'center',
                                    }}
                                  >
                                    <Text
                                      style={{
                                        color: isSelected ? colors.primary : colors.textPrimary,
                                        fontWeight: '700',
                                        fontSize: 12,
                                      }}
                                    >
                                      {reg.name}
                                    </Text>
                                    <Badge
                                      label={isSelected ? 'ASSIGNED' : 'UNASSIGNED'}
                                      variant={isSelected ? 'success' : 'neutral'}
                                      size="sm"
                                    />
                                  </View>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      color: colors.textSecondary,
                                      marginTop: 2,
                                      fontWeight: '500',
                                    }}
                                  >
                                    Depot: {reg.storageCentreName}
                                  </Text>
                                  <Text
                                    style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}
                                  >
                                    Areas: {reg.coverageAreas.slice(0, 5).join(', ')}
                                    {reg.coverageAreas.length > 5 ? '...' : ''}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </View>
                      );
                    },
                  )}

                  {/* Macro Region Zones Option */}
                  <View
                    style={{
                      marginTop: 6,
                      paddingTop: 8,
                      borderTopWidth: 1,
                      borderTopColor: colors.borderLight,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: '700',
                        color: colors.textMuted,
                        marginBottom: 6,
                      }}
                    >
                      Macro-Zone Access (Optional):
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {(['North', 'South', 'West', 'East'] as RegionHub[]).map((zone) => {
                        const isSelected = adminFormRegions.includes(zone);
                        return (
                          <TouchableOpacity
                            key={zone}
                            onPress={() => {
                              setAdminFormRegions((prev) =>
                                prev.includes(zone)
                                  ? prev.length > 1
                                    ? prev.filter((r) => r !== zone)
                                    : prev
                                  : [...prev, zone],
                              );
                            }}
                            style={{
                              borderRadius: radii.pill,
                              borderWidth: 1,
                              backgroundColor: isSelected ? colors.primary : colors.bgSubtle,
                              borderColor: isSelected ? colors.primary : colors.borderLight,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                            }}
                          >
                            <Text
                              style={{
                                color: isSelected ? '#fff' : colors.textPrimary,
                                fontWeight: '700',
                                fontSize: 11,
                              }}
                            >
                              Entire {zone} Hub
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </ScrollView>
              </>
            )}

            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
                onPress={() => setAdminModalVisible(false)}
              />
              <Button
                title={isSavingAdmin ? 'Saving...' : 'Save Permissions'}
                loading={isSavingAdmin}
                style={{ flex: 1.4 }}
                onPress={handleSaveAdmin}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD COUPON MODAL */}
      <Modal visible={couponModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Create Coupon</Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Coupon Code (e.g. DIWALI100)"
              autoCapitalize="characters"
              value={newCouponCode}
              onChangeText={setNewCouponCode}
            />

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Flat Discount Amount (₹)"
              value={newCouponDiscount}
              onChangeText={setNewCouponDiscount}
              keyboardType="numeric"
            />

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Minimum Order Value (₹)"
              value={newCouponMinOrder}
              onChangeText={setNewCouponMinOrder}
              keyboardType="numeric"
            />

            <View style={{ flexDirection: 'row', marginTop: 14 }}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
                onPress={() => setCouponModalVisible(false)}
              />
              <Button
                title="Create Promo Code"
                style={{ flex: 1.4 }}
                onPress={() => {
                  if (!newCouponCode.trim()) return;
                  addCoupon({
                    code: newCouponCode.trim().toUpperCase(),
                    type: 'flat',
                    discountValue: parseInt(newCouponDiscount) || 100,
                    minOrderValue: parseInt(newCouponMinOrder) || 499,
                    description: `Flat ₹${newCouponDiscount} off on orders above ₹${newCouponMinOrder}`,
                    expiryDate: '2026-12-31',
                    isActive: true,
                  });
                  setCoupons(getCoupons());
                  setCouponModalVisible(false);
                  Alert.alert('Coupon Created', `${newCouponCode} is now live.`);
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* ISSUE CUSTOMER CREDITS MODAL */}
      <Modal
        visible={sendCreditsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSendCreditsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <Text style={[styles.modalHeading, { color: colors.primary }]}>
              Issue Customer Credits
            </Text>
            {selectedCreditCustomer && (
              <View style={{ marginBottom: 14 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>
                  {selectedCreditCustomer.name}
                </Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: colors.bgSubtle,
                    borderColor: colors.borderLight,
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: radii.sm,
                    marginTop: 4,
                  }}
                >
                  <Icon name="document" size={12} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: '700', color: colors.primary }}>
                    Customer ID: {selectedCreditCustomer.id}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                  Current Balance: ₹{Math.round(selectedCreditCustomer.walletBalance ?? 0).toLocaleString('en-IN')}
                </Text>
              </View>
            )}

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Credit Amount (₹)
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              value={creditSendAmount}
              onChangeText={setCreditSendAmount}
              placeholder="e.g. 150"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>
              Credit Category
            </Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              {(['PROMOTION', 'ADMIN_ADJUSTMENT', 'LOYALTY'] as const).map((src) => (
                <TouchableOpacity
                  key={src}
                  style={{
                    flex: 1,
                    paddingVertical: 8,
                    borderRadius: radii.md,
                    borderWidth: 1.5,
                    alignItems: 'center',
                    backgroundColor: creditSendSource === src ? colors.primaryLight + '30' : colors.bgSubtle,
                    borderColor: creditSendSource === src ? colors.primary : colors.borderLight,
                  }}
                  onPress={() => setCreditSendSource(src)}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: creditSendSource === src ? colors.primary : colors.textPrimary,
                    }}
                  >
                    {src === 'PROMOTION' ? 'Promotion' : src === 'LOYALTY' ? 'Loyalty' : 'Adjustment'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
              Reason / Description
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              value={creditSendDescription}
              onChangeText={setCreditSendDescription}
              placeholder="e.g. Customer loyalty bonus"
              placeholderTextColor={colors.textMuted}
            />

            <View style={{ flexDirection: 'row', marginTop: 16 }}>
              <Button
                title="Cancel"
                variant="secondary"
                style={{ flex: 1, marginRight: 8 }}
                onPress={() => setSendCreditsModalVisible(false)}
                disabled={isSubmittingCreditSend}
              />
              <Button
                title={isSubmittingCreditSend ? 'Crediting...' : 'Confirm & Credit'}
                variant="primary"
                style={{ flex: 1.5 }}
                loading={isSubmittingCreditSend}
                disabled={isSubmittingCreditSend}
                onPress={handleConfirmSendCredits}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* 2-SIDED MEAL KIT RECIPE CARD PRINT MODAL */}
      {printCardKit && (
        <RecipeCardPrintModal
          visible={printCardModalVisible}
          onClose={() => {
            setPrintCardModalVisible(false);
            setPrintCardKit(null);
          }}
          kit={printCardKit}
          orderId={inspectOrder?.id}
          customerName={inspectOrder?.customerName}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 45,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  adminPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  logoutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '700',
  },
  adminUserEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 90,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  crossTabFilterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  statusFilterRow: {
    marginBottom: 12,
  },
  statusFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  adminOrderCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  adminOrderId: {
    fontSize: 15,
    fontWeight: '800',
  },
  adminOrderCustomer: {
    fontSize: 13,
    marginTop: 2,
  },
  adminOrderAddress: {
    fontSize: 13,
    marginVertical: 4,
  },
  adminOrderSlot: {
    fontSize: 12,
    marginBottom: 10,
  },
  orderActionsRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    marginRight: 6,
  },
  orderBottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  actionLink: {
    padding: 4,
  },
  actionLinkText: {
    fontSize: 13,
    fontWeight: '800',
  },
  moduleHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  moduleTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  moduleSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  kitFilterContainer: {
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
  },
  kitSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    marginBottom: 12,
  },
  kitSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    paddingVertical: 0,
  },
  dropdownFiltersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  dropdownContainer: {
    flex: 1,
    minWidth: 140,
    position: 'relative',
  },
  dropdownLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
  },
  dropdownTriggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 6,
  },
  dropdownTriggerText: {
    fontSize: 12,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 66,
    left: 0,
    right: 0,
    borderWidth: 1,
    zIndex: 99999,
    elevation: 99999,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 10px 16px rgba(0, 0, 0, 0.22)',
      },
      default: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.22,
        shadowRadius: 16,
      },
    }),
  },
  dropdownMenuList: {
    maxHeight: 220,
    paddingVertical: 4,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownMenuItemText: {
    fontSize: 12,
    flex: 1,
  },
  filterStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 4,
    borderTopWidth: 1,
  },
  kitsCardsListContainer: {
    position: 'relative',
    zIndex: 1,
    elevation: 1,
  },
  filterStatsText: {
    fontSize: 12,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  clearAllBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  adminKitCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  kitCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  kitCardName: {
    fontSize: 16,
    fontWeight: '800',
  },
  kitCardTag: {
    fontSize: 12,
    marginTop: 2,
  },
  kitCardMeta: {
    fontSize: 12,
    marginTop: 4,
  },
  kitActionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 6,
  },
  stockCard: {
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  stockKitName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  hubsStockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hubStockItem: {
    width: '48%',
    padding: 10,
    alignItems: 'center',
  },
  hubLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  hubCount: {
    fontSize: 15,
    fontWeight: '900',
    marginVertical: 4,
  },
  stockAdjButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  stockAdjBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  stockAdjBtnText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statePill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    marginRight: 8,
  },
  stateDetailCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  stateDetailTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stateName: {
    fontSize: 16,
    fontWeight: '800',
  },
  stateHub: {
    fontSize: 12,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    padding: 10,
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 3,
  },
  topSellingCallout: {
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: '700',
  },
  crossTabCard: {
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  crossTabTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 8,
  },
  crossTabToggleRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  crossTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  crossTabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  crossTabRank: {
    fontSize: 15,
    fontWeight: '900',
    width: 24,
  },
  crossTabName: {
    fontSize: 13,
    fontWeight: '700',
  },
  crossTabCuisine: {
    fontSize: 11,
  },
  crossTabUnits: {
    fontSize: 13,
    fontWeight: '800',
  },
  crossTabShare: {
    fontSize: 11,
    fontWeight: '700',
  },
  userCard: {
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  userTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  userNameText: {
    fontSize: 15,
    fontWeight: '800',
  },
  userEmailText: {
    fontSize: 12,
  },
  userStats: {
    fontSize: 12,
    marginBottom: 10,
  },
  userActionRow: {
    flexDirection: 'row',
  },
  couponCard: {
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  couponTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  couponCodeHeading: {
    fontSize: 16,
    fontWeight: '900',
  },
  couponDesc: {
    fontSize: 13,
    marginBottom: 4,
  },
  couponTerms: {
    fontSize: 11,
    marginBottom: 10,
  },
  couponActionRow: {
    flexDirection: 'row',
  },
  trendCard: {
    padding: 16,
    marginTop: 14,
  },
  trendCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 12,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  trendMonth: {
    width: 38,
    fontSize: 13,
    fontWeight: '700',
  },
  trendBarTrack: {
    flex: 1,
    height: 12,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    marginHorizontal: 10,
    overflow: 'hidden',
  },
  trendBarFill: {
    height: '100%',
  },
  trendRevenue: {
    width: 50,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  reviewModCard: {
    padding: 14,
    marginBottom: 10,
  },
  reviewModTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  reviewKitName: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewAuthor: {
    fontSize: 12,
    marginTop: 2,
  },
  reviewCommentText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginVertical: 6,
  },
  flaggedReason: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  reviewActionRow: {
    flexDirection: 'row',
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  accessDeniedCard: {
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
  },
  accessDeniedIcon: {
    fontSize: 44,
    marginBottom: 12,
  },
  accessDeniedTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 8,
  },
  accessDeniedText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalBox: {
    width: '100%',
    maxWidth: 440,
    padding: 20,
  },
  orderDetailModalBox: {
    width: '100%',
    maxWidth: 580,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 13,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalInput: {
    height: 44,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 13,
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  moduleSectionTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  modulesGrid: {
    gap: 12,
  },
  moduleCard: {
    padding: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  moduleCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  moduleCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  moduleCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  moduleCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  moduleCardArrow: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyStateCard: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    marginVertical: 16,
  },
  emptyStateIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 320,
  },
});
