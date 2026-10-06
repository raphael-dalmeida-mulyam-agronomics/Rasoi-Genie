import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../framework/context/AuthContext';
import { usePreferences } from '../../framework/context/PreferencesContext';
import {
  getCitiesForState,
  getStates,
  getSubRegionsForCity,
} from '../../framework/services/regionService';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';
import { Icon } from '../../framework/ui/Icon';

const ALL_STATES = getStates();
const FieldLabel: React.FC<{
  label: string;
  required?: boolean;
  textColor: string;
  requiredColor: string;
}> = ({ label, required, textColor, requiredColor }) => (
  <Text style={[styles.inputLabel, { color: textColor }]}>
    {label}
    {required ? <Text style={{ color: requiredColor }}> *</Text> : null}
  </Text>
);
export const AddressBookView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const { addresses, addAddress, deleteAddress, setDefaultAddress } = usePreferences();
  const { colors, radii, shadows } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState(
    user?.displayName && !user.displayName.toLowerCase().startsWith('customer')
      ? user.displayName
      : ''
  );
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [flatAndStreet, setFlatAndStreet] = useState('');
  const [areaAndLandmark, setAreaAndLandmark] = useState('');
  
  // State/City/SubRegion for new address
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSubRegion, setSelectedSubRegion] = useState('');
  const [pincode, setPincode] = useState('');
  const [tag, setTag] = useState<'Home' | 'Work' | 'Other'>('Home');

  // Dropdown visibility
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showSubRegionDropdown, setShowSubRegionDropdown] = useState(false);

  // Search text
  const [stateSearchText, setStateSearchText] = useState('');
  const [citySearchText, setCitySearchText] = useState('');

  // Derived options
  const availableCities = selectedState ? getCitiesForState(selectedState) : [];
  const availableSubRegions = selectedCity ? getSubRegionsForCity(selectedCity) : [];

  // Filtered lists
  const filteredStates = stateSearchText
    ? ALL_STATES.filter((s: string) => s.toLowerCase().includes(stateSearchText.toLowerCase()))
    : ALL_STATES;
  const filteredCities = citySearchText && selectedState
    ? availableCities.filter((c: string) => c.toLowerCase().includes(citySearchText.toLowerCase()))
    : availableCities;

  const handleSave = () => {
    if (!flatAndStreet.trim() || !areaAndLandmark.trim()) {
      Alert.alert('Address Incomplete', 'Please enter your street and area.');
      return;
    }
    if (!selectedState) {
      Alert.alert('State Required', 'Please select your state.');
      return;
    }
    if (!selectedCity) {
      Alert.alert('City Required', 'Please select your city.');
      return;
    }

    addAddress({
      name,
      phone,
      flatAndStreet: flatAndStreet.trim(),
      areaAndLandmark: areaAndLandmark.trim(),
      city: selectedCity,
      pincode: pincode.trim(),
      tag,
      isDefault: addresses.length === 0,
    });

    // Reset form
    setModalVisible(false);
    setFlatAndStreet('');
    setAreaAndLandmark('');
    setSelectedState('');
    setSelectedCity('');
    setSelectedSubRegion('');
    setPincode('');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.bgSurface, borderBottomColor: colors.borderLight },
        ]}
      >
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={{ fontSize: 18 }}>←</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Address Book</Text>
        <Button
          title="+ Add"
          size="sm"
          onPress={() => setModalVisible(true)}
          style={{ paddingHorizontal: 14 }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
          Manage your delivery addresses for meal kits & spice boxes.
        </Text>

        {addresses.map((addr) => (
          <View
            key={addr.id}
            style={[
              styles.addressCard,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                borderColor: addr.isDefault ? colors.primary : colors.borderLight,
                borderWidth: addr.isDefault ? 2 : 1,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                <Badge label={addr.tag} variant="accent" size="sm" />
                {addr.isDefault && <Badge label="Default Address" variant="primary" size="sm" />}
              </View>
              <TouchableOpacity onPress={() => deleteAddress(addr.id)}>
                <Text style={[styles.deleteText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.personName, { color: colors.textPrimary }]}>{addr.name}</Text>
            <Text style={[styles.addressText, { color: colors.textSecondary }]}>
              {addr.flatAndStreet}, {addr.areaAndLandmark}
            </Text>
            <Text style={[styles.cityText, { color: colors.textSecondary }]}>
              {addr.city} - {addr.pincode}
            </Text>
            <Text style={[styles.phoneText, { color: colors.textMuted }]}>Phone: {addr.phone}</Text>

            {!addr.isDefault && (
              <TouchableOpacity
                style={styles.setDefaultBtn}
                onPress={() => setDefaultAddress(addr.id)}
              >
                <Text style={[styles.setDefaultText, { color: colors.primary }]}>
                  Set as Default Address
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add Address Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.bgSurface,
                borderRadius: radii.xl,
                ...shadows.card,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Add New Delivery Address
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="close" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FieldLabel label="Contact Name" textColor={colors.textSecondary} requiredColor={colors.danger} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Contact Name"
              value={name}
              onChangeText={setName}
            />
            <FieldLabel label="Mobile Phone Number" textColor={colors.textSecondary} requiredColor={colors.danger} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Mobile Phone Number"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />
            <FieldLabel label="Flat / Building / House No." required textColor={colors.textSecondary} requiredColor={colors.danger} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Flat / Building / House No."
              value={flatAndStreet}
              onChangeText={setFlatAndStreet}
            />
            <FieldLabel label="Street, Landmark, Area" required textColor={colors.textSecondary} requiredColor={colors.danger} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Street, Landmark, Area"
              value={areaAndLandmark}
              onChangeText={setAreaAndLandmark}
            />

            {/* State Selection */}
            <View>
              <FieldLabel label="State" required textColor={colors.textSecondary} requiredColor={colors.danger} />
              <View style={[styles.pickerContainer, { backgroundColor: colors.bgSubtle, borderColor: showStateDropdown ? colors.primary : colors.border, borderRadius: radii.md }]}>
                <TextInput
                  style={[styles.pickerInput, { color: colors.textPrimary }]}
                  placeholder="Select or type state"
                  placeholderTextColor={colors.textMuted}
                  value={selectedState || stateSearchText}
                  onChangeText={(text) => {
                    setStateSearchText(text);
                    setSelectedState('');
                    if (text.length > 0) setShowStateDropdown(true);
                  }}
                  onFocus={() => setShowStateDropdown(true)}
                  onBlur={() => setTimeout(() => setShowStateDropdown(false), 200)}
                />
                <TouchableOpacity onPress={() => setShowStateDropdown(!showStateDropdown)}>
                  <Icon name={showStateDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {showStateDropdown && filteredStates.length > 0 && (
                <View style={[styles.dropdownList, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
                  <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                    {filteredStates.map((state) => (
                      <TouchableOpacity
                        key={state}
                        style={[styles.dropdownItem, selectedState === state && { backgroundColor: colors.primaryLight }]}
                        onPress={() => {
                          setSelectedState(state);
                          setSelectedCity('');
                          setSelectedSubRegion('');
                          setShowStateDropdown(false);
                          setStateSearchText('');
                        }}
                      >
                        <Text style={{ color: selectedState === state ? colors.primary : colors.textPrimary }}>{state}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* City Selection */}
            {!!selectedState && (
              <View>
                <FieldLabel label="City" required textColor={colors.textSecondary} requiredColor={colors.danger} />
                <View style={[styles.pickerContainer, { backgroundColor: colors.bgSubtle, borderColor: showCityDropdown ? colors.primary : colors.border, borderRadius: radii.md }]}>
                  <TextInput
                    style={[styles.pickerInput, { color: colors.textPrimary }]}
                    placeholder="Select or type city"
                    placeholderTextColor={colors.textMuted}
                    value={selectedCity || citySearchText}
                    onChangeText={(text) => {
                      setCitySearchText(text);
                      setSelectedCity('');
                      if (text.length > 0) setShowCityDropdown(true);
                    }}
                    onFocus={() => setShowCityDropdown(true)}
                    onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
                  />
                  <TouchableOpacity onPress={() => setShowCityDropdown(!showCityDropdown)}>
                    <Icon name={showCityDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {showCityDropdown && filteredCities.length > 0 && (
                  <View style={[styles.dropdownList, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      {filteredCities.map((city) => (
                        <TouchableOpacity
                          key={city}
                          style={[styles.dropdownItem, selectedCity === city && { backgroundColor: colors.primaryLight }]}
                          onPress={() => {
                            setSelectedCity(city);
                            setSelectedSubRegion('');
                            setShowCityDropdown(false);
                            setCitySearchText('');
                          }}
                        >
                          <Text style={{ color: selectedCity === city ? colors.primary : colors.textPrimary }}>{city}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Sub-Region Selection */}
            {!!selectedCity && availableSubRegions.length > 0 && (
              <View>
                <FieldLabel label="Area/Neighbourhood" required textColor={colors.textSecondary} requiredColor={colors.danger} />
                <View style={[styles.pickerContainer, { backgroundColor: colors.bgSubtle, borderColor: showSubRegionDropdown ? colors.primary : colors.border, borderRadius: radii.md }]}>
                  <TextInput
                    style={[styles.pickerInput, { color: colors.textPrimary }]}
                    placeholder="Select area"
                    placeholderTextColor={colors.textMuted}
                    value={selectedSubRegion ? availableSubRegions.find((sr) => sr.id === selectedSubRegion)?.name || '' : ''}
                    onChangeText={() => {}}
                    onFocus={() => setShowSubRegionDropdown(true)}
                    onBlur={() => setTimeout(() => setShowSubRegionDropdown(false), 200)}
                  />
                  <TouchableOpacity onPress={() => setShowSubRegionDropdown(!showSubRegionDropdown)}>
                    <Icon name={showSubRegionDropdown ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {showSubRegionDropdown && (
                  <View style={[styles.dropdownList, { backgroundColor: colors.bgSurface, borderColor: colors.border }]}>
                    <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                      <TouchableOpacity
                        style={[styles.dropdownItem, !selectedSubRegion && { backgroundColor: colors.primaryLight }]}
                        onPress={() => {
                          setSelectedSubRegion('');
                          setShowSubRegionDropdown(false);
                        }}
                      >
                        <Text style={{ color: !selectedSubRegion ? colors.primary : colors.textPrimary }}>{'All areas in ' + selectedCity}</Text>
                      </TouchableOpacity>
                      {availableSubRegions.map((sr) => (
                        <TouchableOpacity
                          key={sr.id}
                          style={[styles.dropdownItem, selectedSubRegion === sr.id && { backgroundColor: colors.primaryLight }]}
                          onPress={() => {
                            setSelectedSubRegion(sr.id);
                            setShowSubRegionDropdown(false);
                          }}
                        >
                          <Text style={{ color: selectedSubRegion === sr.id ? colors.primary : colors.textPrimary }}>{sr.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Pincode */}
            <FieldLabel label="Pincode" required textColor={colors.textSecondary} requiredColor={colors.danger} />
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSubtle,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                },
              ]}
              placeholder="Pincode"
              value={pincode}
              onChangeText={setPincode}
              keyboardType="numeric"
            />

            <View style={styles.tagRow}>
              {(['Home', 'Work', 'Other'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.tagOption,
                    {
                      backgroundColor: tag === t ? colors.primary : colors.bgSubtle,
                      borderColor: tag === t ? colors.primary : colors.border,
                      borderRadius: radii.pill,
                    },
                  ]}
                  onPress={() => setTag(t)}
                >
                  <Text
                    style={{ color: tag === t ? '#fff' : colors.textPrimary, fontWeight: '700' }}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Button title="Save Delivery Address" onPress={handleSave} style={{ marginTop: 10 }} />
          </View>
        </View>
      </Modal>
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
  backBtn: {
    padding: 6,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  scrollBody: {
    padding: 16,
    paddingBottom: 90,
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 14,
  },
  addressCard: {
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '700',
  },
  personName: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cityText: {
    fontSize: 13,
    marginTop: 2,
  },
  phoneText: {
    fontSize: 12,
    marginTop: 4,
  },
  setDefaultBtn: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  setDefaultText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  input: {
    height: 44,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginBottom: 10,
    fontSize: 13,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  tagOption: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    marginTop: 6,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  pickerInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  dropdownList: {
    maxHeight: 150,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  dropdownScroll: {
    maxHeight: 140,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
});
