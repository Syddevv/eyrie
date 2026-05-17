import * as Haptics from "expo-haptics";

export function triggerNavigationHaptic() {
  return Haptics.selectionAsync().catch(() => undefined);
}
