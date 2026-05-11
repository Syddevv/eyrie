import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useColorScheme as useNativeColorScheme } from "react-native";

import type { ThemeMode } from "@/constants/colors";

type ThemePreference = ThemeMode | "system";

const STORAGE_KEY = "eyrie:theme-preference";
const listeners = new Set<() => void>();
let preference: ThemePreference = "system";
let hasLoadedPreference = false;

function notifyThemePreferenceChanged() {
  for (const listener of Array.from(listeners)) {
    listener();
  }
}

async function loadThemePreference() {
  if (hasLoadedPreference) {
    return preference;
  }

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      preference = stored;
    }
  } finally {
    hasLoadedPreference = true;
    notifyThemePreferenceChanged();
  }

  return preference;
}

export async function setThemePreference(nextPreference: ThemePreference) {
  preference = nextPreference;
  hasLoadedPreference = true;
  await AsyncStorage.setItem(STORAGE_KEY, nextPreference);
  notifyThemePreferenceChanged();
}

export function getThemePreference() {
  return preference;
}

export function useThemePreference() {
  const [, setVersion] = useState(0);

  useEffect(() => {
    const listener = () => setVersion((value) => value + 1);
    listeners.add(listener);
    loadThemePreference().catch(() => undefined);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return preference;
}

export function useColorScheme(): ThemeMode {
  const systemColorScheme = useNativeColorScheme();
  const selectedPreference = useThemePreference();

  if (selectedPreference === "light" || selectedPreference === "dark") {
    return selectedPreference;
  }

  return systemColorScheme === "dark" ? "dark" : "light";
}

