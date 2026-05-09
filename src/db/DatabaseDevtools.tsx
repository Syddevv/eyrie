import { useDrizzleStudio } from "expo-drizzle-studio-plugin";

import { expoDb } from "./client";

export function DatabaseDevtools() {
  useDrizzleStudio(expoDb);
  return null;
}
