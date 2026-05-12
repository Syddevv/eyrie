import { getBrandTheme } from "./brand-themes";

export type BankItem = {
  id: string;
  name: string;
  shortName?: string;
  type?: "bank";
  logo?: string;
  primaryColor?: string;
  gradient?: readonly string[];
};

export const BANKS: BankItem[] = [
  {
    id: "bpi",
    name: "BPI",
    shortName: "BPI",
    type: "bank",
    logo: require("../assets/Logos/BPI.png"),
    primaryColor: getBrandTheme({ id: "bpi" }).primary,
    gradient: getBrandTheme({ id: "bpi" }).gradient,
  },
  {
    id: "bdo",
    name: "BDO",
    shortName: "BDO",
    type: "bank",
    logo: require("../assets/Logos/BDO.jpg"),
    primaryColor: getBrandTheme({ id: "bdo" }).primary,
    gradient: getBrandTheme({ id: "bdo" }).gradient,
  },
  {
    id: "metrobank",
    name: "Metrobank",
    shortName: "Metro",
    type: "bank",
    logo: require("../assets/Logos/MetroBank.png"),
    primaryColor: getBrandTheme({ id: "metrobank" }).primary,
    gradient: getBrandTheme({ id: "metrobank" }).gradient,
  },
  {
    id: "unionbank",
    name: "UnionBank",
    shortName: "Union",
    type: "bank",
    logo: require("../assets/Logos/UnionBank.jpeg"),
    primaryColor: getBrandTheme({ id: "unionbank" }).primary,
    gradient: getBrandTheme({ id: "unionbank" }).gradient,
  },
  {
    id: "landbank",
    name: "Landbank",
    shortName: "Landbank",
    type: "bank",
    logo: require("../assets/Logos/Landbank.png"),
    primaryColor: getBrandTheme({ id: "landbank" }).primary,
    gradient: getBrandTheme({ id: "landbank" }).gradient,
  },
  {
    id: "rcbc",
    name: "RCBC",
    shortName: "RCBC",
    type: "bank",
    logo: require("../assets/Logos/RCBC.png"),
    primaryColor: getBrandTheme({ id: "rcbc" }).primary,
    gradient: getBrandTheme({ id: "rcbc" }).gradient,
  },
  {
    id: "securitybank",
    name: "Security Bank",
    shortName: "Security",
    type: "bank",
    logo: require("../assets/Logos/Security Bank.png"),
    primaryColor: getBrandTheme({ id: "securitybank" }).primary,
    gradient: getBrandTheme({ id: "securitybank" }).gradient,
  },
  {
    id: "pnb",
    name: "PNB",
    shortName: "PNB",
    type: "bank",
    logo: require("../assets/Logos/PNB.webp"),
    primaryColor: getBrandTheme({ id: "pnb" }).primary,
    gradient: getBrandTheme({ id: "pnb" }).gradient,
  },
];

export default BANKS;
