import { create } from "zustand";

export type ToastVariant = "success" | "info" | "error";

export type ToastInput = {
  variant: ToastVariant;
  title: string;
  message?: string;
  durationMs?: number;
  dedupeKey?: string;
  source?: string;
};

export type ToastRecord = ToastInput & {
  id: string;
  createdAt: number;
};

type ToastStoreState = {
  toasts: ToastRecord[];
  showToast: (input: ToastInput) => string;
  dismissToast: (id?: string) => void;
  clearToasts: () => void;
};

const DEFAULT_DURATION_MS = 2600;
const DEDUPE_WINDOW_MS = 1600;

function createToastId() {
  return `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function isDuplicateToast(left: ToastRecord, right: ToastInput, now: number) {
  if (left.dedupeKey && right.dedupeKey) {
    return left.dedupeKey === right.dedupeKey && now - left.createdAt < DEDUPE_WINDOW_MS;
  }

  return (
    left.variant === right.variant &&
    left.title === right.title &&
    left.message === right.message &&
    left.source === right.source &&
    now - left.createdAt < DEDUPE_WINDOW_MS
  );
}

export const useToastStore = create<ToastStoreState>((set, get) => ({
  toasts: [],
  showToast: (input) => {
    const now = Date.now();
    const existing = get().toasts.find((toast) => isDuplicateToast(toast, input, now));
    if (existing) {
      return existing.id;
    }

    const nextToast: ToastRecord = {
      id: createToastId(),
      createdAt: now,
      durationMs: input.durationMs ?? DEFAULT_DURATION_MS,
      ...input,
    };

    set((state) => ({
      toasts: [...state.toasts, nextToast],
    }));

    return nextToast.id;
  },
  dismissToast: (id) =>
    set((state) => ({
      toasts: id
        ? state.toasts.filter((toast) => toast.id !== id)
        : state.toasts.slice(1),
    })),
  clearToasts: () => set({ toasts: [] }),
}));

export function showToast(input: ToastInput) {
  return useToastStore.getState().showToast(input);
}

export function showSuccessToast(input: {
  title: string;
  message?: string;
  dedupeKey?: string;
  source?: string;
  durationMs?: number;
}) {
  return showToast({
    variant: "success",
    ...input,
  });
}

export function dismissToast(id?: string) {
  useToastStore.getState().dismissToast(id);
}
