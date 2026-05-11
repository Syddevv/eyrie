export type ExpenseMerchantOption = {
  id: string;
  label: string;
  initials: string;
  color: string;
  textColor?: string;
  icon?: string;
  defaultCategoryId?: string | null;
  defaultCategoryName?: string | null;
};

type MerchantSeed = ExpenseMerchantOption;

function normalizeKey(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function merchant(
  id: string,
  label: string,
  initials: string,
  color: string,
  icon?: string,
  textColor?: string,
): MerchantSeed {
  return {
    id,
    label,
    initials,
    color,
    icon,
    textColor,
  };
}

const defaultMerchants = [
  merchant("merchant_default_grab", "Grab", "G", "#00B14F", "car-connected"),
  merchant("merchant_default_jollibee", "Jollibee", "JB", "#F43F5E"),
  merchant(
    "merchant_default_shopee",
    "Shopee",
    "S",
    "#EE4D2D",
    "shopping-outline",
  ),
  merchant("merchant_default_gcash", "GCash", "G", "#0EA5E9", "cellphone"),
  merchant(
    "merchant_default_maya",
    "Maya",
    "M",
    "#16A34A",
    "credit-card-outline",
  ),
  merchant("merchant_default_sm", "SM", "SM", "#2563EB", "storefront-outline"),
];

const merchantCatalog: Record<string, MerchantSeed[]> = {
  [normalizeKey("Food & Dining")]: [
    merchant("merchant_jollibee", "Jollibee", "JB", "#F43F5E"),
    merchant(
      "merchant_mcdonalds",
      "McDonald's",
      "M",
      "#FFC107",
      undefined,
      "#1F2937",
    ),
    merchant("merchant_mang_inasal", "Mang Inasal", "MI", "#F97316"),
    merchant("merchant_chowking", "Chowking", "C", "#EF4444"),
    merchant("merchant_greenwich", "Greenwich", "G", "#16A34A"),
    merchant("merchant_kfc", "KFC", "KFC", "#DC2626"),
    merchant("merchant_bonchon", "Bonchon", "B", "#EF4444"),
    merchant("merchant_starbucks", "Starbucks", "S", "#166534", "coffee"),
    merchant("merchant_tim_hortons", "Tim Hortons", "TH", "#D97706", "coffee"),
  ],
  [normalizeKey("Transportation")]: [
    merchant("merchant_grab", "Grab", "G", "#00B14F", "car-connected"),
    merchant("merchant_joyride", "JoyRide", "JR", "#2563EB", "motorbike"),
    merchant("merchant_angkas", "Angkas", "A", "#16A34A", "motorbike"),
    merchant("merchant_move_it", "Move It", "MI", "#0EA5E9", "motorbike"),
    merchant("merchant_lrt", "LRT", "LRT", "#1D4ED8", "train"),
    merchant("merchant_mrt", "MRT", "MRT", "#7C3AED", "train"),
    merchant("merchant_petron", "Petron", "P", "#DC2626", "gas-station"),
    merchant("merchant_shell", "Shell", "S", "#FACC15", "gas-station"),
    merchant("merchant_caltex", "Caltex", "C", "#2563EB", "gas-station"),
  ],
  [normalizeKey("Shopping")]: [
    merchant("merchant_shopee", "Shopee", "S", "#EE4D2D", "shopping-outline"),
    merchant("merchant_lazada", "Lazada", "L", "#7C3AED", "shopping-outline"),
    merchant(
      "merchant_sm_store",
      "SM Store",
      "SM",
      "#2563EB",
      "storefront-outline",
    ),
    merchant("merchant_uniqlo", "UNIQLO", "U", "#DC2626"),
    merchant("merchant_watsons", "Watsons", "W", "#0EA5E9", "pill"),
    merchant(
      "merchant_mercury_drug",
      "Mercury Drug",
      "MD",
      "#16A34A",
      "medical-bag",
    ),
    merchant("merchant_miniso", "MINISO", "M", "#FB7185", "shopping-outline"),
  ],
  [normalizeKey("Bills & Utilities")]: [
    merchant("merchant_meralco", "Meralco", "M", "#F59E0B", "flash-outline"),
    merchant("merchant_maynilad", "Maynilad", "M", "#0EA5E9", "water-outline"),
    merchant("merchant_pldt", "PLDT", "P", "#2563EB", "wifi"),
    merchant("merchant_globe", "Globe", "G", "#7C3AED", "earth"),
    merchant("merchant_smart", "Smart", "S", "#DC2626", "cellphone"),
    merchant("merchant_converge", "Converge", "C", "#0F766E", "wifi"),
  ],
  [normalizeKey("Entertainment")]: [
    merchant(
      "merchant_netflix",
      "Netflix",
      "N",
      "#E11D48",
      "television-classic",
    ),
    merchant("merchant_spotify", "Spotify", "S", "#16A34A", "spotify"),
    merchant(
      "merchant_youtube_premium",
      "YouTube Premium",
      "YT",
      "#EF4444",
      "youtube",
    ),
    merchant("merchant_disney_plus", "Disney+", "D", "#2563EB", "television"),
    merchant("merchant_steam", "Steam", "ST", "#1D4ED8", "steam"),
  ],
  [normalizeKey("Health & Medical")]: [
    merchant("merchant_watsons_health", "Watsons", "W", "#0EA5E9", "pill"),
    merchant(
      "merchant_mercury_health",
      "Mercury Drug",
      "MD",
      "#16A34A",
      "medical-bag",
    ),
    merchant("merchant_st_lukes", "St. Luke's", "SL", "#DC2626", "heart-pulse"),
    merchant(
      "merchant_the_generics",
      "The Generics Pharmacy",
      "TGP",
      "#2563EB",
      "pill",
    ),
  ],
  [normalizeKey("Education")]: [
    merchant("merchant_ched", "CHED", "C", "#1D4ED8", "school-outline"),
    merchant(
      "merchant_up",
      "University of the Philippines",
      "UP",
      "#7C3AED",
      "school",
    ),
    merchant("merchant_ateneo", "Ateneo", "A", "#0F766E", "school"),
    merchant(
      "merchant_de_la_salle",
      "De La Salle",
      "DLSU",
      "#16A34A",
      "school",
    ),
    merchant(
      "merchant_bookstore",
      "National Book Store",
      "NBS",
      "#EF4444",
      "book-open-variant",
    ),
  ],
  [normalizeKey("Travel")]: [
    merchant("merchant_airasia", "AirAsia", "AA", "#EF4444", "airplane"),
    merchant(
      "merchant_cebu_pacific",
      "Cebu Pacific",
      "CP",
      "#2563EB",
      "airplane",
    ),
    merchant("merchant_scoot", "Scoot", "SC", "#F59E0B", "airplane"),
    merchant("merchant_hotel101", "Hotel 101", "H", "#7C3AED", "bed-outline"),
    merchant(
      "merchant_klook",
      "Klook",
      "K",
      "#0EA5E9",
      "ticket-confirmation-outline",
    ),
  ],
  [normalizeKey("Groceries")]: [
    merchant(
      "merchant_sm_hypermarket",
      "SM Hypermarket",
      "SM",
      "#2563EB",
      "cart-outline",
    ),
    merchant("merchant_puregold", "Puregold", "PG", "#F59E0B", "cart-outline"),
    merchant("merchant_savemore", "Savemore", "S", "#16A34A", "cart-outline"),
    merchant(
      "merchant_robinsons_supermarket",
      "Robinsons Supermarket",
      "RS",
      "#DC2626",
      "cart-outline",
    ),
    merchant("merchant_landers", "Landers", "L", "#7C3AED", "cart-outline"),
    merchant("merchant_sr", "S&R", "SR", "#0EA5E9", "cart-outline"),
  ],
  [normalizeKey("Coffee")]: [
    merchant(
      "merchant_starbucks_coffee",
      "Starbucks",
      "S",
      "#166534",
      "coffee",
    ),
    merchant(
      "merchant_coffee_project",
      "Coffee Project",
      "CP",
      "#7C3AED",
      "coffee",
    ),
    merchant("merchant_bos_coffee", "Bo's Coffee", "BC", "#A16207", "coffee"),
    merchant(
      "merchant_tim_hortons_coffee",
      "Tim Hortons",
      "TH",
      "#D97706",
      "coffee",
    ),
  ],
  [normalizeKey("Subscriptions")]: [
    merchant(
      "merchant_netflix_sub",
      "Netflix",
      "N",
      "#E11D48",
      "television-classic",
    ),
    merchant("merchant_spotify_sub", "Spotify", "S", "#16A34A", "spotify"),
    merchant("merchant_canva", "Canva", "C", "#2563EB", "palette-outline"),
    merchant("merchant_chatgpt", "ChatGPT", "CG", "#14B8A6", "robot-outline"),
    merchant(
      "merchant_google_one",
      "Google One",
      "G",
      "#EA4335",
      "cloud-outline",
    ),
    merchant("merchant_icloud", "iCloud", "IC", "#0EA5E9", "cloud-outline"),
  ],
  [normalizeKey("Insurance")]: [
    merchant(
      "merchant_pru_life",
      "Pru Life UK",
      "P",
      "#2563EB",
      "shield-check-outline",
    ),
    merchant(
      "merchant_philam",
      "Philam Life",
      "A",
      "#16A34A",
      "shield-check-outline",
    ),
    merchant(
      "merchant_sun_life",
      "Sun Life",
      "SL",
      "#F59E0B",
      "shield-check-outline",
    ),
    merchant(
      "merchant_maxicare",
      "Maxicare",
      "M",
      "#DC2626",
      "shield-check-outline",
    ),
  ],
  [normalizeKey("Pets")]: [
    merchant("merchant_pet_value", "Pet Value", "PV", "#2563EB", "paw"),
    merchant("merchant_barkery", "Barkery", "B", "#F97316", "paw"),
    merchant("merchant_pet_shops", "Pet Shops", "PS", "#16A34A", "paw"),
    merchant("merchant_vet", "Veterinary Clinic", "VC", "#DC2626", "paw"),
  ],
  [normalizeKey("Gifts & Donations")]: [
    merchant("merchant_charity", "Charity", "C", "#7C3AED", "gift-outline"),
    merchant(
      "merchant_red_cross",
      "Red Cross",
      "RC",
      "#DC2626",
      "heart-outline",
    ),
    merchant("merchant_giftaway", "Giftaway", "G", "#2563EB", "gift-outline"),
    merchant(
      "merchant_mission",
      "Mission Donation",
      "MD",
      "#16A34A",
      "hand-heart-outline",
    ),
  ],
  [normalizeKey("Personal Care")]: [
    merchant("merchant_benibana", "Benibana", "B", "#EF4444", "face-man"),
    merchant("merchant_bench", "Bench", "B", "#2563EB", "tshirt-crew-outline"),
    merchant(
      "merchant_human_nature",
      "Human Nature",
      "HN",
      "#16A34A",
      "spray-bottle",
    ),
    merchant("merchant_skinderm", "Skinderm", "S", "#7C3AED", "face-woman"),
  ],
  [normalizeKey("Electronics")]: [
    merchant("merchant_abenson", "Abenson", "A", "#2563EB", "television"),
    merchant("merchant_octagon", "Octagon", "O", "#F59E0B", "laptop"),
    merchant(
      "merchant_digitalwalker",
      "Digital Walker",
      "DW",
      "#16A34A",
      "cellphone",
    ),
    merchant(
      "merchant_beyond_the_box",
      "Beyond the Box",
      "BTB",
      "#DC2626",
      "cellphone",
    ),
  ],
  [normalizeKey("Home")]: [
    merchant(
      "merchant_ace_hardware",
      "ACE Hardware",
      "ACE",
      "#F97316",
      "hammer-wrench",
    ),
    merchant("merchant_warehouse", "Our Home", "OH", "#2563EB", "sofa"),
    merchant("merchant_ikea", "IKEA", "I", "#0EA5E9", "sofa"),
    merchant("merchant_mr_diy", "MR.DIY", "MR", "#16A34A", "tools"),
  ],
  [normalizeKey("Investments")]: [
    merchant(
      "merchant_col_financial",
      "COL Financial",
      "COL",
      "#2563EB",
      "chart-line",
    ),
    merchant("merchant_bpi_trade", "BPI Trade", "BPI", "#16A34A", "chart-line"),
    merchant("merchant_seedbox", "Seedbox", "SB", "#7C3AED", "chart-line"),
    merchant(
      "merchant_gcash_ginvest",
      "GCash GInvest",
      "GI",
      "#0EA5E9",
      "chart-line",
    ),
  ],
  [normalizeKey("Government Payments")]: [
    merchant("merchant_bir", "BIR", "BIR", "#2563EB", "bank"),
    merchant("merchant_sss", "SSS", "SSS", "#16A34A", "bank"),
    merchant("merchant_philhealth", "PhilHealth", "PH", "#0EA5E9", "bank"),
    merchant("merchant_pagibig", "Pag-IBIG", "PI", "#F97316", "bank"),
  ],
  [normalizeKey("Taxes")]: [
    merchant(
      "merchant_bir_tax",
      "BIR",
      "BIR",
      "#2563EB",
      "receipt-text-outline",
    ),
    merchant(
      "merchant_local_tax",
      "Local Government",
      "LG",
      "#16A34A",
      "receipt-text-outline",
    ),
    merchant(
      "merchant_professional_tax",
      "Professional Tax",
      "PT",
      "#7C3AED",
      "receipt-text-outline",
    ),
    merchant(
      "merchant_import_tax",
      "Customs",
      "C",
      "#DC2626",
      "receipt-text-outline",
    ),
  ],
  [normalizeKey("Parking")]: [
    merchant("merchant_sm_parking", "SM Parking", "SM", "#2563EB", "parking"),
    merchant(
      "merchant_airport_parking",
      "Airport Parking",
      "AP",
      "#16A34A",
      "parking",
    ),
    merchant(
      "merchant_mall_parking",
      "Mall Parking",
      "MP",
      "#F97316",
      "parking",
    ),
    merchant(
      "merchant_street_parking",
      "Street Parking",
      "SP",
      "#7C3AED",
      "parking",
    ),
  ],
  [normalizeKey("Fuel")]: [
    merchant("merchant_petron_fuel", "Petron", "P", "#DC2626", "gas-station"),
    merchant("merchant_shell_fuel", "Shell", "S", "#FACC15", "gas-station"),
    merchant("merchant_caltex_fuel", "Caltex", "C", "#2563EB", "gas-station"),
    merchant("merchant_unioil", "Unioil", "U", "#16A34A", "gas-station"),
  ],
};

const presetMap = new Map<string, ExpenseMerchantOption>();

for (const [categoryKey, merchants] of Object.entries(merchantCatalog)) {
  for (const option of merchants) {
    const key = normalizeKey(option.label);
    if (presetMap.has(key)) {
      continue;
    }

    presetMap.set(key, {
      ...option,
      defaultCategoryName: categoryKey
        .split("-")
        .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
        .join(" ")
        .replace(/\bAnd\b/g, "&"),
    });
  }
}

for (const option of defaultMerchants) {
  const key = normalizeKey(option.label);
  if (!presetMap.has(key)) {
    presetMap.set(key, {
      ...option,
      defaultCategoryName: null,
    });
  }
}

export type MerchantPresetOption = ExpenseMerchantOption;

export function getMerchantPresetByName(name?: string | null) {
  return presetMap.get(normalizeKey(name));
}

export function searchMerchantPresets(query?: string | null) {
  const normalizedQuery = normalizeKey(query);
  const values = Array.from(presetMap.values());

  if (!normalizedQuery) {
    return values.slice(0, 16);
  }

  return values.filter((option) => normalizeKey(option.label).includes(normalizedQuery));
}

export function normalizeExpenseMerchantCategory(value?: string | null) {
  return normalizeKey(value);
}

export function getMerchantsForCategory(categoryName?: string | null) {
  const key = normalizeExpenseMerchantCategory(categoryName);
  return merchantCatalog[key] ?? defaultMerchants;
}

export function getMerchantForCategoryByLabel(
  categoryName?: string | null,
  merchantLabel?: string | null,
) {
  const normalizedLabel = merchantLabel?.trim().toLowerCase();

  if (!normalizedLabel) {
    return null;
  }

  return (
    getMerchantsForCategory(categoryName).find(
      (merchant) => merchant.label.trim().toLowerCase() === normalizedLabel,
    ) ?? null
  );
}
