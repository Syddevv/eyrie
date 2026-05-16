import { create } from "zustand";

type BottomNavState = {
  visible: boolean;
  show: () => void;
  hide: () => void;
};

export const useBottomNavStore = create<BottomNavState>((set) => ({
  visible: true,
  show: () => set({ visible: true }),
  hide: () => set({ visible: false }),
}));

export default useBottomNavStore;
