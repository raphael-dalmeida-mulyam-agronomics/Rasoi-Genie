// framework/services/seedInventoryFromMealKits.ts
// Reads meal kit catalog and adds every ingredient into inventory with category,
// removing adjectives and eliminating duplicates.

import {
  addInventoryItem,
  deduplicateAndCleanInventoryStore,
  deleteInventoryItem,
  getInventoryItems,
  InventoryItem,
  InventorySection,
  updateInventoryItem,
} from './inventoryService';
import { INITIAL_MEAL_KITS, MealKit } from './mealKitsService';

/**
 * Comprehensive canonical map for meal kit ingredients and inventory items.
 * Strips descriptive marketing adjectives while preserving functional cuts and varieties.
 */
export const CANONICAL_MAP: Record<string, string> = {
  '48-hr Fermented Sourdough Dough Balls (2 pcs)': 'Sourdough Dough Balls',
  'Adobo Marinated Tender Chicken Strips': 'Chicken Strips',
  'Aged English White Cheddar Slices': 'White Cheddar Slices',
  'Aged Italian Parmigiano Reggiano Block': 'Parmigiano Reggiano',
  'Aged Italian Pecorino Romano Block': 'Pecorino Romano',
  'Aged Royal Daawat Basmati Rice': 'Basmati Rice',
  'Aged Sharp Wisconsin Cheddar Slices': 'Cheddar Slices',
  'Almond & Coconut Velvet Cream Base': 'Almond Coconut Cream Base',
  'Almond Slivered': 'Slivered Almonds',
  'Artisan Stone-Ground Corn Tortillas (6 pcs)': 'Corn Tortillas',
  'Artisanal Black Truffle Garlic Aioli Sachet': 'Truffle Garlic Aioli',
  'Artisanal Golden Brioche Buns (2 pcs)': 'Brioche Buns',
  'Artisanal White Butter': 'White Butter',
  'Artisanal Whole Italian Burrata Ball': 'Burrata',
  'Asafoetida (Hing)': 'Asafoetida (Hing)',
  'Asafoetida (Hing) & Turmeric': 'Asafoetida (Hing) & Turmeric',
  'Authentic Kasundi Mustard Dip Pouch': 'Kasundi Mustard Dip',
  'Avocado-Lime Crema Drizzle Pouch': 'Avocado Lime Crema',
  'Bakery Butter Brioche Buns (2 pcs)': 'Brioche Buns',
  'Bhuna Jeera (Roasted Cumin)': 'Roasted Cumin Powder',
  'Birista (Crispy Fried Onions)': 'Crispy Onions',
  'Black Beans': 'Black Beans',
  'Black Cardamom & Cinnamon': 'Black Cardamom & Cinnamon',
  'Black Mustard Seeds (Rai)': 'Mustard Seeds',
  'Boiled Diced Baby Potatoes': 'Boiled Baby Potatoes',
  'Byadgi & Lavangi Red Chilli Essence': 'Red Chilli Essence',
  Capsicum: 'Capsicum',
  'Cashew & Melon Seed Paste': 'Cashew & Melon Seed Paste',
  'Celery & Onion Salt': 'Celery & Onion Salt',
  'Charred Bell Pepper Fajita Strips': 'Fajita Bell Pepper Strips',
  'Charred Red Onion Slices': 'Sliced Red Onions',
  'Chilli Garlic Paste': 'Chilli Garlic Paste',
  'Chipotle Chilli & Sea Salt': 'Chipotle Chilli & Sea Salt',
  'Cilantro-Lime Parboiled Brown Rice': 'Cilantro Lime Rice',
  'Cinnamon & Cloves': 'Cinnamon & Cloves',
  'Cloves & Shahi Jeera': 'Cloves & Shahi Jeera',
  'Coarse Roasted Cumin': 'Roasted Cumin Powder',
  'Coarse Roasted Peanuts': 'Roasted Peanuts',
  'Coarse Tellicherry Black Pepper': 'Cracked Black Pepper',
  'Coarsely Crushed Black Pepper': 'Cracked Black Pepper',
  'Coconut & Poppy Seed Paste': 'Coconut & Poppy Seed Paste',
  'Cold-Pressed Mustard Oil Pouch': 'Mustard Oil',
  'Cold-Pressed Sesame (Gingelly) Oil Pouch': 'Sesame Oil',
  'Cold-Pressed Spanish Olive Oil': 'Olive Oil',
  'Compound Hing': 'Asafoetida (Hing)',
  'Cooked Cilantro-Lime Fluffy Rice Pouch': 'Cilantro Lime Rice',
  'Cooked Spiced Toor Dal Base': 'Toor Dal Base',
  'Cracked Black Pepper': 'Cracked Black Pepper',
  'Crinkle-Cut Tangy Dill Pickles': 'Dill Pickles',
  'Crispy Fried Barista Onions': 'Crispy Onions',
  'Crispy Tortilla Strips': 'Tortilla Strips',
  'Crushed Provencal Plum Tomatoes': 'Crushed Tomatoes',
  'Crushed Rosemary & Thyme': 'Rosemary & Thyme',
  'Crushed San Marzano Tomato Sugo Pouch': 'Tomato Sugo',
  'Cumin & Fenugreek Seeds': 'Cumin & Fenugreek Seeds',
  'Dark Soya Sauce': 'Dark Soya Sauce',
  'Desi Ghee (5L)': 'Desi Ghee',
  'Diced Red Bell Pepper': 'Diced Red Bell Pepper',
  'Diced Red Onions': 'Diced Red Onions',
  'Diced White Onions': 'Diced White Onions',
  'Diced Yellow Bell Pepper': 'Diced Yellow Bell Pepper',
  'Dried French Thyme': 'Dried Thyme',
  'Dried Oregano': 'Dried Oregano',
  'Dried Red Kashmiri Chillies': 'Kashmiri Chillies',
  'Dried Thyme & Rosemary': 'Thyme & Rosemary',
  'Dry Garlic & Byadgi Chilli': 'Garlic & Byadgi Chilli',
  'Eggless Hakka Noodles Pack': 'Hakka Noodles',
  'Extra Virgin Olive Oil Pouch': 'Extra Virgin Olive Oil',
  'Fennel Seeds (Saunf)': 'Fennel Seeds',
  'Finely Chopped Red Onions': 'Diced Red Onions',
  'Finely Diced White Onions': 'Diced White Onions',
  'Fior di Latte Diced Mozzarella': 'Diced Mozzarella',
  'Fire-Roasted Tomato Puree': 'Tomato Puree',
  'Fire-Roasted Tomato Salsa Pouch': 'Tomato Salsa',
  'Flaky Brittany Sea Salt': 'Sea Salt',
  'French Marjoram & Oregano': 'Marjoram & Oregano',
  'Fresh Baby Spinach Leaves': 'Baby Spinach',
  'Fresh Button Mushrooms': 'Button Mushrooms',
  'Fresh Cilantro': 'Coriander Leaves',
  'Fresh Coriander': 'Coriander Leaves',
  'Fresh Cream': 'Cooking Cream',
  'Fresh Cremini Mushrooms': 'Cremini Mushrooms',
  'Fresh Curry Leaves': 'Curry Leaves',
  'Fresh Curry Leaves Sprig': 'Curry Leaves',
  'Fresh Cut Cauliflower Florets': 'Cauliflower Florets',
  'Fresh De-Veined Tiger Prawns': 'Tiger Prawns',
  'Fresh Farm Chicken Curry Cuts': 'Chicken Curry Cut',
  'Fresh Genovese Basil Sprig': 'Basil Leaves',
  'Fresh Ginger-Garlic Paste': 'Ginger Garlic Paste',
  'Fresh Green Chillies': 'Green Chillies',
  'Fresh Green Coriander Leaves': 'Coriander Leaves',
  'Fresh Green Zucchini Rounds': 'Zucchini Rounds',
  'Fresh Handmade Durum Fettuccine Nests': 'Fettuccine Pasta',
  'Fresh Handmade Durum Pappardelle Nests': 'Pappardelle Pasta',
  'Fresh Juicy Lemon': 'Lemon',
  'Fresh Key Lime': 'Lime',
  'Fresh Malai Paneer Cubes': 'Paneer Cubes',
  'Fresh Pico de Gallo Tomato Salsa': 'Tomato Salsa',
  'Fresh Porcini Mushrooms': 'Porcini Mushrooms',
  'Fresh Pune Bakery Ladi Pav': 'Ladi Pav',
  'Fresh Shiitake Mushrooms': 'Shiitake Mushrooms',
  'Fresh Spring Onions': 'Spring Onions',
  'Fresh Tomato Puree Pouch': 'Tomato Puree',
  'Fresh White Butter (Loni)': 'White Butter',
  'Garam Masala Blend': 'Garam Masala',
  'Garam Masala Dust': 'Garam Masala',
  'Garlic Herb Croutons': 'Garlic Herb Croutons',
  'Garlic Pods': 'Garlic Cloves',
  'Ginger Garlic & Spiced Oil Base': 'Ginger Garlic & Spiced Oil Base',
  'Green Cardamom (Elaichi)': 'Green Cardamom',
  'Green Chilli': 'Green Chillies',
  'Ground White Pepper': 'White Pepper Powder',
  'Himalayan Pink Salt': 'Pink Salt',
  'Italian Dairy Cooking Cream Pouch': 'Cooking Cream',
  'Italian San Marzano Tomato Passata': 'Tomato Passata',
  'Kala Namak & Sea Salt': 'Black Salt & Sea Salt',
  'Kala Namak (Black Salt)': 'Black Salt',
  'Kashmiri & Guntur Red Chillies': 'Kashmiri & Guntur Red Chillies',
  'Kashmiri Saffron & Kewra Water Infusion': 'Saffron Kewra Infusion',
  'Kashmiri Saffron Strands': 'Saffron',
  'Layered Flaky Paratha Dough Sheets (4 pcs)': 'Paratha Dough Sheets',
  'Lime-Pickled Purple Cabbage Slaw': 'Pickled Cabbage Slaw',
  'Mace (Javitri) & Nutmeg': 'Mace & Nutmeg',
  'Mangalorean Stone-Ground Byadgi Chili Paste': 'Byadgi Chili Paste',
  'Marinated Tender Chicken Cuts': 'Chicken Curry Cut',
  'Minced Garlic': 'Minced Garlic',
  'Minced Ginger': 'Minced Ginger',
  'Mustard Seeds': 'Mustard Seeds',
  'Mustard Seeds & Cumin': 'Mustard Seeds & Cumin',
  'Natural Organic Jaggery & Kokum Pouch': 'Jaggery & Kokum Extract',
  'Panko Crusted Avocado Wedges': 'Avocado Wedges',
  'Paper Cups (8oz)': 'Paper Cups',
  'Peeled Garlic Cloves': 'Garlic Cloves',
  'Peeled Sambar Shallots': 'Sambar Shallots',
  'Pickled Onion & Green Chili Salad': 'Pickled Onion Salad',
  'Pre-Cooked Rajma (Kidney Beans)': 'Boiled Rajma',
  'Pre-Cooked Slow-Brew Black Lentils (Urad Dal)': 'Boiled Urad Dal',
  'Pre-Seasoned Mushroom & Black Bean Smash Patties': 'Mushroom Black Bean Patties',
  'Pre-Soaked Non-Sticky Sago Pearls (Sabudana)': 'Sabudana',
  'Pre-cooked Tender Chickpeas': 'Boiled Chickpeas',
  'Premium Roasted Chana Besan (Gram Flour)': 'Roasted Chana Besan',
  'Prime Seasoned Smash Patties (4 pcs)': 'Smash Patties',
  'Pure Cow Desi Ghee': 'Desi Ghee',
  'Pure Cow Desi Ghee Pouch': 'Desi Ghee',
  'Pure Desi Cow Ghee': 'Desi Ghee',
  'Pure Desi Ghee': 'Desi Ghee',
  'Pure Desi Ghee Pouch': 'Desi Ghee',
  'Pure White Truffle Infused Olive Oil': 'Truffle Olive Oil',
  'Raw Cane Sugar Powder': 'Cane Sugar Powder',
  'Raw Roasted Gujarat Peanuts': 'Roasted Peanuts',
  'Red Chilli Powder & Turmeric': 'Red Chilli Powder & Turmeric',
  'Red Masoor Dal (Split Red Lentils)': 'Red Masoor Dal',
  'Rich Dairy Cooking Cream Pouch': 'Cooking Cream',
  'Rich Spiced Chili Dipping Consomé Broth': 'Spiced Chili Consomé Broth',
  'Roasted Coconut & Charred Onion Paste': 'Roasted Coconut & Onion Paste',
  'Roasted Coriander Seeds': 'Coriander Seeds',
  'Roasted Cumin & Ajwain (Carom)': 'Cumin & Ajwain',
  'Roasted Cumin & Black Salt Tadka': 'Roasted Cumin & Black Salt',
  'Roasted Cumin & Coriander Powder': 'Cumin & Coriander Powder',
  'Roasted Cumin Powder': 'Roasted Cumin Powder',
  'Roasted Garlic Granules': 'Garlic Powder',
  'Roasted Garlic Powder': 'Garlic Powder',
  'Roasted Peanut Dust': 'Crushed Peanuts',
  'Roasted White Sesame Seeds (Til)': 'White Sesame Seeds',
  'Rock Salt & Garlic Flakes': 'Rock Salt & Garlic Flakes',
  'Rock Salt (Sendha Namak)': 'Sendha Namak (Rock Salt)',
  'Rose Petal Powder': 'Rose Petal Powder',
  'Royal Aged Basmati Rice': 'Basmati Rice',
  'Sachet 1: Awadhi Khada Potli Masala': 'Khada Potli Masala',
  'Sachet 1: Biryani Marinade Booster (Shahi Jeera, Mace, Star Anise)': 'Biryani Marinade Booster',
  'Sachet 1: French Thyme & White Pepper Chowder Dust': 'Thyme & White Pepper Chowder Dust',
  'Sachet 1: Garam Masala & Fenugreek Low-Carb Blend': 'Garam Masala & Fenugreek Blend',
  'Sachet 1: Ghee Roast Cumin-Fennel Roasted Powder': 'Ghee Roast Spice Powder',
  'Sachet 1: Herbes de Provence & Sea Salt Blend': 'Herbes de Provence',
  'Sachet 1: Kathiyawadi Rai-Hing Tadka Masala': 'Rai-Hing Tadka Masala',
  'Sachet 1: Kolkata Chaat & Roasted Cumin Dust': 'Chaat Masala & Cumin Dust',
  'Sachet 1: Mexican Spiced Chili Oil for Tortilla Dip': 'Spiced Chili Oil',
  'Sachet 1: Puneri Goda Masala & Hing Tadka': 'Goda Masala & Hing Tadka',
  'Sachet 1: Puneri Khichdi Jeera & Sendha Namak Blend': 'Jeera & Sendha Namak Blend',
  'Sachet 1: Puneri Pithla Tempering Spice Blend': 'Pithla Tempering Spice Blend',
  'Sachet 1: Puneri Thalipeeth Seasoning Sachet': 'Thalipeeth Seasoning',
  'Sachet 1: Roasted Cumin & Black Salt Tadka': 'Roasted Cumin & Black Salt',
  'Sachet 1: Secret Diner Burger Relish & Sauce Pouch': 'Burger Relish',
  'Sachet 1: Smoked Kashmiri Chilli & Degi Mirch Premix': 'Kashmiri Chilli & Degi Mirch Premix',
  'Sachet 1: Smoked Paprika & Cumin Infusion': 'Smoked Paprika & Cumin Infusion',
  'Sachet 1: Smoked Paprika & Sea Salt Finishing Dust': 'Smoked Paprika & Sea Salt Dust',
  'Sachet 1: Smoky Chipotle Lime Crema Sauce Pouch': 'Chipotle Lime Crema',
  'Sachet 1: Smoky Fajita Char Seasoning': 'Fajita Seasoning',
  'Sachet 1: Stone-Ground Karaikudi Masala': 'Karaikudi Masala',
  'Sachet 1: Tangy Manchurian Dark Sauce Pouch': 'Manchurian Sauce',
  'Sachet 1: Tomatillo Salsa Verde Pouch': 'Tomatillo Salsa Verde',
  'Sachet 1: Tuscan Herb Infusion (Oregano, Rosemary & Cracked Pepper)': 'Tuscan Herb Blend',
  'Sachet 1: Tuscan Oregano & Crushed Chili Flake Blend': 'Tuscan Oregano & Chili Flakes',
  'Sachet 1: Tuscan Rosemary, Garlic & Cracked Pepper Dust': 'Tuscan Rosemary Garlic Dust',
  'Sachet 1: Whole Khada Masala (Cardamom, Clove, Cinnamon, Bayleaf)': 'Whole Khada Masala',
  'Sachet 1: Wildflower Hot Honey Drizzle Pouch': 'Hot Honey',
  'Sachet 2: Ancho Chili & Lime Fajita Seasoning': 'Ancho Chili & Lime Seasoning',
  'Sachet 2: Authentic Maharashtrian Thecha Masala': 'Thecha Masala',
  'Sachet 2: Clove & Nutmeg Slow-Roast Spice Dust': 'Clove & Nutmeg Spice Dust',
  'Sachet 2: Dried Oregano & Sicilian Sea Salt': 'Oregano & Sea Salt',
  'Sachet 2: Extra Virgin Garlic Olive Oil Drizzle': 'Garlic Olive Oil',
  'Sachet 2: Extra Virgin Olive Oil Pouch': 'Extra Virgin Olive Oil',
  'Sachet 2: House Umami Smash Burger Salt': 'Burger Seasoning Salt',
  'Sachet 2: Indo-Chinese Wok Spice Seasoning': 'Wok Spice Seasoning',
  'Sachet 2: Mexican Tajin & Cumin Seasoning Dust': 'Tajin & Cumin Seasoning',
  'Sachet 2: Peppercorn & Stone Flower Finishing Masala': 'Peppercorn & Stone Flower Masala',
  'Sachet 2: Rice Parboiling Whole Spices': 'Parboiling Whole Spices',
  'Sachet 2: Royal Zafrani Shahi Spice Blend': 'Zafrani Shahi Spice Blend',
  'Sachet 2: Shahi Gravy Premix (Kashmiri Mirch, Coriander, Ginger)': 'Shahi Gravy Premix',
  'Sachet 2: Shengdana (Peanut) Garlic Chutney': 'Peanut Garlic Chutney',
  'Sachet 2: Teja Kat Tarri Gravy Paste': 'Teja Kat Tarri Gravy Paste',
  'Sachet 2: Tellicherry Black Pepper & Fennel Tadka': 'Black Pepper & Fennel Tadka',
  'Sachet 2: Toasted Garlic Herb Salt': 'Garlic Herb Salt',
  'Sachet 2: Toasted Mexican Lime Oregano Dust': 'Lime Oregano Dust',
  'Sachet 3: Dum Layering Potpourri & Mint Sachet': 'Dum Mint Spice Blend',
  'Sachet 3: Roasted Kasuri Methi & Garam Masala Aroma Finish': 'Kasuri Methi & Garam Masala',
  'Sachet 3: Sun-Dried Kasuri Methi Sachet': 'Kasuri Methi',
  'Sachet 4: Rose & Kewra Aroma Mist Pouch': 'Rose & Kewra Water',
  'Saffron Strands': 'Saffron',
  'Salt & Cumin': 'Salt & Cumin',
  'Salted Butter Block': 'Salted Butter',
  'San Marzano Tomato & Oregano Marinara': 'Marinara Sauce',
  'Sea Salt & Onion Powder': 'Sea Salt & Onion Powder',
  'Seasoned Cuban Black Beans': 'Black Beans',
  'Sesame Oil (1L)': 'Sesame Oil',
  'Shredded Mexican Oaxaca Melting Cheese': 'Oaxaca Cheese',
  'Shredded Monterey Jack Cheese': 'Monterey Jack Cheese',
  'Simmered Spiced Black Bean Mash Pouch': 'Black Bean Mash',
  'Sliced Red Onion': 'Sliced Red Onions',
  'Sliced Tri-Color Fajita Bell Peppers': 'Fajita Bell Pepper Strips',
  'Slow Caramelized Sweet Diced Onions': 'Caramelized Onions',
  'Slow-Cooked Caramelized Onion Jam Pouch': 'Caramelized Onion Jam',
  'Slow-Cooked Shredded Chicken in Birria Adobo': 'Shredded Chicken',
  'Slow-Roasted Crushed Peanuts (Shengdana Kut)': 'Crushed Peanuts',
  'Smoked Cupping Pepperoni Slices': 'Pepperoni Slices',
  'Smoked Paprika & Mexican Oregano': 'Smoked Paprika & Oregano',
  'Smoked Tikka Marinade Paste': 'Tikka Marinade Paste',
  'Spanish Smoked Pimentón': 'Smoked Paprika',
  'Special Puneri Crispy Farsan': 'Farsan',
  'Spiced Paneer Batons': 'Paneer Batons',
  'Spiced Whole Wheat Dhokli Dough Cuts': 'Dhokli Dough Cuts',
  'Sprouted Organic Matki (Moth Beans)': 'Sprouted Moth Beans',
  'Star Anise & Kalpasi (Stone Flower)': 'Star Anise & Kalpasi',
  'Stone-Ground Corn Tortillas (6 pcs)': 'Corn Tortillas',
  'Stone-Ground Jowar (Sorghum) Bhakri Flour': 'Jowar Bhakri Flour',
  'Sun-Dried Tomato & Basil Pesto Pouch': 'Tomato Basil Pesto',
  'Sweet Golden Corn Kernels': 'Sweet Corn Kernels',
  'Sweet Roasted Corn Kernels': 'Sweet Corn Kernels',
  'Tamarind & Jaggery Extract Pouch': 'Tamarind & Jaggery Extract',
  'Tender Purple Aubergine (Brinjal) Cubes': 'Aubergine Cubes',
  'Toasted Cashew Paste Powder': 'Cashew Paste Powder',
  'Toasted Cumin & Garlic Powder': 'Cumin & Garlic Powder',
  'Toasted Mediterranean Pine Nuts': 'Pine Nuts',
  'Toasted Sesame Seeds': 'White Sesame Seeds',
  'Tomato Garlic Reduction Base': 'Tomato Garlic Base',
  'Tomato Puree (1L)': 'Tomato Puree',
  'Traditional 5-Grain Roasted Bhajani Flour': '5-Grain Bhajani Flour',
  'Traditional Maharashtrian Goda Masala': 'Goda Masala',
  'Turmeric & Rock Salt': 'Turmeric & Rock Salt',
  'Veg Manchurian Dumpling Base Mix': 'Manchurian Base Mix',
  'Vinegar & Sugar Blend': 'Vinegar & Sugar Blend',
  'White Butter': 'White Butter',
  'White Pepper Powder': 'White Pepper Powder',
  'Whole Jeera (Cumin)': 'Cumin Seeds',
  'Whole-Milk Low-Moisture Mozzarella': 'Mozzarella Cheese',
};

/**
 * Removes all marketing/descriptive adjectives from an ingredient name.
 * Normalizes similar variations so duplicates are eliminated.
 */
export function cleanIngredientName(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();

  // 1. Direct canonical map lookup
  if (CANONICAL_MAP[trimmed]) {
    return CANONICAL_MAP[trimmed];
  }

  // 2. Rule-based cleaning for any unmapped or dynamically added item
  let cleaned = trimmed;

  // Strip Sachet prefixes: "Sachet 1: ", "Sachet 2: ", etc.
  cleaned = cleaned.replace(/^Sachet\s+\d+:\s*/i, '');

  // Strip pouch / pack suffixes when it describes packaging container
  cleaned = cleaned.replace(/\s+Pouch$/i, '');
  cleaned = cleaned.replace(/\s+Pack$/i, '');

  // Strip unit counts like (2 pcs), (6 pcs), (4 pcs), (8oz), (1L), (5L)
  cleaned = cleaned.replace(/\s*\(\d+\s*(?:pcs|pc|oz|g|kg|l|ml)?\)/gi, '');

  // Strip marketing / promotional adjectives
  const adjectivesToRemove = [
    /\b(fior di latte|fior de latte)\b/gi,
    /\b(fresh|farm-fresh|crispy|fried|barista|birista|aged|authentic|artisanal|artisan|traditional|slow-cooked|slow-roasted|slow-brew|pre-cooked|pre-soaked|pre-seasoned|stone-ground|cold-pressed|hand-crafted|handmade|prime|premium|royal|rich|tender|sweet|organic|pure|compound|natural|special|fluffy|layered|flaky|crinkle-cut|de-veined|eggless)\b/gi,
    /\b(italian|french|spanish|mexican|puneri|maharashtrian|kathiyawadi|kolkata|awadhi|mangalorean|gujarat|brittany|wisconsin|sicilian|provencal)\b/gi,
  ];

  adjectivesToRemove.forEach((regex) => {
    cleaned = cleaned.replace(regex, '');
  });

  // Clean extra spaces and trim
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  // Re-check canonical map after stripping generic prefixes
  if (CANONICAL_MAP[cleaned]) {
    return CANONICAL_MAP[cleaned]!;
  }

  return cleaned || trimmed;
}

export function guessSection(name: string, isMasalaSachet?: boolean): InventorySection {
  const n = name.toLowerCase();

  // ── Seasonings & Herbs ──────────────────────────────────────────────────────
  if (isMasalaSachet) return 'seasonings';
  if (
    n.includes('masala') ||
    n.includes('spice') ||
    n.includes('powder') ||
    n.includes('blend') ||
    n.includes('dust') ||
    n.includes('tadka') ||
    n.includes('seasoning') ||
    n.includes('tempering') ||
    n.includes('premix') ||
    n.includes('turmeric') ||
    n.includes('cumin') ||
    n.includes('coriander seed') ||
    n.includes('fennel seed') ||
    n.includes('mustard seed') ||
    n.includes('saffron') ||
    n.includes('cardamom') ||
    n.includes('clove') ||
    n.includes('nutmeg') ||
    n.includes('cinnamon') ||
    n.includes('bayleaf') ||
    n.includes('bay leaf') ||
    n.includes('mace') ||
    n.includes('asafoetida') ||
    n.includes('hing') ||
    n.includes('jeera') ||
    n.includes('anise') ||
    n.includes('kalpasi') ||
    n.includes('peppercorn') ||
    n.includes('pepper') ||
    n.includes('salt') ||
    n.includes('paprika') ||
    n.includes('pimentón') ||
    n.includes('oregano') ||
    n.includes('thyme') ||
    n.includes('rosemary') ||
    n.includes('marjoram') ||
    n.includes('basil') ||
    n.includes('herbes') ||
    n.includes('kasuri methi') ||
    n.includes('curry leaves') ||
    n.includes('coriander leaves') ||
    n.includes('mint') ||
    n.includes('thecha') ||
    n.includes('rose petal') ||
    n.includes('rose & kewra') ||
    n.includes('kewra')
  ) {
    if (n.includes('pepperoni') || n.includes('bell pepper') || n.includes('fajita bell pepper')) {
      return 'raw_ingredients';
    }
    return 'seasonings';
  }

  // ── Actual Packaging Material ───────────────────────────────────────────────
  if (
    n.includes('box') ||
    n.includes('bag') ||
    n.includes('ice pack') ||
    n.includes('sticker') ||
    n.includes('seal') ||
    n.includes('wrap') ||
    n.includes('paper cup') ||
    n.includes('foil tray') ||
    n.includes('foil container') ||
    n.includes('cling wrap') ||
    n.includes('parchment') ||
    n.includes('delivery bag') ||
    n.includes('bubble wrap')
  ) {
    return 'packaging';
  }

  return 'raw_ingredients';
}

export function guessUnit(qtyStr: string): string {
  const q = qtyStr.toLowerCase();
  if (q.includes('kg')) return 'kg';
  if (q.includes('g')) return 'g';
  if (q.includes('l') || q.includes('ml')) return 'L';
  if (q.includes('pc') || q.includes('pcs')) return 'units';
  if (q.includes('slice') || q.includes('sheet') || q.includes('buns') || q.includes('ball'))
    return 'units';
  return 'units';
}

// Packaging items to always ensure exist in inventory
export const PACKAGING_ITEMS = [
  { name: 'Meal Kit Box (Medium)', unit: 'units', quantity: 500, threshold: 100 },
  { name: 'Insulated Delivery Bag', unit: 'units', quantity: 200, threshold: 50 },
  { name: 'Gel Ice Pack', unit: 'units', quantity: 1000, threshold: 200 },
  { name: 'Shipping Label Sticker', unit: 'units', quantity: 2000, threshold: 500 },
  { name: 'Tamper-Evident Seal Sticker', unit: 'units', quantity: 1500, threshold: 300 },
  { name: 'Corrugated Shipping Box (Large)', unit: 'units', quantity: 300, threshold: 75 },
  { name: 'Bubble Wrap Roll', unit: 'meters', quantity: 20, threshold: 5 },
];

/**
 * Remove inventory items that have combined ingredients with "&" in their name.
 * These are legacy items from incorrectly seeded data.
 */
function cleanupCombinedIngredientItems(): number {
  let removed = 0;
  try {
    const items = getInventoryItems();
    for (const item of items) {
      if (
        item.name.includes(' & ') &&
        (item.name.includes('Chillies & Garlic') || item.name.includes('Chili & Garlic'))
      ) {
        deleteInventoryItem(item.id);
        removed++;
      }
    }
  } catch (e) {
    console.warn('[Inventory] Cleanup error:', e);
  }
  return removed;
}

/**
 * Migrate packaging items that are actually food/ingredients to raw_ingredients.
 */
function migrateIncorrectlyClassifiedItems(): number {
  let migrated = 0;
  try {
    const items = getInventoryItems();
    const foodKeywords = [
      'puree',
      'sauce',
      'paste',
      'oil',
      'cream',
      'extract',
      'jaggery',
      'kokum',
      'ghee',
      'butter',
      'peanuts',
      'noodles',
      'rice',
      'flour',
      'dal',
      'beans',
      'lentils',
      'spice',
      'masala',
      'milk',
      'yogurt',
      'paneer',
      'cheese',
      'tomato',
      'onion',
      'garlic',
      'ginger',
      'herb',
      'leaf',
      'leaves',
      'chilli',
      'chili',
      'pepper',
      'cumin',
      'coriander',
      'turmeric',
      'salt',
      'sugar',
      'honey',
      'vinegar',
      'soy',
      'sesame',
      'avocado',
      'crema',
      'drizzle',
      'dip',
      'mustard',
      'kasundi',
      'slaw',
      'cabbage',
      'lime',
      'salsa',
      'chutney',
      'raita',
      'aioli',
      'mash',
      'relish',
      'pickle',
      'pickled',
    ];

    for (const item of items) {
      if (item.section === 'packaging') {
        const nameLower = item.name.toLowerCase();
        const isFoodItem = foodKeywords.some((keyword) => nameLower.includes(keyword));

        if (isFoodItem) {
          updateInventoryItem(item.id, { section: 'raw_ingredients' });
          migrated++;
        }
      }
    }
  } catch (e) {
    console.warn('[Inventory] Migration error:', e);
  }
  return migrated;
}

/**
 * Seeds and synchronizes all ingredients from meal kits into the inventory hub.
 * - Deduplicates all existing items (merging duplicate stocks)
 * - Removes all adjectives from ingredient names
 * - Adds all ingredients from meal kits and sachets
 * - Guarantees packaging items exist
 */
export function seedInventoryFromMealKits(): number {
  let added = 0;

  // 1. First, cleanup legacy combined items and misclassified packaging
  cleanupCombinedIngredientItems();
  migrateIncorrectlyClassifiedItems();

  // 2. Normalize and deduplicate existing inventory items in store
  deduplicateAndCleanInventoryStore(cleanIngredientName);

  // 3. Track existing normalized item names
  const existingNames = new Set<string>();
  try {
    getInventoryItems().forEach((i: InventoryItem) => {
      existingNames.add(i.name.toLowerCase().trim());
    });
  } catch {}

  // 4. Seed all ingredients from all meal kits
  for (const kit of INITIAL_MEAL_KITS as MealKit[]) {
    // A) Process raw & base ingredients in kit.ingredients
    if (kit.ingredients) {
      for (const ing of kit.ingredients) {
        const cleanName = cleanIngredientName(ing.name);
        if (!cleanName) continue;
        if (existingNames.has(cleanName.toLowerCase())) continue;

        const section = guessSection(cleanName, ing.isMasalaSachet);
        const unit = guessUnit(ing.quantity || '');
        const parsedQty = parseFloat(ing.quantity || '1') || 1;
        const initialStock = unit === 'g' || unit === 'ml' ? Math.max(5000, parsedQty * 25) : 50;
        const thresholdLow = unit === 'g' || unit === 'ml' ? 500 : 10;

        try {
          addInventoryItem({
            name: cleanName,
            section,
            currentStock: initialStock,
            unit,
            shelfLifeDays: section === 'seasonings' ? 180 : 7,
            thresholdLow,
            region: 'West',
            storageCondition:
              section === 'seasonings' ? 'Cool & dry, airtight' : 'Cool & dry / Refrigerated',
            supplier: 'Meal Kit Catalog',
            notes: `From kit: ${kit.name}`,
          });
          added++;
          existingNames.add(cleanName.toLowerCase());
        } catch (e) {}
      }
    }

    // B) Process spice entries inside kit.sachets
    if (kit.sachets) {
      for (const sachet of kit.sachets) {
        if (!sachet.spices) continue;
        for (const spice of sachet.spices) {
          const cleanName = cleanIngredientName(spice.name);
          if (!cleanName) continue;
          if (existingNames.has(cleanName.toLowerCase())) continue;

          const unit = guessUnit(spice.quantity || 'g');
          try {
            addInventoryItem({
              name: cleanName,
              section: 'seasonings',
              currentStock: 5000,
              unit,
              shelfLifeDays: 180,
              thresholdLow: 500,
              region: 'West',
              storageCondition: 'Cool & dry, airtight container',
              supplier: 'Spice Supply Co.',
              notes: `From sachet: ${sachet.name} (${kit.name})`,
            });
            added++;
            existingNames.add(cleanName.toLowerCase());
          } catch (e) {}
        }
      }
    }
  }

  // 5. Seed packaging items if they don't exist
  for (const pkg of PACKAGING_ITEMS) {
    const cleanPkgName = cleanIngredientName(pkg.name);
    if (!existingNames.has(cleanPkgName.toLowerCase())) {
      try {
        addInventoryItem({
          name: cleanPkgName,
          section: 'packaging',
          currentStock: pkg.quantity,
          unit: pkg.unit,
          shelfLifeDays: 365,
          thresholdLow: pkg.threshold,
          region: 'West',
          storageCondition: 'Dry warehouse',
          supplier: 'Packaging Supplies',
          notes: 'Auto-seeded packaging item',
        });
        added++;
        existingNames.add(cleanPkgName.toLowerCase());
      } catch (e) {}
    }
  }

  // 6. Run final deduplication pass to ensure zero duplicates or near-duplicates
  deduplicateAndCleanInventoryStore(cleanIngredientName);

  return added;
}
