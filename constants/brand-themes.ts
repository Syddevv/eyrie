export type BrandTheme = {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  gradient: readonly [string, string];
  text: string;
  glow: string;
  border?: string;
};

export const walletBrandThemes = {
  gcash: {
    id: "gcash",
    name: "GCash",
    primary: "#0B63F6",
    secondary: "#2EA8FF",
    gradient: ["#1E7BFF", "#0D5DD8"],
    text: "#FFFFFF",
    glow: "rgba(62, 194, 255, 0.34)",
  },
  maya: {
    id: "maya",
    name: "Maya",
    primary: "#00D47A",
    secondary: "#0B1713",
    gradient: ["#20D986", "#05A868"],
    text: "#FFFFFF",
    glow: "rgba(88, 255, 177, 0.3)",
  },
  gotyme: {
    id: "gotyme",
    name: "GoTyme",
    primary: "#10C8CC",
    secondary: "#9BF7EF",
    gradient: ["#74EEE8", "#12B8C5"],
    text: "#1C1C1E",
    glow: "rgba(162, 255, 246, 0.36)",
    border: "rgba(255,255,255,0.24)",
  },
  shopeepay: {
    id: "shopeepay",
    name: "ShopeePay",
    primary: "#F35A2F",
    secondary: "#FF9A63",
    gradient: ["#FF946D", "#EF5E32"],
    text: "#FFFFFF",
    glow: "rgba(255, 185, 116, 0.32)",
  },
  lazadawallet: {
    id: "lazadawallet",
    name: "Lazada Wallet",
    primary: "#5B3DF5",
    secondary: "#8A5CFF",
    gradient: ["#5B3DF5", "#2F1BB3"],
    text: "#FFFFFF",
    glow: "rgba(91, 61, 245, 0.35)",
  },
  coinsph: {
    id: "coinsph",
    name: "Coins.ph",
    primary: "#0057FF",
    secondary: "#3A86FF",
    gradient: ["#0057FF", "#0038A8"],
    text: "#FFFFFF",
    glow: "rgba(0, 87, 255, 0.35)",
  },
  paypal: {
    id: "paypal",
    name: "PayPal",
    primary: "#003087",
    secondary: "#0070E0",
    gradient: ["#003087", "#001C55"],
    text: "#FFFFFF",
    glow: "rgba(0, 112, 224, 0.35)",
  },
  maribank: {
    id: "maribank",
    name: "MariBank",
    primary: "#F58220",
    secondary: "#FF9A3D",
    gradient: ["#F58220", "#C45A00"],
    text: "#FFFFFF",
    glow: "rgba(245, 130, 32, 0.35)",
  },
  unionbank: {
    id: "unionbank",
    name: "UnionBank",
    primary: "#F36F21",
    secondary: "#FF8A42",
    gradient: ["#F36F21", "#C24E00"],
    text: "#FFFFFF",
    glow: "rgba(243, 111, 33, 0.35)",
  },
  bdo: {
    id: "bdo",
    name: "BDO",
    primary: "#003B8E",
    secondary: "#0057C2",
    gradient: ["#003B8E", "#00245A"],
    text: "#FFFFFF",
    glow: "rgba(0, 59, 142, 0.35)",
  },
  bpi: {
    id: "bpi",
    name: "BPI",
    primary: "#9B111E",
    secondary: "#D9303A",
    gradient: ["#C92D38", "#961722"],
    text: "#FFFFFF",
    glow: "rgba(255, 93, 98, 0.26)",
  },
  metrobank: {
    id: "metrobank",
    name: "Metrobank",
    primary: "#005BAC",
    secondary: "#0077D9",
    gradient: ["#005BAC", "#003B70"],
    text: "#FFFFFF",
    glow: "rgba(0, 91, 172, 0.35)",
  },
  securitybank: {
    id: "securitybank",
    name: "Security Bank",
    primary: "#0072CE",
    secondary: "#00A1E4",
    gradient: ["#0072CE", "#004C8C"],
    text: "#FFFFFF",
    glow: "rgba(0, 114, 206, 0.35)",
  },
  landbank: {
    id: "landbank",
    name: "Landbank",
    primary: "#0E7A3A",
    secondary: "#B6BE43",
    gradient: ["#2D9858", "#197642"],
    text: "#FFFFFF",
    glow: "rgba(217, 209, 93, 0.28)",
  },
  rcbc: {
    id: "rcbc",
    name: "RCBC",
    primary: "#005DAA",
    secondary: "#007ED6",
    gradient: ["#005DAA", "#003D70"],
    text: "#FFFFFF",
    glow: "rgba(0, 93, 170, 0.35)",
  },
  pnb: {
    id: "pnb",
    name: "PNB",
    primary: "#7A003C",
    secondary: "#A0004F",
    gradient: ["#7A003C", "#4A0024"],
    text: "#FFFFFF",
    glow: "rgba(122, 0, 60, 0.35)",
  },
  cimb: {
    id: "cimb",
    name: "CIMB",
    primary: "#D71920",
    secondary: "#FF3B3F",
    gradient: ["#D71920", "#8F0D12"],
    text: "#FFFFFF",
    glow: "rgba(215, 25, 32, 0.35)",
  },
  pdax: {
    id: "pdax",
    name: "PDAX",
    primary: "#3A8D3F",
    secondary: "#58B65D",
    gradient: ["#3A8D3F", "#25612A"],
    text: "#FFFFFF",
    glow: "rgba(58, 141, 63, 0.35)",
  },
  visa: {
    id: "visa",
    name: "Visa",
    primary: "#1A1F71",
    secondary: "#F7B600",
    gradient: ["#1A1F71", "#0F124A"],
    text: "#FFFFFF",
    glow: "rgba(26, 31, 113, 0.35)",
  },
  mastercard: {
    id: "mastercard",
    name: "Mastercard",
    primary: "#EB001B",
    secondary: "#F79E1B",
    gradient: ["#EB001B", "#F79E1B"],
    text: "#FFFFFF",
    glow: "rgba(235, 0, 27, 0.35)",
  },
  cash: {
    id: "cash",
    name: "Cash",
    primary: "#5B8DEF",
    secondary: "#7DA8FF",
    gradient: ["#5B8DEF", "#3564C8"],
    text: "#FFFFFF",
    glow: "rgba(91, 141, 239, 0.35)",
  },
} as const;

export type BrandThemeKey = keyof typeof walletBrandThemes;

export const defaultBrandTheme: BrandTheme = {
  id: "default",
  name: "Brand",
  primary: "#5B6475",
  secondary: "#3F4757",
  gradient: ["#4B5563", "#1F2937"],
  text: "#FFFFFF",
  glow: "rgba(75, 85, 99, 0.28)",
};

const normalize = (value?: string | null) =>
  (value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function getBrandTheme(
  input?: {
    id?: string | null;
    name?: string | null;
    shortName?: string | null;
  } | null,
): BrandTheme {
  const id = normalize(input?.id);
  if (id && walletBrandThemes[id as BrandThemeKey]) {
    return walletBrandThemes[id as BrandThemeKey];
  }

  const name = normalize(input?.name);
  const shortName = normalize(input?.shortName);
  const search = [id, name, shortName].filter(Boolean).join(" ");

  for (const theme of Object.values(walletBrandThemes)) {
    const themeName = normalize(theme.name);
    if (
      themeName &&
      (search.includes(themeName) ||
        themeName.includes(search) ||
        search.includes(theme.id))
    ) {
      return theme;
    }
  }

  return defaultBrandTheme;
}
