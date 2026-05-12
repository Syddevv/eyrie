import { getBrandTheme } from "./brand-themes";

export type WalletItem = {
  id: string;
  name: string;
  shortName?: string;
  type?: "ewallet" | "digital" | "crypto" | "cash";
  logo?: string;
  primaryColor?: string;
  gradient?: readonly string[];
};

export const WALLETS: WalletItem[] = [
  {
    id: "gcash",
    name: "GCash",
    shortName: "GCash",
    type: "ewallet",
    logo: require("../assets/Logos/GCash.png"),
    primaryColor: getBrandTheme({ id: "gcash" }).primary,
    gradient: getBrandTheme({ id: "gcash" }).gradient,
  },
  {
    id: "maya",
    name: "Maya",
    shortName: "Maya",
    type: "ewallet",
    logo: require("../assets/Logos/Maya.jpg"),
    primaryColor: getBrandTheme({ id: "maya" }).primary,
    gradient: getBrandTheme({ id: "maya" }).gradient,
  },
  {
    id: "gotyme",
    name: "GoTyme",
    shortName: "GoTyme",
    type: "digital",
    logo: require("../assets/Logos/GoTyme.png"),
    primaryColor: getBrandTheme({ id: "gotyme" }).primary,
    gradient: getBrandTheme({ id: "gotyme" }).gradient,
  },
  {
    id: "maribank",
    name: "MariBank",
    shortName: "Mari",
    type: "digital",
    logo: require("../assets/Logos/Maribank.png"),
    primaryColor: getBrandTheme({ id: "maribank" }).primary,
    gradient: getBrandTheme({ id: "maribank" }).gradient,
  },
  {
    id: "shopeepay",
    name: "ShopeePay",
    shortName: "Shopee",
    type: "ewallet",
    logo: require("../assets/Logos/ShoppePay.webp"),
    primaryColor: getBrandTheme({ id: "shopeepay" }).primary,
    gradient: getBrandTheme({ id: "shopeepay" }).gradient,
  },
  {
    id: "coinsph",
    name: "Coins.ph",
    shortName: "Coins",
    type: "ewallet",
    logo: require("../assets/Logos/CoinsPH.png"),
    primaryColor: getBrandTheme({ id: "coinsph" }).primary,
    gradient: getBrandTheme({ id: "coinsph" }).gradient,
  },
  {
    id: "lazada",
    name: "Lazada Wallet",
    shortName: "Lazada",
    type: "ewallet",
    logo: require("../assets/Logos/Lazada Wallet.png"),
    primaryColor: getBrandTheme({ id: "lazadawallet" }).primary,
    gradient: getBrandTheme({ id: "lazadawallet" }).gradient,
  },
  {
    id: "paypal",
    name: "PayPal",
    shortName: "PayPal",
    type: "ewallet",
    logo: require("../assets/Logos/Paypal.png"),
    primaryColor: getBrandTheme({ id: "paypal" }).primary,
    gradient: getBrandTheme({ id: "paypal" }).gradient,
  },
  {
    id: "cimb",
    name: "CIMB",
    shortName: "CIMB",
    type: "digital",
    logo: require("../assets/Logos/CIMB.jpg"),
    primaryColor: getBrandTheme({ id: "cimb" }).primary,
    gradient: getBrandTheme({ id: "cimb" }).gradient,
  },
  {
    id: "pdax",
    name: "PDAX",
    shortName: "PDAX",
    type: "crypto",
    logo: require("../assets/Logos/PDAX.png"),
    primaryColor: getBrandTheme({ id: "pdax" }).primary,
    gradient: getBrandTheme({ id: "pdax" }).gradient,
  },
];

export default WALLETS;
