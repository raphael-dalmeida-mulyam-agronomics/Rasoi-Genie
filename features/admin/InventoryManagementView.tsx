// features/admin/InventoryManagementView.tsx

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { seedInventoryFromMealKits } from '../../framework/services/seedInventoryFromMealKits';
import { useTheme } from '../../framework/theme/ThemeContext';
import {
  InventoryItem,
  InventorySection,
  getInventoryItems,
  addInventoryItem,
  updateInventoryItem,
  restockInventoryItem,
  deleteInventoryItem,
  subscribeToInventory,
  calculateShelfLifeStatus,
  ShelfLifeStatus,
  getDefaultShelfLife,
} from '../../framework/services/inventoryService';
import {
  notifyRegionalAdminsOutOfStock,
  OutOfStockAlertPayload,
} from '../../framework/services/notificationService';
import { Card } from '../../framework/ui/Card';
import { Badge, BadgeVariant, getDietBadgeInfo } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon, AppIconName } from '../../framework/ui/Icon';

const CATEGORY_LABELS: Record<InventorySection, string> = {
  raw_ingredients: 'Raw Ingredients',
  packaging: 'Packaging',
  seasonings: 'Seasonings & Herbs',
};

const CATEGORY_ICONS: Record<InventorySection, AppIconName> = {
  raw_ingredients: 'cube',
  packaging: 'box',
  seasonings: 'sparkles',
};

const CATEGORY_COLORS: Record<InventorySection, string> = {
  raw_ingredients: '#3B82F6',
  packaging: '#10B981',
  seasonings: '#EF4444',
};

export const InventoryManagementView: React.FC = () => {
  const { user, isAdmin, isSuperAdmin, isRegionalAdmin, assignedRegions } = useAuth();
  const { colors, radii, shadows } = useTheme();

  const [items, setItems] = useState<InventoryItem[]>(getInventoryItems());
  const [filter, setFilter] = useState<'all' | 'raw_ingredients' | 'packaging' | 'seasonings'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'fresh' | 'expiring_soon' | 'expired'>('all');
  // Debounced search to reduce lag
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 150);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Modal states
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [restockModalVisible, setRestockModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  // Form states
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);
  const [restockingItem, setRestockingItem] = useState<InventoryItem | null>(null);

  // Add form
  const [newItem, setNewItem] = useState({
    name: '',
    section: 'raw_ingredients' as InventorySection,
    currentStock: 0,
    unit: 'kg',
    shelfLifeDays: 30,
    thresholdLow: 5,
    region: assignedRegions?.[0] || 'West',
    storageCondition: '',
    supplier: '',
    costPerUnit: 0,
    notes: '',
  });

  // Restock form
  const [restockQty, setRestockQty] = useState('');
  const [restockNote, setRestockNote] = useState('');

  // Seed meal-kit ingredients into inventory on load
  useEffect(() => {
    try {
      const added = seedInventoryFromMealKits();
      console.log('[Inventory] Seeded meal-kit ingredients:', added);
      // Refresh items after seed writes to store
      setItems(getInventoryItems());
    } catch (e) { console.error('[Inventory] Seed error:', e); }
    const unsub = subscribeToInventory(() => { setItems(getInventoryItems()); });
    return () => { unsub(); };
  }, [getInventoryItems]);

  const filteredItems = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    const adminRegions = assignedRegions || [];
    const isSuper = isSuperAdmin;
    return items.filter((item) => {
      // Regional admin sees only their region's inventory
      if (!isSuper && adminRegions.length > 0 && item.region) {
        const regionMatch = adminRegions.some(
          (r) => r.toString().toLowerCase() === item.region!.toLowerCase()
        );
        if (!regionMatch) return false;
      }
      if (filter !== 'all') { const s = item.section || (item.name.toLowerCase().includes('sachet') || item.name.toLowerCase().includes('masala') || item.name.toLowerCase().includes('powder') ? 'seasonings' : item.name.toLowerCase().includes('cup') || item.name.toLowerCase().includes('pack') ? 'packaging' : 'raw_ingredients'); if (s !== filter) return false; }
      // Status filter
      const shelfStatus = calculateShelfLifeStatus(item);
      if (statusFilter !== 'all' && shelfStatus.status !== statusFilter) return false;

      // Search
      if (q) {
        const name = item.name || '';
        const n = name.toLowerCase();
        // Exact match first, then substring
        if (n === q || n.includes(q)) return true;
        if ((item.section || '').toLowerCase().includes(q)) return true;
        if (item.notes && item.notes.toLowerCase().includes(q)) return true;
        return false;
      }

      return true;
    });
  }, [items, filter, statusFilter, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = items.length;
    const lowStock = items.filter((i) => i.currentStock <= i.thresholdLow).length;
    const outOfStock = items.filter((i) => i.currentStock === 0).length;
    const expiring = items.filter((i) => calculateShelfLifeStatus(i).status === 'expiring_soon').length;
    const expired = items.filter((i) => calculateShelfLifeStatus(i).status === 'expired').length;
    return { total, lowStock, outOfStock, expiring, expired };
  }, [items]);

  const handleAddItem = () => {
    if (!newItem.name.trim()) {
      Alert.alert('Validation', 'Item name is required.');
      return;
    }
    if (newItem.currentStock < 0 || newItem.shelfLifeDays <= 0) {
      Alert.alert('Validation', 'Stock and shelf life must be positive.');
      return;
    }

    const item = addInventoryItem({
      ...newItem,
      storageCondition: newItem.storageCondition || 'Room temperature',
    });

    // Check if low stock alert needed
    if (item.currentStock <= item.thresholdLow) {
      notifyRegionalAdminsOutOfStock({
        kitId: item.id,
        kitName: item.name,
        region: 'Regional',
        remainingStock: item.currentStock,
        reason: 'Low inventory',
      } as any);
    }

    setNewItem({
      name: '',
      category: 'raw_material',
      currentStock: 0,
      unit: 'kg',
      shelfLifeDays: 30,
      thresholdLow: 5,
      storageCondition: '',
      supplier: '',
      costPerUnit: 0,
      notes: '',
    });
    setAddModalVisible(false);
    Alert.alert('Success', `"${item.name}" added to inventory.`);
  };

  const handleUpdateItem = () => {
    if (!editingItem) return;
    updateInventoryItem(editingItem.id, editingItem);
    setEditModalVisible(false);
    setEditingItem(null);
    Alert.alert('Success', 'Inventory item updated.');
  };

  const handleRestock = () => {
    if (!restockingItem || !restockQty) return;
    const qty = parseFloat(restockQty);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Validation', 'Enter a valid quantity.');
      return;
    }
    restockInventoryItem(restockingItem.id, qty, restockNote);
    setRestockModalVisible(false);
    setRestockingItem(null);
    setRestockQty('');
    setRestockNote('');
    Alert.alert('Success', `Restocked ${qty} ${restockingItem.unit} of "${restockingItem.name}".`);
  };

  const handleDelete = () => {
    if (!deletingItem) return;
    deleteInventoryItem(deletingItem.id);
    setDeleteModalVisible(false);
    setDeletingItem(null);
    Alert.alert('Deleted', `"${deletingItem.name}" removed from inventory.`);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem({ ...item });
    setEditModalVisible(true);
  };

  const openRestockModal = (item: InventoryItem) => {
    setRestockingItem(item);
    setRestockQty(String(item.currentStock > 0 ? 50 : 100));
    setRestockNote('');
    setRestockModalVisible(true);
  };

  const getShelfLifeBadgeVariant = (status: ShelfLifeStatus): BadgeVariant => {
    switch (status.status) {
      case 'expired':
        return 'danger';
      case 'expiring_soon':
        return 'warning';
      default:
        return 'success';
    }
  };

  const getShelfLifeLabel = (status: ShelfLifeStatus): string => {
    switch (status.status) {
      case 'expired':
        return 'EXPIRED';
      case 'expiring_soon':
        return 'EXPIRING SOON';
      default:
        return 'FRESH';
    }
  };

  const isLowStock = (item: InventoryItem) => item.currentStock <= item.thresholdLow;
  const isOutOfStock = (item: InventoryItem) => item.currentStock === 0;

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Inventory & Shelf Life
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Track raw materials, ingredients, packaging & spices
          </Text>
        </View>
        <Button title="+ Add Item" size="sm" onPress={() => setAddModalVisible(true)} />
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: colors.bgSurface }]}>
          <Text style={[styles.statVal, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Items</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.bgSurface }]}>
          <Text style={[styles.statVal, { color: '#D97706' }]}>{stats.lowStock}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Low Stock</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.bgSurface }]}>
          <Text style={[styles.statVal, { color: colors.danger }]}>{stats.outOfStock}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Out of Stock</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.bgSurface }]}>
          <Text style={[styles.statVal, { color: '#EF4444' }]}>{stats.expired}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Expired</Text>
        </View>
      </View>

      {/* 4 Horizontal Tabs */}
      <View style={[styles.tabRow, { borderBottomColor: colors.borderLight }]}>
        {[
          { key: 'all' as const, label: 'All' },
          { key: 'raw_ingredients' as const, label: 'Raw Ingredients' },
          { key: 'packaging' as const, label: 'Packaging' },
          { key: 'seasonings' as const, label: 'Seasonings & Herbs' },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setFilter(t.key)}
            style={[
              styles.tab,
              { borderBottomWidth: filter === t.key ? 2.5 : 1, borderBottomColor: filter === t.key ? colors.primary : colors.borderLight, backgroundColor: filter === t.key ? colors.primaryLight : 'transparent' },
            ]}
          >
            <Text style={{ color: filter === t.key ? colors.primary : colors.textSecondary, fontWeight: filter === t.key ? '800' : '600', fontSize: 12 }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status dropdown */}
      <View style={[styles.searchBar, { backgroundColor: colors.bgSurface, borderColor: 'transparent', borderWidth: 0, marginBottom: 8, outline: 'none' }]}>
        <Icon name="filter" size={16} color={colors.textMuted} />
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginLeft: 8 }}>
          Status:
        </Text>
        <TouchableOpacity
          onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 'auto' }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }}>
            {statusFilter === 'all' ? 'All Status' : statusFilter === 'fresh' ? 'Fresh' : statusFilter === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
          </Text>
          <Icon name={statusDropdownOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
      {statusDropdownOpen && (
        <View style={[styles.dropdownMenu, { backgroundColor: colors.bgSurface, borderColor: colors.borderLight, borderRadius: radii.md, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4, marginBottom: 10 }]}>
          {(['all', 'fresh', 'expiring_soon', 'expired'] as const).map((f) => (
            <TouchableOpacity key={f} onPress={() => { setStatusFilter(f); setStatusDropdownOpen(false); }} style={{ padding: 10, borderBottomWidth: 1, borderBottomColor: colors.borderLight }}>
              <Text style={{ fontSize: 13, color: colors.textPrimary, fontWeight: statusFilter === f ? '800' : '400' }}>
                {f === 'all' ? 'All Status' : f === 'fresh' ? 'Fresh' : f === 'expiring_soon' ? 'Expiring Soon' : 'Expired'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.bgSurface, borderColor: 'transparent', borderWidth: 0, marginBottom: 8, outline: 'none' }]}>
        <Icon name="search" size={16} color={colors.textMuted} />
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary, caretColor: colors.primary }]}
          placeholder="Search items..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Items List */}
      <View style={{ gap: 12, paddingBottom: 20 }}>
        {filteredItems.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.bgSurface }]}>
            <Icon name="cube" size={36} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No inventory items found.
            </Text>
          </View>
        ) : (
          filteredItems.map((item) => {
            const shelfStatus = calculateShelfLifeStatus(item);
            const low = isLowStock(item);
            const out = isOutOfStock(item);

            return (
              <View key={item.id} style={[styles.itemCard, { backgroundColor: colors.bgSurface }]}>
                {/* Card Header */}
                <View style={styles.itemCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                      {item.name?.replace(/Sachet \d+:\s*/gi, '').replace(/Sachet \d+\s*:?\s*/gi, '')}
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <Badge
                        label={CATEGORY_LABELS[item.category]}
                        variant="neutral"
                        size="sm"
                      />
                      <Badge
                        label={getShelfLifeLabel(shelfStatus)}
                        variant={getShelfLifeBadgeVariant(shelfStatus)}
                        size="sm"
                      />
                      {out && <Badge label="OUT OF STOCK" variant="danger" size="sm" />}
                      {low && !out && (
                        <Badge label="LOW STOCK" variant="warning" size="sm" />
                      )}
                    </View>
                  </View>
                  <Text style={[styles.itemStock, { color: out ? colors.danger : low ? '#D97706' : colors.primary }]}>
                    {item.currentStock} {item.unit}
                  </Text>
                </View>

                {/* Card Body */}
                <View style={styles.itemCardBody}>
                  <View style={styles.itemInfoRow}>
                    <View style={styles.itemInfoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Shelf Life</Text>
                      <Text style={[styles.infoVal, { color: colors.textPrimary }]}>
                        {item.shelfLifeDays} days
                      </Text>
                    </View>
                    <View style={styles.itemInfoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Expires</Text>
                      <Text style={[styles.infoVal, { color: colors.textPrimary }]}>
                        {new Date(item.expiryDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.itemInfoItem}>
                      <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Threshold</Text>
                      <Text style={[styles.infoVal, { color: colors.textPrimary }]}>
                        ≤{item.thresholdLow} {item.unit}
                      </Text>
                    </View>
                  </View>
                  {item.storageCondition && (
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                      📦 {item.storageCondition}
                    </Text>
                  )}
                  {item.supplier && (
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>
                      🏭 {item.supplier}
                    </Text>
                  )}
                  {item.notes && (
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      📝 {item.notes}
                    </Text>
                  )}
                </View>

                {/* Action Buttons */}
                <View style={styles.itemActionsRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.primaryLight }]}
                    onPress={() => openRestockModal(item)}
                  >
                    <Icon name="refresh" size={14} color={colors.primary} />
                    <Text style={[styles.actionBtnText, { color: colors.primary }]}>Restock</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: colors.bgSubtle }]}
                    onPress={() => openEditModal(item)}
                  >
                    <Icon name="create" size={14} color={colors.textSecondary} />
                    <Text style={[styles.actionBtnText, { color: colors.textSecondary }]}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#FEE2E2' }]}
                    onPress={() => {
                      setDeletingItem(item);
                      setDeleteModalVisible(true);
                    }}
                  >
                    <Icon name="trash" size={14} color="#DC2626" />
                    <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ── ADD ITEM MODAL ── */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>
              Add Inventory Item
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>Item Name *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
              value={newItem.name}
              onChangeText={(t) => setNewItem({ ...newItem, name: t })}
              placeholder="e.g. Chicken Breast"
              placeholderTextColor={colors.textMuted}
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Category *</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {(Object.keys(CATEGORY_LABELS) as InventorySection[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setNewItem({ ...newItem, category: cat })}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor: newItem.category === cat ? colors.primary : colors.bgSubtle,
                      borderColor: newItem.category === cat ? colors.primary : colors.borderLight,
                    },
                  ]}
                >
                  <Text style={{ color: newItem.category === cat ? '#fff' : colors.textPrimary, fontWeight: '700', fontSize: 11 }}>
                    {CATEGORY_LABELS[cat]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Current Stock *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={String(newItem.currentStock)}
                  onChangeText={(t) => setNewItem({ ...newItem, currentStock: parseInt(t) || 0 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Unit</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={newItem.unit}
                  onChangeText={(t) => setNewItem({ ...newItem, unit: t })}
                />
              </View>
            </View>

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Shelf Life (days) *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={String(newItem.shelfLifeDays)}
                  onChangeText={(t) => setNewItem({ ...newItem, shelfLifeDays: parseInt(t) || 30 })}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Low Threshold</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={String(newItem.thresholdLow)}
                  onChangeText={(t) => setNewItem({ ...newItem, thresholdLow: parseInt(t) || 5 })}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Storage Condition</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
              value={newItem.storageCondition}
              onChangeText={(t) => setNewItem({ ...newItem, storageCondition: t })}
              placeholder="e.g. Refrigerated at 2-5°C"
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Supplier</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
              value={newItem.supplier}
              onChangeText={(t) => setNewItem({ ...newItem, supplier: t })}
              placeholder="e.g. FreshPoultry Co."
            />

            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => setAddModalVisible(false)} />
              <Button title="Add Item" style={{ flex: 1 }} onPress={handleAddItem} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── EDIT ITEM MODAL ── */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>Edit Item</Text>

            {editingItem && (
              <>
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Name</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={editingItem.name}
                  onChangeText={(t) => setEditingItem({ ...editingItem, name: t })}
                />
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Current Stock</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={String(editingItem.currentStock)}
                  onChangeText={(t) => setEditingItem({ ...editingItem, currentStock: parseInt(t) || 0 })}
                  keyboardType="numeric"
                />
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Shelf Life (days)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={String(editingItem.shelfLifeDays)}
                  onChangeText={(t) => setEditingItem({ ...editingItem, shelfLifeDays: parseInt(t) || 30 })}
                  keyboardType="numeric"
                />
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Low Threshold</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={String(editingItem.thresholdLow)}
                  onChangeText={(t) => setEditingItem({ ...editingItem, thresholdLow: parseInt(t) || 5 })}
                  keyboardType="numeric"
                />
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Storage Condition</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={editingItem.storageCondition}
                  onChangeText={(t) => setEditingItem({ ...editingItem, storageCondition: t })}
                />
                <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Notes</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
                  value={editingItem.notes}
                  onChangeText={(t) => setEditingItem({ ...editingItem, notes: t })}
                  multiline
                />
              </>
            )}

            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => { setEditModalVisible(false); setEditingItem(null); }} />
              <Button title="Save" style={{ flex: 1 }} onPress={handleUpdateItem} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── RESTOCK MODAL ── */}
      <Modal visible={restockModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.modalHeading, { color: colors.textPrimary }]}>
              Restock: {restockingItem?.name}
            </Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Current: {restockingItem?.currentStock} {restockingItem?.unit}
            </Text>

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Quantity to Add *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
              value={restockQty}
              onChangeText={setRestockQty}
              keyboardType="numeric"
              placeholder="e.g. 50"
            />

            <Text style={[styles.inputLabel, { color: colors.textPrimary, marginTop: 10 }]}>Batch Note (optional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.bgSubtle, borderColor: colors.border, borderRadius: radii.md }]}
              value={restockNote}
              onChangeText={setRestockNote}
              placeholder="e.g. New shipment from supplier"
            />

            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => { setRestockModalVisible(false); setRestockingItem(null); }} />
              <Button title="Confirm Restock" style={{ flex: 1 }} onPress={handleRestock} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── DELETE CONFIRM MODAL ── */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { backgroundColor: colors.bgSurface }]}>
            <Text style={[styles.modalHeading, { color: '#DC2626' }]}>Delete Item?</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Are you sure you want to remove "{deletingItem?.name}" from inventory?
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <Button title="Cancel" variant="secondary" style={{ flex: 1 }} onPress={() => { setDeleteModalVisible(false); setDeletingItem(null); }} />
              <Button title="Delete" variant="danger" style={{ flex: 1 }} onPress={handleDelete} />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  tabRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 14,
    paddingBottom: 4,
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  container: {
    padding: 16,
    paddingBottom: 30,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minWidth: '22%',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  itemCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
  },
  itemStock: {
    fontSize: 16,
    fontWeight: '900',
  },
  itemCardBody: {
    marginBottom: 10,
  },
  itemInfoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 6,
  },
  itemInfoItem: {
    flex: 1,
    minWidth: '30%',
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  itemMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  itemActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 14,
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  modalBox: {
    borderRadius: 16,
    padding: 20,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  modalInput: {
    padding: 12,
    fontSize: 14,
    borderWidth: 1,
  },
  row2: {
    flexDirection: 'row',
    gap: 8,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
});
