import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { showToast } from "@/store/useToastStore";

export type AuthMode = "sign-in" | "sign-up";
export type SnackbarTone = "success" | "error" | "info";
export type OtpStatus = "idle" | "error" | "success";

export type OtpModalState = {
  visible: boolean;
  email: string;
  mode: AuthMode;
  fullName?: string;
  resendAvailableAt: number;
  status: OtpStatus;
};

type AuthStoreState = {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (hasCompletedOnboarding: boolean) => void;
  isSigningIn: boolean;
  isSigningUp: boolean;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  isGoogleLoading: boolean;
  isSigningOut: boolean;
  otpModal: OtpModalState;
  setSession: (session: Session | null) => void;
  setReady: (isReady: boolean) => void;
  setSigningIn: (value: boolean) => void;
  setSigningUp: (value: boolean) => void;
  setSendingOtp: (value: boolean) => void;
  setVerifyingOtp: (value: boolean) => void;
  setGoogleLoading: (value: boolean) => void;
  setSigningOut: (value: boolean) => void;
  openOtpModal: (payload: Omit<OtpModalState, "visible" | "status">) => void;
  closeOtpModal: () => void;
  setOtpModalStatus: (status: OtpStatus) => void;
  setOtpResendAvailableAt: (timestamp: number) => void;
  showSnackbar: (message: string, tone?: SnackbarTone) => void;
};

const initialOtpModal: OtpModalState = {
  visible: false,
  email: "",
  mode: "sign-in",
  resendAvailableAt: 0,
  status: "idle",
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  session: null,
  user: null,
  isReady: false,
  hasCompletedOnboarding: false,
  isSigningIn: false,
  isSigningUp: false,
  isSendingOtp: false,
  isVerifyingOtp: false,
  isGoogleLoading: false,
  isSigningOut: false,
  otpModal: initialOtpModal,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setReady: (isReady) => set({ isReady }),
  setHasCompletedOnboarding: (hasCompletedOnboarding) =>
    set({ hasCompletedOnboarding }),
  setSigningIn: (value) => set({ isSigningIn: value }),
  setSigningUp: (value) => set({ isSigningUp: value }),
  setSendingOtp: (value) => set({ isSendingOtp: value }),
  setVerifyingOtp: (value) => set({ isVerifyingOtp: value }),
  setGoogleLoading: (value) => set({ isGoogleLoading: value }),
  setSigningOut: (value) => set({ isSigningOut: value }),
  openOtpModal: (payload) =>
    set({
      otpModal: {
        visible: true,
        status: "idle",
        ...payload,
      },
    }),
  closeOtpModal: () =>
    set({
      otpModal: initialOtpModal,
      isSendingOtp: false,
      isVerifyingOtp: false,
    }),
  setOtpModalStatus: (status) =>
    set((state) => ({
      otpModal: {
        ...state.otpModal,
        status,
      },
    })),
  setOtpResendAvailableAt: (timestamp) =>
    set((state) => ({
      otpModal: {
        ...state.otpModal,
        resendAvailableAt: timestamp,
      },
    })),
  showSnackbar: (message, tone = "info") =>
    showToast({
      variant: tone,
      title: message,
      source: "auth-store-compat",
    }),
}));
