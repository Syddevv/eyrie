export type BankItem = {
  id: string;
  name: string;
  shortName?: string;
  type?: "bank";
  logo?: string;
  primaryColor?: string;
  gradient?: string[];
};

export const BANKS: BankItem[] = [
  {
    id: "bpi",
    name: "BPI",
    shortName: "BPI",
    type: "bank",
    logo: "@/assets/logos/banks/bpi.svg",
    primaryColor: "#E50914",
    gradient: ["#E50914", "#C41612"],
  },
  {
    id: "bdo",
    name: "BDO",
    shortName: "BDO",
    type: "bank",
    logo: "@/assets/logos/banks/bdo.svg",
    primaryColor: "#1D4ED8",
    gradient: ["#1D4ED8", "#1741B8"],
  },
  {
    id: "metrobank",
    name: "Metrobank",
    shortName: "Metro",
    type: "bank",
    logo: "@/assets/logos/banks/metrobank.svg",
    primaryColor: "#1E3A8A",
    gradient: ["#1E3A8A", "#162B63"],
  },
  {
    id: "unionbank",
    name: "UnionBank",
    shortName: "Union",
    type: "bank",
    logo: "@/assets/logos/banks/unionbank.svg",
    primaryColor: "#F97316",
    gradient: ["#F97316", "#D35F13"],
  },
  {
    id: "landbank",
    name: "Landbank",
    shortName: "Landbank",
    type: "bank",
    logo: "@/assets/logos/banks/landbank.svg",
    primaryColor: "#0F8A46",
    gradient: ["#0F8A46", "#0C6A35"],
  },
  {
    id: "rcbc",
    name: "RCBC",
    shortName: "RCBC",
    type: "bank",
    logo: "@/assets/logos/banks/rcbc.svg",
    primaryColor: "#0EA5A4",
    gradient: ["#0EA5A4", "#0B8D8B"],
  },
  {
    id: "securitybank",
    name: "Security Bank",
    shortName: "Security",
    type: "bank",
    logo: "@/assets/logos/banks/securitybank.svg",
    primaryColor: "#0F172A",
    gradient: ["#0F172A", "#0B1220"],
  },
  {
    id: "pnb",
    name: "PNB",
    shortName: "PNB",
    type: "bank",
    logo: "@/assets/logos/banks/pnb.svg",
    primaryColor: "#1E40AF",
    gradient: ["#1E40AF", "#172F92"],
  },
];

export default BANKS;
