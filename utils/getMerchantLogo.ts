import { MERCHANT_LOGOS } from "@/constants/merchant-logos";

export function normalizeMerchantLogoName(name?: string | null) {
  if (typeof name !== "string") {
    return "";
  }

  return name
    .toLowerCase()
    .trim()
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/[\u2018\u2019\u201c\u201d'\"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[-_]+/g, " ")
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MERCHANT_LOGO_ALIASES: Record<string, string> = {
  jollibee: "jolibee",
  mcdo: "mcdonalds",
  "mc donalds": "mcdonalds",
  "mcdonald's": "mcdonalds",
  "mcdonalds philippines": "mcdonalds",
  "s and r": "s r",
  "s and r membership shopping": "s r",
  "s&r": "s r",
  shopeepay: "shopee",
  "shopee pay": "shopee",
  "lazada wallet": "lazada",
  "disney+": "disney plus",
  "disney plus": "disney plus",
};

const NORMALIZED_MERCHANT_LOGOS = Object.entries(MERCHANT_LOGOS).reduce<
  Record<string, (typeof MERCHANT_LOGOS)[string]>
>((map, [merchantName, asset]) => {
  const normalizedName = normalizeMerchantLogoName(merchantName);

  if (normalizedName && asset) {
    map[normalizedName] = asset;
  }

  return map;
}, {});

export function getMerchantLogo(name?: string | null) {
  const normalized = normalizeMerchantLogoName(name);

  if (!normalized) {
    return null;
  }

  const aliased = MERCHANT_LOGO_ALIASES[normalized] ?? normalized;

  return NORMALIZED_MERCHANT_LOGOS[aliased] ?? null;
}
