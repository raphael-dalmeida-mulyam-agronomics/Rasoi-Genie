import React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../framework/theme/ThemeContext';
import { Icon } from '../../framework/ui/Icon';
import { LocationOnboardingView } from './LocationOnboardingView';
import { RegionHub } from '../../framework/services/mealKitsService';

export interface LocationPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onLocationChanged?: (loc: { city: string; pincode: string; hub: RegionHub }) => void;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  visible,
  onClose,
  onLocationChanged,
}) => {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[styles.modalWrapper, { backgroundColor: colors.bgPrimary, paddingTop: insets.top }]}
      >
        <View style={[styles.topBar, { borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity
            testID="close-location-modal-btn"
            onPress={onClose}
            style={styles.closeBtn}
          >
            <Icon name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            Choose Delivery Location
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <LocationOnboardingView
          isModal
          onLocationSelected={(loc) => {
            if (onLocationChanged) onLocationChanged(loc);
            onClose();
          }}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalWrapper: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
});
