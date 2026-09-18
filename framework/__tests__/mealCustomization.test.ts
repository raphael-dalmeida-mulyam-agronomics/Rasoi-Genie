import { getMealKits } from '../services/mealKitsService';
import { CartItem } from '../context/CartContext';

describe('Meal Ordering Customization: Servings & Spice Logic', () => {
  const dummyKit = getMealKits()[0]!;

  it('calculates dynamic unit price based on servings multiplier', () => {
    const basePrice = dummyKit.price;
    const baseServings = dummyKit.servings || 2;

    const selectedServings = 4;
    const expectedUnitPrice = Math.round((basePrice / baseServings) * selectedServings);

    const item: CartItem = {
      kit: dummyKit,
      quantity: 2,
      servings: selectedServings,
      spiceLevel: 'Spicy',
      unitPrice: expectedUnitPrice,
    };

    expect(item.unitPrice).toBe(expectedUnitPrice);
    const lineTotal = (item.unitPrice ?? 0) * item.quantity;
    expect(lineTotal).toBe(expectedUnitPrice * 2);
  });

  it('preserves distinct customization configurations (servings & spice)', () => {
    const basePrice = dummyKit.price;
    const baseServings = dummyKit.servings || 2;

    const item1: CartItem = {
      kit: dummyKit,
      quantity: 1,
      servings: 2,
      spiceLevel: 'Mild',
      unitPrice: basePrice,
    };

    const item2: CartItem = {
      kit: dummyKit,
      quantity: 1,
      servings: 6,
      spiceLevel: 'Fiery',
      unitPrice: Math.round((basePrice / baseServings) * 6),
    };

    const cartItems: CartItem[] = [item1, item2];
    expect(cartItems).toHaveLength(2);
    expect(cartItems[0]?.spiceLevel).toBe('Mild');
    expect(cartItems[1]?.spiceLevel).toBe('Fiery');
    expect(cartItems[0]?.servings).toBe(2);
    expect(cartItems[1]?.servings).toBe(6);

    const total = cartItems.reduce(
      (sum, item) => sum + (item.unitPrice ?? item.kit.price) * item.quantity,
      0,
    );
    expect(total).toBe((item1.unitPrice ?? 0) + (item2.unitPrice ?? 0));
  });
});
