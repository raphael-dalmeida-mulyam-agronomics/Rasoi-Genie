import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useTheme } from '../../../framework/theme/ThemeContext';
import { Icon } from '../../../framework/ui/Icon';
import { StructuredIngredient, VALID_UNITS, MeasurementUnit } from '../types';
import {
  getInventoryItems,
  InventoryItem,
} from '../../../framework/services/inventoryService';

interface Step2IngredientsProps {
  ingredients: StructuredIngredient[];
  onChange: (ingredients: StructuredIngredient[]) => void;
}

export function Step2Ingredients({ ingredients, onChange }: Step2IngredientsProps) {
  const { colors } = useTheme();

  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [requestItemName, setRequestItemName] = useState('');
  const [showRequestDialog, setShowRequestDialog] = useState(false);

  // Load inventory on mount
  useEffect(() => {
    const items = getInventoryItems();
    setInventoryList(items);
  }, []);

  const filteredInventory = inventoryList.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !ingredients.some((ing) => ing.name.toLowerCase() === item.name.toLowerCase()),
  );

  const handleAddFromInventory = (item: InventoryItem) => {
    // Map inventory unit to VALID_UNITS if possible
    let defaultUnit: MeasurementUnit = 'g';
    const lowerUnit = (item.unit || '').toLowerCase();
    if (VALID_UNITS.includes(lowerUnit as any)) {
      defaultUnit = lowerUnit as MeasurementUnit;
    } else if (lowerUnit.includes('kg')) {
      defaultUnit = 'kg';
    } else if (lowerUnit.includes('liter') || lowerUnit.includes('l')) {
      defaultUnit = 'L';
    } else if (lowerUnit.includes('ml')) {
      defaultUnit = 'ml';
    } else if (lowerUnit.includes('pc') || lowerUnit.includes('piece')) {
      defaultUnit = 'piece';
    } else if (lowerUnit.includes('packet')) {
      defaultUnit = 'packet';
    }

    const newIng: StructuredIngredient = {
      id: `ing-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      ingredientId: item.id,
      name: item.name,
      amount: 100,
      unit: defaultUnit,
      quantityStr: `100 ${defaultUnit}`,
    };

    onChange([...ingredients, newIng]);
    setShowCatalogModal(false);
    setSearchQuery('');
  };

  const handleUpdateIngredient = (
    idx: number,
    field: 'name' | 'amount' | 'unit',
    value: any,
  ) => {
    const updated = [...ingredients];
    const target = updated[idx];
    if (!target) return;

    if (field === 'amount') {
      const num = typeof value === 'number' ? value : parseFloat(value) || 0;
      target.amount = num;
      target.quantityStr = `${num} ${target.unit}`;
    } else if (field === 'unit') {
      target.unit = value;
      target.quantityStr = `${target.amount} ${value}`;
    } else if (field === 'name') {
      target.name = value;
    }

    onChange(updated);
  };

  // Flexible parser for quantity input (handles numeric and strings like "500g")
  const handleQtyTextChange = (idx: number, text: string) => {
    const updated = [...ingredients];
    const target = updated[idx];
    if (!target) return;

    const trimmed = text.trim();
    // Check if text matches "<amount><unit>" e.g. "500g" or "2 piece"
    const match = trimmed.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
    if (match) {
      const parsedAmount = parseFloat(match[1] || '0') || 0;
      target.amount = parsedAmount;
      if (match[2]) {
        const parsedUnit = match[2].toLowerCase();
        if (VALID_UNITS.includes(parsedUnit as any)) {
          target.unit = parsedUnit as MeasurementUnit;
        }
      }
      target.quantityStr = `${target.amount} ${target.unit}`;
    } else {
      const parsedAmount = parseFloat(text) || 0;
      target.amount = parsedAmount;
      target.quantityStr = `${parsedAmount} ${target.unit}`;
    }
    onChange(updated);
  };

  const handleRemove = (idx: number) => {
    onChange(ingredients.filter((_, i) => i !== idx));
  };

  const handleMoveUp = (idx: number) => {
    if (idx === 0) return;
    const updated = [...ingredients];
    const temp = updated[idx - 1]!;
    updated[idx - 1] = updated[idx]!;
    updated[idx] = temp;
    onChange(updated);
  };

  const handleMoveDown = (idx: number) => {
    if (idx === ingredients.length - 1) return;
    const updated = [...ingredients];
    const temp = updated[idx + 1]!;
    updated[idx + 1] = updated[idx]!;
    updated[idx] = temp;
    onChange(updated);
  };

  const handleRequestIngredient = () => {
    if (!requestItemName.trim()) {
      Alert.alert('Required', 'Please enter the name of the requested ingredient.');
      return;
    }
    Alert.alert(
      'Request Submitted',
      `Your request for "${requestItemName.trim()}" has been recorded for the inventory procurement team.`,
    );
    setRequestItemName('');
    setShowRequestDialog(false);
  };

  return (
    <View style={styles.container}>
      {/* SECTION: Ingredients Header & Catalog Trigger */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.cardHeaderRow}>
          <View>
            <View style={styles.titleBadgeRow}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Recipe Ingredients
              </Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{ingredients.length} Added</Text>
              </View>
            </View>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Selected from RasoiGenie verified inventory. Measured in standardized culinary units.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCatalogModal(true)}
          >
            <Icon name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add from Inventory</Text>
          </TouchableOpacity>
        </View>

        {/* Search & Pick Inventory Catalog Modal/Drawer */}
        {showCatalogModal && (
          <View
            style={[
              styles.catalogPickerBox,
              { backgroundColor: colors.bgSubtle, borderColor: colors.borderLight },
            ]}
          >
            <View style={styles.pickerHeader}>
              <Text style={[styles.pickerTitle, { color: colors.textPrimary }]}>
                Select Ingredient from Inventory
              </Text>
              <TouchableOpacity onPress={() => setShowCatalogModal(false)}>
                <Icon name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search spices, vegetables, pulses, dairy..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.searchInput,
                {
                  backgroundColor: colors.bgSurface,
                  borderColor: colors.borderLight,
                  color: colors.textPrimary,
                },
              ]}
              autoFocus
            />

            <View style={styles.inventoryResultsList}>
              {filteredInventory.slice(0, 8).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.inventoryItemRow,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderLight,
                    },
                  ]}
                  onPress={() => handleAddFromInventory(item)}
                >
                  <View style={styles.itemInfo}>
                    <Text style={[styles.itemName, { color: colors.textPrimary }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.itemSection, { color: colors.textMuted }]}>
                      {item.section.replace('_', ' ')} • Stock: {item.currentStock} {item.unit}
                    </Text>
                  </View>
                  <View style={[styles.selectChip, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.selectChipText, { color: colors.primary }]}>
                      + Select
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}

              {filteredInventory.length === 0 && (
                <View style={styles.noResultsBox}>
                  <Text style={[styles.noResultsText, { color: colors.textMuted }]}>
                    No inventory match for "{searchQuery}".
                  </Text>
                  <TouchableOpacity
                    style={styles.requestLink}
                    onPress={() => {
                      setRequestItemName(searchQuery);
                      setShowCatalogModal(false);
                      setShowRequestDialog(true);
                    }}
                  >
                    <Text style={[styles.requestLinkText, { color: colors.primary }]}>
                      Request new ingredient →
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Request New Ingredient Dialog */}
        {showRequestDialog && (
          <View
            style={[
              styles.requestDialogBox,
              { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
            ]}
          >
            <View style={styles.dialogHeader}>
              <Icon name="information-circle" size={18} color="#D97706" />
              <Text style={[styles.dialogTitle, { color: '#92400E' }]}>
                Request New Ingredient from Kitchen Manager
              </Text>
            </View>
            <Text style={[styles.dialogDesc, { color: '#B45309' }]}>
              If a spice or specialty item is not currently stocked in the inventory catalog, submit a request.
            </Text>
            <TextInput
              value={requestItemName}
              onChangeText={setRequestItemName}
              placeholder="e.g. Kashmiri Morel / Gucchi Mushrooms"
              placeholderTextColor="#B45309"
              style={styles.dialogInput}
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                onPress={() => setShowRequestDialog(false)}
                style={styles.dialogCancelBtn}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRequestIngredient}
                style={[styles.dialogSubmitBtn, { backgroundColor: '#D97706' }]}
              >
                <Text style={styles.dialogSubmitText}>Submit Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* SECTION: Selected Ingredients List Table */}
      <View
        style={[
          styles.card,
          { backgroundColor: colors.bgCard, borderColor: colors.borderLight },
        ]}
      >
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.th, { flex: 0.4, color: colors.textMuted }]}>#</Text>
          <Text style={[styles.th, { flex: 3, color: colors.textMuted }]}>Ingredient</Text>
          <Text style={[styles.th, { flex: 1.5, color: colors.textMuted }]}>Quantity</Text>
          <Text style={[styles.th, { flex: 1.5, color: colors.textMuted }]}>Unit</Text>
          <Text style={[styles.th, { flex: 1.2, textAlign: 'right', color: colors.textMuted }]}>
            Actions
          </Text>
        </View>

        {ingredients.length === 0 ? (
          <View style={styles.emptyTableState}>
            <Icon name="nutrition-outline" size={36} color={colors.textMuted} />
            <Text style={[styles.emptyTableText, { color: colors.textSecondary }]}>
              No ingredients added yet.
            </Text>
            <Text style={[styles.emptyTableSubtext, { color: colors.textMuted }]}>
              Click "Add from Inventory" above to select ingredients for this recipe.
            </Text>
          </View>
        ) : (
          ingredients.map((ing, idx) => (
            <View
              key={ing.id || idx}
              style={[
                styles.ingredientRow,
                {
                  borderBottomColor: colors.borderLight,
                  backgroundColor: idx % 2 === 0 ? 'transparent' : colors.bgSubtle,
                },
              ]}
            >
              {/* Index & Handle */}
              <View style={[styles.rowCol, { flex: 0.4 }]}>
                <Text style={[styles.indexText, { color: colors.textMuted }]}>{idx + 1}</Text>
              </View>

              {/* Ingredient Name (supports testID="chef-ingredient-name-0") */}
              <View style={[styles.rowCol, { flex: 3 }]}>
                <TextInput
                  testID={idx === 0 ? 'chef-ingredient-name-0' : undefined}
                  value={ing.name}
                  onChangeText={(val) => handleUpdateIngredient(idx, 'name', val)}
                  style={[
                    styles.ingredientNameInput,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                      backgroundColor: colors.bgSurface,
                    },
                  ]}
                  placeholder="Ingredient name"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Quantity Amount (supports testID="chef-ingredient-qty-0") */}
              <View style={[styles.rowCol, { flex: 1.5 }]}>
                <TextInput
                  testID={idx === 0 ? 'chef-ingredient-qty-0' : undefined}
                  value={ing.amount ? String(ing.amount) : ''}
                  onChangeText={(val) => handleQtyTextChange(idx, val)}
                  style={[
                    styles.qtyInput,
                    {
                      color: colors.textPrimary,
                      borderColor: colors.borderLight,
                      backgroundColor: colors.bgSurface,
                    },
                  ]}
                  placeholder="e.g. 200"
                  placeholderTextColor={colors.textMuted}
                />
              </View>

              {/* Unit Dropdown / Selector strictly limited to VALID_UNITS */}
              <View style={[styles.rowCol, { flex: 1.5 }]}>
                <View
                  style={[
                    styles.unitSelectorWrap,
                    {
                      backgroundColor: colors.bgSurface,
                      borderColor: colors.borderLight,
                    },
                  ]}
                >
                  <select
                    value={ing.unit}
                    onChange={(e) =>
                      handleUpdateIngredient(idx, 'unit', e.target.value as MeasurementUnit)
                    }
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: colors.textPrimary,
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {VALID_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </View>
              </View>

              {/* Reordering and Delete */}
              <View style={[styles.rowCol, { flex: 1.2, flexDirection: 'row', justifyContent: 'flex-end', gap: 4 }]}>
                <TouchableOpacity
                  onPress={() => handleMoveUp(idx)}
                  disabled={idx === 0}
                  style={[styles.miniActionBtn, { opacity: idx === 0 ? 0.3 : 1 }]}
                >
                  <Icon name="arrow-up" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleMoveDown(idx)}
                  disabled={idx === ingredients.length - 1}
                  style={[
                    styles.miniActionBtn,
                    { opacity: idx === ingredients.length - 1 ? 0.3 : 1 },
                  ]}
                >
                  <Icon name="arrow-down" size={14} color={colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRemove(idx)}
                  style={[styles.miniActionBtn, { borderColor: '#FECACA' }]}
                >
                  <Icon name="trash-outline" size={14} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 12,
  },
  titleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  countBadge: {
    backgroundColor: '#E0E7FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    color: '#4338CA',
    fontSize: 11,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  catalogPickerBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 10,
  },
  inventoryResultsList: {
    gap: 6,
  },
  inventoryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
  },
  itemSection: {
    fontSize: 11,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  selectChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noResultsBox: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    fontSize: 13,
  },
  requestLink: {
    marginTop: 8,
  },
  requestLinkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  requestDialogBox: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dialogTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  dialogDesc: {
    fontSize: 12,
    marginBottom: 10,
  },
  dialogInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#78350F',
    marginBottom: 10,
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  dialogCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  dialogCancelText: {
    color: '#92400E',
    fontSize: 13,
    fontWeight: '600',
  },
  dialogSubmitBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dialogSubmitText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  th: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyTableState: {
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  emptyTableText: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  emptyTableSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    gap: 8,
  },
  rowCol: {
    justifyContent: 'center',
  },
  indexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  ingredientNameInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  qtyInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  unitSelectorWrap: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
