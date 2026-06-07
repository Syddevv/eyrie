export const PAYLATER_OPTIONS = [
  {
    id: "shopee-paylater",
    platform: "shopee",
    name: "Shopee PayLater",
    description: "Track Shopee PayLater purchases",
    subtitle: "PayLater purchases",
    logo: require("@/assets/merchant-logos/Shopee.webp"),
    accent: "#FF2D2D",
  },
  {
    id: "tiktok-paylater",
    platform: "tiktok",
    name: "TikTok PayLater",
    description: "Track TikTok Shop PayLater",
    subtitle: "PayLater purchases",
    logo: require("@/assets/merchant-logos/Tiktok.jpg"),
    accent: "#111111",
  },
  {
    id: "lazada-paylater",
    platform: "lazada",
    name: "Lazada PayLater",
    description: "Track Lazada PayLater purchases",
    subtitle: "PayLater purchases",
    logo: require("@/assets/merchant-logos/Lazada.png"),
    accent: "#3B82F6",
  },
  {
    id: "other-paylater",
    platform: "other",
    name: "Other PayLater",
    description: "Custom paylater service",
    subtitle: "Custom paylater service",
    logo: null,
    accent: "#667085",
  },
] as const;

export type PaylaterOption = (typeof PAYLATER_OPTIONS)[number];
