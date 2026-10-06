import { AddressItem } from '../context/PreferencesContext';

export interface DeliveryAddressSnapshot {
  id?: string;
  name: string;
  phone: string;
  flatAndStreet: string;
  areaAndLandmark: string;
  city: string;
  state?: string;
  pincode: string;
  tag: 'Home' | 'Work' | 'Other';
  deliveryInstructions?: string;
  formattedAddress: string;
  savedAt: string;
}

export interface AddressValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates an address input before saving or using for delivery.
 */
export function validateAddress(address: Partial<AddressItem>): AddressValidationResult {
  const errors: Record<string, string> = {};

  if (!address.name?.trim()) {
    errors.name = 'Full name is required';
  }

  const phone = (address.phone || '').replace(/\D/g, '');
  if (!phone || phone.length < 10) {
    errors.phone = 'Valid 10-digit phone number is required';
  }

  if (!address.flatAndStreet?.trim()) {
    errors.flatAndStreet = 'Flat, house or building name is required';
  }

  if (!address.city?.trim()) {
    errors.city = 'City is required';
  }

  const pincode = (address.pincode || '').replace(/\D/g, '');
  if (!pincode || pincode.length !== 6) {
    errors.pincode = 'Valid 6-digit Indian PIN code is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Formats an AddressItem into a clear multi-line string for display.
 */
export function formatAddressMultiLine(address: Partial<AddressItem>): string {
  const parts: string[] = [];

  if (address.name) {
    const phonePart = address.phone ? ` (${address.phone})` : '';
    parts.push(`${address.name}${phonePart}`);
  }

  if (address.flatAndStreet) {
    parts.push(address.flatAndStreet);
  }

  if (address.areaAndLandmark) {
    parts.push(address.areaAndLandmark);
  }

  const cityPin: string[] = [];
  if (address.city) cityPin.push(address.city);
  if (address.pincode) cityPin.push(address.pincode);
  if (cityPin.length > 0) parts.push(cityPin.join(' - '));

  return parts.join('\n');
}

/**
 * Formats an AddressItem into a single-line string for database storage or summary rows.
 */
export function formatAddressSingleLine(address: Partial<AddressItem>): string {
  const parts: string[] = [];
  if (address.flatAndStreet?.trim()) parts.push(address.flatAndStreet.trim());
  if (address.areaAndLandmark?.trim()) parts.push(address.areaAndLandmark.trim());
  if (address.city?.trim()) parts.push(address.city.trim());
  if (address.pincode?.trim()) parts.push(address.pincode.trim());
  return parts.join(', ');
}

/**
 * Creates an immutable delivery address snapshot for storage in the `orders` table
 * under `delivery_address_snapshot JSONB`. This ensures changes to the customer's
 * address book do not modify past historical delivery addresses.
 */
export function createDeliveryAddressSnapshot(
  address: AddressItem,
  deliveryInstructions?: string,
): DeliveryAddressSnapshot {
  return {
    id: address.id,
    name: address.name || '',
    phone: address.phone || '',
    flatAndStreet: address.flatAndStreet || '',
    areaAndLandmark: address.areaAndLandmark || '',
    city: address.city || '',
    pincode: address.pincode || '',
    tag: address.tag || 'Home',
    deliveryInstructions: deliveryInstructions?.trim() || undefined,
    formattedAddress: formatAddressSingleLine(address),
    savedAt: new Date().toISOString(),
  };
}
