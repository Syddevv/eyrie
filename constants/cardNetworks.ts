import { getBrandTheme } from "./brand-themes";

export type CardNetwork = {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
  primaryColor?: string;
};

export const CARD_NETWORKS: CardNetwork[] = [
  {
    id: "visa",
    name: "Visa",
    shortName: "Visa",
    logo: require("../assets/Logos/VISA.jpg"),
    primaryColor: getBrandTheme({ id: "visa" }).primary,
  },
  {
    id: "mastercard",
    name: "Mastercard",
    shortName: "Mastercard",
    logo: require("../assets/Logos/Mastercard.png"),
    primaryColor: getBrandTheme({ id: "mastercard" }).primary,
  },
];

export default CARD_NETWORKS;
