import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { usePreferences, AddressItem } from '../../framework/context/PreferencesContext';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { validateAddress } from '../../framework/services/addressService';

interface AddressSelectionModalProps {
  visible: boolean;
  selectedAddressId: string;
  onSelectAddress: (address: AddressItem) => void;
  onClose: () => void;
  deliveryInstructions: string;
  onChangeDeliveryInstructions: (instructions: string) => void;
}

export const AddressSelectionModal: React.FC<AddressSelectionModalProps> = ({
  visible,
  selectedAddressId,
  onSelectAddress,
  onClose,
  deliveryInstructions,
  onChangeDeliveryInstructions,
}) => {
  const { user } = useAuth();
  const { colors, radii, shadows, isDark } = useTheme();
  const { addresses, addAddress, defaultAddress } = usePreferences();

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [name, setName] = useState(
    user?.displayName && !user.displayName.toLowerCase().startsWith('customer')
      ? user.displayName
      : ''
  );
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [flatAndStreet, setFlatAndStreet] = useState('');
  const [areaAndLandmark, setAreaAndLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('560103');
  const [tag, setTag] = useState<'Home' | 'Work' | 'Other'>('Home');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSaveNewAddress = async () => {
    const candidate = {
      name: name.trim() || user?.displayName || 'Customer',
      phone: phone.trim() || user?.phoneNumber || '+91 9876543210',
      flatAndStreet: flatAndStreet.trim(),
      areaAndLandmark: areaAndLandmark.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      tag,
      isDefault: addresses.length === 0,
    };

    const validation = validateAddress(candidate);
    if (!validation.valid) {
      setErrors(validation.errors);
      Alert.alert('Incomplete Address', Object.values(validation.errors)[0]);
      return;
    }

    try {
      await addAddress(candidate);
      setIsAddingNew(false);
      setFlatAndStreet('');
      setAreaAndLandmark('');
      setErrors({});
    } catch {
      Alert.alert('Error', 'Could not save address. Please try again.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            { backgroundColor: colors.bgSurface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
          ]}
        >
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: colors.borderLight }]}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {isAddingNew ? 'Add New Address' : 'Select Delivery Address'}
              </Text>
              <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                {isAddingNew ? 'Enter address details below' : `${addresses.length} saved locations`}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {!isAddingNew ? (
              <>
                {/* List of saved addresses */}
                {addresses.map((addr) => {
                  const isSelected = addr.id === selectedAddressId;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={[
                        styles.addressCard,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? '#292524'
                              : '#FFF7ED'
                            : colors.bgPrimary,
                          borderColor: isSelected ? colors.primary : colors.borderLight,
                          borderRadius: radii.lg,
                        },
                      ]}
                      onPress={() => {
                        onSelectAddress(addr);
                        onClose();
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={styles.addressCardTop}>
                        <View style={styles.tagBadgeRow}>
                          <Badge
                            label={addr.tag || 'Home'}
                            variant={addr.tag === 'Home' ? 'accent' : 'neutral'}
                          />
                          {addr.isDefault && <Badge label="Default" variant="success" />}
                        </View>
                        <View
                          style={[
                            styles.radioCircle,
                            {
                              borderColor: isSelected ? colors.primary : colors.borderLight,
                              backgroundColor: isSelected ? colors.primary : 'transparent',
                            },
                          ]}
                        >
                          {isSelected && <Icon name="checkmark" size={14} color="#FFFFFF" />}
                        </View>
                      </View>

                      <Text style={[styles.addressName, { color: colors.textPrimary }]}>
                        {addr.name} • {addr.phone}
                      </Text>
                      <Text style={[styles.addressText, { color: colors.textSecondary }]}>
                        {addr.flatAndStreet}, {addr.areaAndLandmark}
                      </Text>
                      <Text style={[styles.addressCityPin, { color: colors.textMuted }]}>
                        {addr.city} - {addr.pincode}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Delivery Instructions Input */}
                <View style={styles.instructionsSection}>
                  <Text style={[styles.inputLabel, { color: colors.textPrimary }]}>
                    Delivery Instructions (Optional)
                  </Text>
                  <TextInput
                    style={[
                      styles.instructionsInput,
                      {
                        backgroundColor: colors.bgPrimary,
                        borderColor: colors.borderLight,
                        color: colors.textPrimary,
                        borderRadius: radii.md,
                      },
                    ]}
                    placeholder="e.g. Leave with security, ring doorbell twice, avoid calling..."
                    placeholderTextColor={colors.textMuted}
                    value={deliveryInstructions}
                    onChangeText={onChangeDeliveryInstructions}
                    multiline
                    numberOfLines={2}
                  />
                </View>

                {/* Add New Address Button */}
                <Button
                  title="+ Add New Address"
                  variant="outline"
                  onPress={() => setIsAddingNew(true)}
                  style={{ marginTop: 14, marginBottom: 24 }}
                />
              </>
            ) : (
              /* Add New Address Form */
              <View style={styles.newAddressForm}>
                <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Tag as</Text>
                <View style={styles.tagSelectorRow}>
                  {(['Home', 'Work', 'Other'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.tagChoiceBtn,
                        tag === t && { backgroundColor: colors.primary, borderColor: colors.primary },
                        { borderColor: colors.borderLight },
                      ]}
                      onPress={() => setTag(t)}
                    >
                      <Text
                        style={[
                          styles.tagChoiceText,
                          { color: tag === t ? '#FFFFFF' : colors.textPrimary },
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Full Name</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="Recipient Name"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />

                <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textMuted}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                />

                <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Flat, House No, Building</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. Flat 402, Lotus Orchid"
                  placeholderTextColor={colors.textMuted}
                  value={flatAndStreet}
                  onChangeText={setFlatAndStreet}
                />

                <Text style={[styles.formLabel, { color: colors.textPrimary }]}>Area, Landmark, Street</Text>
                <TextInput
                  style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderLight }]}
                  placeholder="e.g. Near HDFC Bank, Sarjapur Road"
                  placeholderTextColor={colors.textMuted}
                  value={areaAndLandmark}
                  onChangeText={setAreaAndLandmark}
                />

                <View style={styles.rowTwoCols}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: colors.textPrimary }]}>City</Text>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderLight }]}
                      placeholder="City"
                      placeholderTextColor={colors.textMuted}
                      value={city}
                      onChangeText={setCity}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.formLabel, { color: colors.textPrimary }]}>PIN Code</Text>
                    <TextInput
                      style={[styles.input, { color: colors.textPrimary, borderColor: colors.borderLight }]}
                      placeholder="PIN"
                      placeholderTextColor={colors.textMuted}
                      value={pincode}
                      onChangeText={setPincode}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={styles.actionRow}>
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setIsAddingNew(false)}
                    style={{ flex: 1 }}
                  />
                  <Button
                    title="Save Address"
                    variant="primary"
                    onPress={handleSaveNewAddress}
                    style={{ flex: 1 }}
                  />
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  addressCard: {
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  addressCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tagBadgeRow: {
    flexDirection: 'row',
    gap: 6,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  addressCityPin: {
    fontSize: 12,
    marginTop: 4,
  },
  instructionsSection: {
    marginTop: 8,
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  instructionsInput: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  newAddressForm: {
    paddingBottom: 24,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    marginTop: 10,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  tagSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
  },
  tagChoiceBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  tagChoiceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowTwoCols: {
    flexDirection: 'row',
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});
