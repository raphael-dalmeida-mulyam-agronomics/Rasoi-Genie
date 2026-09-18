import { supabase } from '../supabase/client';
import { INITIAL_MEAL_KITS, MealKit } from './mealKitsService';
import { INITIAL_MOCK_ORDERS, OrderItem } from '../firebase/ordersService';

export interface SeedResult {
  success: boolean;
  kitsCount: number;
  ordersCount: number;
  message: string;
  error?: string;
}

/**
 * Seeds existing Indian regional meal kits and initial orders into Supabase database.
 */
export async function seedSupabaseDatabase(forceReseed = false): Promise<SeedResult> {
  let kitsCount = 0;
  let ordersCount = 0;

  try {
    // 1. Check existing meal kits in Supabase
    const { data: existingKits, error: fetchKitsError } = await supabase
      .from('meal_kits')
      .select('id');

    const shouldSeedKits = forceReseed || !existingKits || existingKits.length === 0;

    if (shouldSeedKits) {
      const rowsToInsert = INITIAL_MEAL_KITS.map((kit: MealKit) => ({
        id: kit.id,
        name: kit.name,
        tagline: kit.tagline,
        description: kit.description,
        price: kit.price,
        original_price: kit.originalPrice || kit.price,
        cuisine: kit.cuisine,
        region: kit.availableRegions?.[0] || 'North',
        category: kit.dishCategory || 'Curries & Gravies',
        diet_type: kit.diet,
        spice_level: kit.spiceLevel,
        prep_time_minutes: kit.prepTimeMinutes + kit.cookTimeMinutes,
        servings: kit.servings,
        calories: kit.nutrition?.calories || 450,
        image_url: kit.heroImage,
        is_published: true,
        stock_status: 'in_stock',
        ingredients: kit.ingredients || [],
        instructions: (kit.recipeSteps || []).map((s) => ({
          step: s.stepNumber,
          title: s.title,
          instruction: s.instruction,
        })),
        nutrition: kit.nutrition || {},
        masala_sachets: kit.masalaSachets || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: insertKitsError } = await supabase
        .from('meal_kits')
        .upsert(rowsToInsert, { onConflict: 'id' });

      if (insertKitsError) {
        console.warn('[Supabase Seed] Error upserting meal kits:', insertKitsError.message);
      } else {
        kitsCount = rowsToInsert.length;
      }
    } else {
      kitsCount = existingKits.length;
    }

    // 2. Check existing orders in Supabase
    const { data: existingOrders } = await supabase.from('orders').select('id');
    const shouldSeedOrders = forceReseed || !existingOrders || existingOrders.length === 0;

    if (shouldSeedOrders) {
      for (const order of INITIAL_MOCK_ORDERS) {
        await supabase.from('orders').upsert(
          {
            id: order.id,
            user_id: order.userId,
            customer_name: order.customerName || 'Customer',
            customer_phone: order.customerPhone,
            customer_email: order.customerEmail,
            delivery_address: order.deliveryAddress,
            delivery_slot: order.deliverySlot || '6:00 PM - 8:00 PM',
            delivery_date: order.deliveryDate || 'Today',
            subtotal: order.subtotal,
            discount: order.discount || 0,
            delivery_fee: order.deliveryFee || 0,
            total_amount: order.totalAmount,
            status: order.status,
            payment_method: order.paymentMethod,
            payment_status: order.paymentStatus,
            transaction_id: order.transactionId,
            created_at: order.createdAt,
            updated_at: order.updatedAt,
          },
          { onConflict: 'id' },
        );

        if (order.items && order.items.length > 0) {
          const itemRows = order.items.map((item: OrderItem, idx: number) => ({
            order_id: order.id,
            kit_id: item.id || `kit-${idx}`,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            servings: 2,
            spice_level: 'Medium',
            masala_sachets: item.masalaSachets || [],
            image_url: item.imageUrl,
          }));

          await supabase.from('order_items').insert(itemRows);
        }
        ordersCount++;
      }
    } else {
      ordersCount = existingOrders.length;
    }

    return {
      success: true,
      kitsCount,
      ordersCount,
      message: `Successfully synced ${kitsCount} meal kits and ${ordersCount} orders with Supabase!`,
    };
  } catch (err: any) {
    return {
      success: false,
      kitsCount,
      ordersCount,
      message: 'Failed to seed Supabase database',
      error: err?.message || String(err),
    };
  }
}
