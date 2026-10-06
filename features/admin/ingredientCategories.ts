export type IngredientCategoryId =
  | 'meat' | 'seafood' | 'eggs-dairy' | 'vegetables' | 'herbs-chillies'
  | 'pastes-sauces' | 'spices' | 'grains-pulses' | 'nuts-seeds' | 'oils' | 'other';

export const INGREDIENT_CATEGORIES: { id: IngredientCategoryId; label: string; match: RegExp | null }[] = [
  // ORDER MATTERS: first match wins.
  // Pastes first so "Cashew & melon seed paste" isn't treated as nuts.
  {
    id: 'pastes-sauces',
    label: 'Pastes, Sauces & Extracts',
    match: /\b(paste|extract|pouch|puree|purée|sauce|gravy|marinade|chutney|concentrate|base)\b/i,
  },
  // Spices next so "chilli powder" or "coriander powder" isn't treated as fresh produce.
  {
    id: 'spices',
    label: 'Dry Spices & Masalas',
    match: /\b(masala|powder|sachet|cumin|jeera|turmeric|haldi|cardamom|elaichi|cloves?|cinnamon|pepper|peppercorns?|mustard|fenugreek|kasuri|asafoetida|hing|saffron|bay leaf|star anise|fennel|ajwain|paprika|oregano|chilli flakes|salt)\b/i,
  },
  {
    id: 'meat',
    label: 'Meat & Poultry',
    match: /\b(chicken|mutton|lamb|goat|beef|pork|bacon|sausage|keema|turkey|ham)\b/i,
  },
  {
    id: 'seafood',
    label: 'Seafood',
    match: /\b(fish|prawns?|shrimps?|crab|squid|salmon|tuna|pomfret|surmai|basa)\b/i,
  },
  {
    id: 'vegetables',
    label: 'Fresh Vegetables',
    match: /\b(eggplant|brinjal|onions?|tomato(es)?|potato(es)?|capsicum|bell pepper|mushrooms?|carrots?|peas|cauliflower|gobi|spinach|palak|beans|cabbage|corn|zucchini|cucumber|beetroot|pumpkin|okra|bhindi|broccoli|lettuce|jalape(n|ñ)o|avocado|olives?)\b/i,
  },
  {
    id: 'herbs-chillies',
    label: 'Herbs, Chillies & Aromatics',
    match: /\b(chill(i|y|ies)|coriander|cilantro|mint|pudina|curry leaves|curry leaf|ginger|garlic|lemon|lime|basil|parsley|dill|spring onion|scallion|lemongrass)\b/i,
  },
  {
    id: 'eggs-dairy',
    label: 'Eggs & Dairy',
    match: /\b(eggs?|paneer|milk|curd|yogh?urt|dahi|cream|butter|cheese|khoya|mawa|mozzarella|cheddar|feta)\b/i,
  },
  {
    id: 'nuts-seeds',
    label: 'Nuts, Seeds & Dry Fruits',
    match: /\b(cashews?|almonds?|pistachios?|walnuts?|peanuts?|melon seeds?|poppy seeds?|sesame|raisins?|dates?|coconut|chia|flax)\b/i,
  },
  {
    id: 'grains-pulses',
    label: 'Grains, Pulses & Flours',
    match: /\b(rice|basmati|dal|dhal|lentils?|atta|flour|maida|besan|chickpeas?|chana|rajma|moong|urad|toor|pasta|penne|spaghetti|noodles|tortillas?|buns?|bread|pav|oats|semolina|rava|sooji|poha)\b/i,
  },
  {
    id: 'oils',
    label: 'Oils & Fats',
    match: /\b(oil|ghee|vanaspati|shortening)\b/i,
  },
  { id: 'other', label: 'Other', match: null },
];

export const getIngredientCategory = (name: string): IngredientCategoryId => {
  const n = (name || '').trim();
  for (const c of INGREDIENT_CATEGORIES) {
    if (c.match && c.match.test(n)) return c.id;
  }
  return 'other';
};

export const getCategoryLabel = (id: IngredientCategoryId): string =>
  INGREDIENT_CATEGORIES.find((c) => c.id === id)?.label ?? 'Other';
