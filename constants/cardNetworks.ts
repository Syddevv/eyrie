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
    logo: "@/assets/logos/cards/visa.svg",
    primaryColor: "#2563EB",
  },
  {
    id: "mastercard",
    name: "Mastercard",
    shortName: "Mastercard",
    logo: "@/assets/logos/cards/mastercard.svg",
    primaryColor: "#F97316",
  },
];

export default CARD_NETWORKS;
