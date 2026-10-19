// features/admin/BulkRestockModal.tsx
// Clean, mobile-responsive Bulk Restock Modal for the Inventory Hub:
// Allows admins to select multiple items by category, configure custom shelf life,
// set restock quantities, and bulk-sync to Supabase & local inventory.

import React, { useState, useMemo, useEffect } from 'react';
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
import { InventoryItem, InventorySection } from '../../framework/services/inventoryService';
import {
  bulkRestockInventoryItemsInSupabase,
  BulkRestockEntry,
} from '../../framework/services/supabaseInventoryService';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Badge, BadgeVariant } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { AppIconName, Icon } from '../../framework/ui/Icon';
import {
  INGREDIENT_CATEGORIES,
  IngredientCategoryId,
  getIngredientCategory,
} from './ingredientCategories';
import { CategoryFilter } from './CategoryDropdown';

export interface BulkRestockModalProps {
  visible: boolean;
  onClose: () => void;
  items: InventoryItem[];
  onRestockComplete: () => void;
  initialCategory?: CategoryFilter;
}

interface StagedRestockItem {
  id: string;
  name: string;
  unit: string;
  section: InventorySection;
  currentStock: number;
  thresholdLow: number;
  restockQuantity: number;
  shelfLifeDays: number;
}

export const BulkRestockModal: React.FC<BulkRestockModalProps> = ({
  visible,
  onClose,
  items,
  onRestockComplete,
  initialCategory = 'all',
}) => {
  const { colors, radii, shadows } = useTheme();

  // Active category / filter
  const [activeSection, setActiveSection] = useState<'low_stock' | 'all' | InventorySection>(
    'low_stock',
  );
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('all');
  const [itemDropdownOpen, setItemDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [batchNote, setBatchNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Staged items mapped by ID
  const [stagedMap, setStagedMap] = useState<Record<string, StagedRestockItem>>({});

  // Items matching current category selection
  const categoryAvailableItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Section / Low stock filter
      if (activeSection === 'low_stock') {
        if (item.currentStock > item.thresholdLow) return false;
      } else if (activeSection !== 'all') {
        if (item.section !== activeSection) return false;
      }

      // 2. Sub-category filter
      if (selectedSubCategory !== 'all') {
        const cat = getIngredientCategory(item.name);
        if (cat !== selectedSubCategory) return false;
      }

      return true;
    });
  }, [items, activeSection, selectedSubCategory]);

  // Filtered for search inside the multi-select dropdown
  const dropdownFilteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categoryAvailableItems;
    return categoryAvailableItems.filter((i) => i.name.toLowerCase().includes(q));
  }, [categoryAvailableItems, searchQuery]);

  // Pre-populate items when modal opens
  useEffect(() => {
    if (visible) {
      const isCatSelected = initialCategory && initialCategory !== 'all';
      const targetItems = isCatSelected
        ? items.filter((i) => getIngredientCategory(i.name) === initialCategory)
        : items.filter((i) => i.currentStock <= i.thresholdLow);

      const initialStaged: Record<string, StagedRestockItem> = {};

      targetItems.forEach((i) => {
        const defaultQty =
          i.unit === 'g' || i.unit === 'ml' ? 5000 : Math.max(50, (i.thresholdLow || 5) * 2);
        initialStaged[i.id] = {
          id: i.id,
          name: i.name,
          unit: i.unit,
          section: i.section,
          currentStock: i.currentStock,
          thresholdLow: i.thresholdLow,
          restockQuantity: defaultQty,
          shelfLifeDays: i.shelfLifeDays || 7,
        };
      });

      setStagedMap(initialStaged);
      setActiveSection(isCatSelected ? 'all' : 'low_stock');
      setSelectedSubCategory(isCatSelected ? (initialCategory as string) : 'all');
      setItemDropdownOpen(isCatSelected); // Auto-open dropdown if initiated from Category Picker
      setSearchQuery('');
      setBatchNote('');
      setIsSubmitting(false);
    }
  }, [visible, items, initialCategory]);

  // Toggle selection of an individual item
  const toggleItemSelection = (item: InventoryItem) => {
    setStagedMap((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        const defaultQty =
          item.unit === 'g' || item.unit === 'ml' ? 5000 : Math.max(50, item.thresholdLow * 2);
        next[item.id] = {
          id: item.id,
          name: item.name,
          unit: item.unit,
          section: item.section,
          currentStock: item.currentStock,
          thresholdLow: item.thresholdLow,
          restockQuantity: defaultQty,
          shelfLifeDays: item.shelfLifeDays || 7,
        };
      }
      return next;
    });
  };

  // Select all items currently in dropdown
  const handleSelectAllInDropdown = () => {
    setStagedMap((prev) => {
      const next = { ...prev };
      dropdownFilteredItems.forEach((item) => {
        if (!next[item.id]) {
          const defaultQty =
            item.unit === 'g' || item.unit === 'ml' ? 5000 : Math.max(50, item.thresholdLow * 2);
          next[item.id] = {
            id: item.id,
            name: item.name,
            unit: item.unit,
            section: item.section,
            currentStock: item.currentStock,
            thresholdLow: item.thresholdLow,
            restockQuantity: defaultQty,
            shelfLifeDays: item.shelfLifeDays || 7,
          };
        }
      });
      return next;
    });
  };

  // Clear all in dropdown
  const handleClearAllInDropdown = () => {
    setStagedMap((prev) => {
      const next = { ...prev };
      dropdownFilteredItems.forEach((item) => {
        delete next[item.id];
      });
      return next;
    });
  };

  // Remove individual staged item
  const handleRemoveStagedItem = (id: string) => {
    setStagedMap((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  // Update restock quantity for staged item
  const handleQuantityChange = (id: string, text: string) => {
    const parsed = parseFloat(text);
    setStagedMap((prev) => {
      const item = prev[id];
      if (!item) return prev;
      return {
        ...prev,
        [id]: {
          ...item,
          restockQuantity: isNaN(parsed) ? 0 : parsed,
        },
      };
    });
  };

  // Update configurable shelf life for staged item
  const handleShelfLifeChange = (id: string, text: string) => {
    const parsed = parseInt(text, 10);
    setStagedMap((prev) => {
      const item = prev[id];
      if (!item) return prev;
      return {
        ...prev,
        [id]: {
          ...item,
          shelfLifeDays: isNaN(parsed) || parsed < 1 ? 1 : parsed,
        },
      };
    });
  };

  // Submit bulk restock
  const handleConfirmRestock = async () => {
    const stagedList = Object.values(stagedMap).filter((i) => i.restockQuantity > 0);
    if (stagedList.length === 0) {
      Alert.alert('Notice', 'No items with positive restock quantities to restock.');
      return;
    }

    setIsSubmitting(true);
    try {
      const entries: BulkRestockEntry[] = stagedList.map((i) => ({
        id: i.id,
        quantity: i.restockQuantity,
        shelfLifeDays: i.shelfLifeDays,
      }));

      const res = await bulkRestockInventoryItemsInSupabase(entries, batchNote.trim() || undefined);
      if (res.success) {
        Alert.alert('Success', `Successfully restocked ${res.count} items.`);
        onRestockComplete();
        onClose();
      } else {
        Alert.alert('Error', 'Could not complete bulk restock.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Unexpected error during restock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const stagedList = Object.values(stagedMap);
  const stagedCount = stagedList.length;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalCard,
            { backgroundColor: colors.bgSurface, borderRadius: radii.xl, ...shadows.card },
          ]}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.headerTitleRow}>
                <Icon name="refresh" size={20} color={colors.primary} />
                <Text style={[styles.title, { color: colors.textPrimary }]}>
                  Bulk Restock by Category
                </Text>
              </View>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Select items by category, configure custom shelf life, and restock in one click.
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.bgSubtle, borderRadius: radii.pill },
              ]}
            >
              <Icon name="close" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 1. Category Section Tabs */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Step 1: Choose Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryPills}
            >
              <TouchableOpacity
                onPress={() => {
                  setActiveSection('low_stock');
                  setSelectedSubCategory('all');
                }}
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      activeSection === 'low_stock' ? colors.primary : colors.bgSubtle,
                    borderColor:
                      activeSection === 'low_stock' ? colors.primary : colors.borderLight,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Icon
                  name="warning"
                  size={14}
                  color={activeSection === 'low_stock' ? '#FFF' : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: activeSection === 'low_stock' ? '#FFF' : colors.textPrimary },
                  ]}
                >
                  Low Stock Items
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setActiveSection('raw_ingredients');
                  setSelectedSubCategory('all');
                }}
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      activeSection === 'raw_ingredients' ? colors.primary : colors.bgSubtle,
                    borderColor:
                      activeSection === 'raw_ingredients' ? colors.primary : colors.borderLight,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Icon
                  name="basket"
                  size={14}
                  color={activeSection === 'raw_ingredients' ? '#FFF' : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: activeSection === 'raw_ingredients' ? '#FFF' : colors.textPrimary },
                  ]}
                >
                  Raw Ingredients
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setActiveSection('seasonings');
                  setSelectedSubCategory('all');
                }}
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      activeSection === 'seasonings' ? colors.primary : colors.bgSubtle,
                    borderColor:
                      activeSection === 'seasonings' ? colors.primary : colors.borderLight,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Icon
                  name="sparkles"
                  size={14}
                  color={activeSection === 'seasonings' ? '#FFF' : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: activeSection === 'seasonings' ? '#FFF' : colors.textPrimary },
                  ]}
                >
                  Seasonings & Herbs
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setActiveSection('packaging');
                  setSelectedSubCategory('all');
                }}
                style={[
                  styles.pill,
                  {
                    backgroundColor:
                      activeSection === 'packaging' ? colors.primary : colors.bgSubtle,
                    borderColor:
                      activeSection === 'packaging' ? colors.primary : colors.borderLight,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Icon
                  name="package"
                  size={14}
                  color={activeSection === 'packaging' ? '#FFF' : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: activeSection === 'packaging' ? '#FFF' : colors.textPrimary },
                  ]}
                >
                  Packaging
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setActiveSection('all');
                  setSelectedSubCategory('all');
                }}
                style={[
                  styles.pill,
                  {
                    backgroundColor: activeSection === 'all' ? colors.primary : colors.bgSubtle,
                    borderColor: activeSection === 'all' ? colors.primary : colors.borderLight,
                    borderRadius: radii.pill,
                  },
                ]}
              >
                <Icon
                  name="cube"
                  size={14}
                  color={activeSection === 'all' ? '#FFF' : colors.textPrimary}
                />
                <Text
                  style={[
                    styles.pillText,
                    { color: activeSection === 'all' ? '#FFF' : colors.textPrimary },
                  ]}
                >
                  All Items
                </Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sub-Category Filter (Pills) */}
            <View style={styles.subCatRow}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subCatPills}
              >
                <TouchableOpacity
                  onPress={() => setSelectedSubCategory('all')}
                  style={[
                    styles.subPill,
                    {
                      backgroundColor:
                        selectedSubCategory === 'all' ? colors.primaryLight : 'transparent',
                      borderColor:
                        selectedSubCategory === 'all' ? colors.primary : colors.borderLight,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.subPillText,
                      {
                        color:
                          selectedSubCategory === 'all' ? colors.primary : colors.textSecondary,
                      },
                    ]}
                  >
                    All Categories ({categoryAvailableItems.length})
                  </Text>
                </TouchableOpacity>

                {INGREDIENT_CATEGORIES.map((cat) => {
                  const count = items.filter(
                    (i) => getIngredientCategory(i.name) === cat.id,
                  ).length;
                  if (count === 0) return null;
                  const isSel = selectedSubCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedSubCategory(cat.id)}
                      style={[
                        styles.subPill,
                        {
                          backgroundColor: isSel ? colors.primaryLight : 'transparent',
                          borderColor: isSel ? colors.primary : colors.borderLight,
                          borderRadius: radii.md,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.subPillText,
                          { color: isSel ? colors.primary : colors.textSecondary },
                        ]}
                      >
                        {cat.label} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 2. Multi-Select Dropdown Menu Trigger */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 12 }]}>
              Step 2: Select Items to Restock
            </Text>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setItemDropdownOpen((v) => !v)}
              style={[
                styles.dropdownTrigger,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: itemDropdownOpen ? colors.primary : colors.borderLight,
                  borderRadius: radii.lg,
                },
              ]}
            >
              <View style={styles.dropdownTriggerLeft}>
                <Icon name="basket" size={18} color={colors.primary} />
                <Text style={[styles.dropdownTriggerText, { color: colors.textPrimary }]}>
                  {dropdownFilteredItems.length} Available in Category
                </Text>
                <Badge label={`${stagedCount} Selected`} variant="primary" size="sm" />
              </View>
              <Icon
                name={itemDropdownOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>

            {/* Dropdown Menu Content */}
            {itemDropdownOpen && (
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
                {/* Search input inside dropdown */}
                <View
                  style={[
                    styles.dropdownSearchBox,
                    {
                      backgroundColor: colors.bgSubtle,
                      borderColor: colors.borderLight,
                      borderRadius: radii.md,
                    },
                  ]}
                >
                  <Icon name="search" size={16} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.dropdownSearchInput, { color: colors.textPrimary }]}
                    placeholder="Search ingredients in this category..."
                    placeholderTextColor={colors.textSecondary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                  {searchQuery ? (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <Icon name="close" size={14} color={colors.textSecondary} />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* Quick actions row */}
                <View style={styles.dropdownActionsRow}>
                  <TouchableOpacity
                    onPress={handleSelectAllInDropdown}
                    style={styles.dropdownActionBtn}
                  >
                    <Text style={[styles.dropdownActionText, { color: colors.primary }]}>
                      + Select All ({dropdownFilteredItems.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleClearAllInDropdown}
                    style={styles.dropdownActionBtn}
                  >
                    <Text style={[styles.dropdownActionText, { color: colors.danger }]}>
                      Clear Selection
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Items list with checkboxes */}
                <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }}>
                  {dropdownFilteredItems.length === 0 ? (
                    <Text style={[styles.emptyDropdownText, { color: colors.textSecondary }]}>
                      No items match this category/search.
                    </Text>
                  ) : (
                    dropdownFilteredItems.map((item) => {
                      const isChecked = !!stagedMap[item.id];
                      const isLow = item.currentStock <= item.thresholdLow;
                      return (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.7}
                          onPress={() => toggleItemSelection(item)}
                          style={[
                            styles.dropdownItemRow,
                            {
                              backgroundColor: isChecked ? colors.primaryLight : 'transparent',
                              borderBottomColor: colors.borderLight,
                            },
                          ]}
                        >
                          <View style={styles.checkboxWrapper}>
                            <View
                              style={[
                                styles.checkbox,
                                {
                                  borderColor: isChecked ? colors.primary : colors.borderLight,
                                  backgroundColor: isChecked ? colors.primary : 'transparent',
                                  borderRadius: 4,
                                },
                              ]}
                            >
                              {isChecked && <Icon name="checkmark" size={12} color="#FFF" />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={[styles.dropdownItemName, { color: colors.textPrimary }]}
                                numberOfLines={1}
                              >
                                {item.name}
                              </Text>
                              <Text
                                style={[styles.dropdownItemMeta, { color: colors.textSecondary }]}
                              >
                                Current: {item.currentStock} {item.unit} (Shelf Life:{' '}
                                {item.shelfLifeDays}d)
                              </Text>
                            </View>
                          </View>
                          {isLow && <Badge label="Low Stock" variant="warning" size="sm" />}
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>
            )}

            {/* 3. Configurable Restock Staging List */}
            <View style={styles.stagedHeaderRow}>
              <Text style={[styles.sectionLabel, { color: colors.textPrimary, marginVertical: 0 }]}>
                Staged Items to Restock ({stagedCount})
              </Text>
              {stagedCount > 0 && (
                <TouchableOpacity onPress={() => setStagedMap({})}>
                  <Text style={{ color: colors.danger, fontSize: 13, fontWeight: '600' }}>
                    Clear All
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {stagedCount === 0 ? (
              <View
                style={[
                  styles.emptyStagedCard,
                  { backgroundColor: colors.bgSubtle, borderRadius: radii.lg },
                ]}
              >
                <Icon name="basket" size={28} color={colors.textSecondary} />
                <Text style={[styles.emptyStagedText, { color: colors.textSecondary }]}>
                  No items staged for restock yet. Choose a category and select items from the menu
                  above.
                </Text>
              </View>
            ) : (
              stagedList.map((item) => {
                const isLow = item.currentStock <= item.thresholdLow;
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.stagedCard,
                      {
                        backgroundColor: colors.bgSurface,
                        borderColor: colors.borderLight,
                        borderRadius: radii.lg,
                        ...shadows.card,
                      },
                    ]}
                  >
                    {/* Item info header */}
                    <View style={styles.stagedCardHeader}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text
                          style={[styles.stagedItemName, { color: colors.textPrimary }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Text style={[styles.stagedStockText, { color: colors.textSecondary }]}>
                          In Stock: {item.currentStock} {item.unit} | Min Alert: ≤
                          {item.thresholdLow} {item.unit}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Badge
                          label={isLow ? 'Low Stock' : 'In Stock'}
                          variant={isLow ? 'warning' : 'success'}
                          size="sm"
                        />
                        {/* Remove item button */}
                        <TouchableOpacity
                          onPress={() => handleRemoveStagedItem(item.id)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${item.name} from restock plan`}
                          style={[
                            styles.removeStagedBtn,
                            { backgroundColor: '#FEE2E2', borderRadius: radii.md },
                          ]}
                        >
                          <Icon name="close" size={12} color="#DC2626" />
                          <Text style={{ fontSize: 11, fontWeight: '700', color: '#DC2626' }}>
                            Remove
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Inputs row: Restock Qty & Configurable Shelf Life */}
                    <View style={styles.stagedInputsRow}>
                      {/* Restock Quantity */}
                      <View style={styles.inputCol}>
                        <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                          + Restock Amount ({item.unit})
                        </Text>
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              backgroundColor: colors.bgSubtle,
                              borderColor: colors.borderLight,
                              color: colors.textPrimary,
                              borderRadius: radii.md,
                            },
                          ]}
                          keyboardType="numeric"
                          value={String(item.restockQuantity)}
                          onChangeText={(txt) => handleQuantityChange(item.id, txt)}
                          placeholder="0"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>

                      {/* Configurable Shelf Life */}
                      <View style={styles.inputCol}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: 4,
                          }}
                        >
                          <Text
                            style={[
                              styles.inputFieldLabel,
                              { color: colors.textSecondary, marginBottom: 0 },
                            ]}
                          >
                            Shelf Life (Days)
                          </Text>
                          <Text style={{ fontSize: 9, fontWeight: '600', color: colors.primary }}>
                            ✓ Saves as default
                          </Text>
                        </View>
                        <TextInput
                          style={[
                            styles.textInput,
                            {
                              backgroundColor: colors.bgSubtle,
                              borderColor: colors.borderLight,
                              color: colors.textPrimary,
                              borderRadius: radii.md,
                            },
                          ]}
                          keyboardType="number-pad"
                          value={String(item.shelfLifeDays)}
                          onChangeText={(txt) => handleShelfLifeChange(item.id, txt)}
                          placeholder="Days"
                          placeholderTextColor={colors.textSecondary}
                        />
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {/* 5. Batch Note / PO Details */}
            {stagedCount > 0 && (
              <View style={[styles.batchNoteSection, { marginTop: 16 }]}>
                <Text style={[styles.inputFieldLabel, { color: colors.textSecondary }]}>
                  Optional Batch / Invoice Note (saved to all items):
                </Text>
                <TextInput
                  style={[
                    styles.batchNoteInput,
                    {
                      backgroundColor: colors.bgSubtle,
                      borderColor: colors.borderLight,
                      color: colors.textPrimary,
                      borderRadius: radii.md,
                    },
                  ]}
                  placeholder="e.g. PO-2026-10-19 Amul & FreshProduce Delivery"
                  placeholderTextColor={colors.textSecondary}
                  value={batchNote}
                  onChangeText={setBatchNote}
                />
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer Actions (Responsive for mobile, never overflow) */}
          <View style={[styles.footer, { borderTopColor: colors.borderLight }]}>
            <View style={styles.footerInfo}>
              <Text style={[styles.footerSummary, { color: colors.textPrimary }]}>
                {stagedCount} {stagedCount === 1 ? 'item' : 'items'} ready
              </Text>
            </View>
            <View style={styles.footerButtons}>
              <Button
                title="Cancel"
                variant="outline"
                size="sm"
                onPress={onClose}
                disabled={isSubmitting}
              />
              <Button
                title={isSubmitting ? 'Restocking...' : `Confirm Restock (${stagedCount})`}
                size="sm"
                onPress={handleConfirmRestock}
                disabled={isSubmitting || stagedCount === 0}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 720,
    maxHeight: '90%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 13,
  },
  closeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  categoryPills: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  subCatRow: {
    marginTop: 8,
  },
  subCatPills: {
    flexDirection: 'row',
    gap: 6,
    paddingBottom: 4,
  },
  subPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  subPillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
  },
  dropdownTriggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownTriggerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownMenu: {
    marginTop: 6,
    borderWidth: 1,
    padding: 10,
  },
  dropdownSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    gap: 8,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 13,
    padding: 0,
  },
  dropdownActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  dropdownActionBtn: {
    paddingVertical: 2,
  },
  dropdownActionText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyDropdownText: {
    textAlign: 'center',
    paddingVertical: 16,
    fontSize: 13,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: '600',
  },
  dropdownItemMeta: {
    fontSize: 11,
    marginTop: 2,
  },

  stagedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStagedCard: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 8,
  },
  emptyStagedText: {
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 360,
  },
  stagedCard: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  stagedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  stagedItemName: {
    fontSize: 14,
    fontWeight: '700',
  },
  stagedStockText: {
    fontSize: 12,
    marginTop: 2,
  },
  removeStagedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stagedInputsRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  inputCol: {
    flex: 1,
    minWidth: 140,
  },
  inputFieldLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
  },
  batchNoteSection: {
    gap: 4,
  },
  batchNoteInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    flexWrap: 'wrap',
    gap: 10,
  },
  footerInfo: {
    minWidth: 100,
  },
  footerSummary: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
});
