import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { usePreferences, AddressItem } from '../../framework/context/PreferencesContext';
import { useAuth } from '../../framework/context/AuthContext';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Badge } from '../../framework/ui/Badge';
import { Button } from '../../framework/ui/Button';

export const AddressBookView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { user } = useAuth();
  const { addresses, addAddress, deleteAddress, setDefaultAddress } = usePreferences();
  const { colors, radii, shadows } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState(user?.displayName || '');
  const [phone, setPhone] = useState(user?.phoneNumber || '');
  const [flatAndStreet, setFlatAndStreet] = useState('');
  const [areaAndLandmark, setAreaAndLandmark] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [pincode, setPincode] = useState('');
  const [tag, setTag] = useState<'Home' | 'Work' | 'Other'>('Home');

  const handleSave = () => {
    if (!flatAndStreet.trim() || !areaAndLandmark.trim()) {
      Alert.alert('Address Incomplete', 'Please enter your street and area.');
      return;
    }

    addAddress({
      name,
      phone,
      flatAndStreet: flatAndStreet.trim(),
      areaAndLandmark: areaAndLandmark.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      tag,
      isDefault: addresses.length === 0,
    });

    setModalVisible(false);
    setFlatAndStreet('');
    setAreaAndLandmark('');
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
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={{ fontSize: 18, color: colors.textMuted }}>✕</Text>
              </TouchableOpacity>
            </View>

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

            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    backgroundColor: colors.bgSubtle,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                  },
                ]}
                placeholder="City"
                value={city}
                onChangeText={setCity}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
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
            </View>

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
});
