import AsyncStorage from "@react-native-async-storage/async-storage";

export const ONBOARDING_STORAGE_KEY = "hasCompletedOnboarding";

export async function getHasCompletedOnboarding() {
  if (typeof window !== "undefined") {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === "true";
  }

  return (await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)) === "true";
}

export async function setHasCompletedOnboarding() {
  if (typeof window !== "undefined") {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
    return;
  }

  await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "true");
}
