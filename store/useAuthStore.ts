import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { showToast } from "@/store/useToastStore";
import type { OfflineAuthUser } from "@/src/lib/offline-auth";

export type AuthMode = "sign-in" | "sign-up";
export type SnackbarTone = "success" | "error" | "info";
export type OtpStatus = "idle" | "error" | "success";
export type PasswordResetPhase = "idle" | "email" | "code" | "password";

export type OtpModalState = {
  visible: boolean;
  email: string;
  mode: AuthMode;
  fullName?: string;
  resendAvailableAt: number;
  status: OtpStatus;
};

export type PasswordResetFlowState = {
  phase: PasswordResetPhase;
  email: string;
  resendAvailableAt: number;
  attempts: number;
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
  isSendingPasswordReset: boolean;
  isVerifyingPasswordResetCode: boolean;
  isUpdatingPasswordReset: boolean;
  otpModal: OtpModalState;
  passwordResetFlow: PasswordResetFlowState;
  setSession: (session: Session | null) => void;
  setOfflineUser: (user: OfflineAuthUser | null) => void;
  setReady: (isReady: boolean) => void;
  setSigningIn: (value: boolean) => void;
  setSigningUp: (value: boolean) => void;
  setSendingOtp: (value: boolean) => void;
  setVerifyingOtp: (value: boolean) => void;
  setGoogleLoading: (value: boolean) => void;
  setSigningOut: (value: boolean) => void;
  setSendingPasswordReset: (value: boolean) => void;
  setVerifyingPasswordResetCode: (value: boolean) => void;
  setUpdatingPasswordReset: (value: boolean) => void;
  openOtpModal: (payload: Omit<OtpModalState, "visible" | "status">) => void;
  closeOtpModal: () => void;
  setOtpModalStatus: (status: OtpStatus) => void;
  setOtpResendAvailableAt: (timestamp: number) => void;
  setPasswordResetFlow: (payload: PasswordResetFlowState) => void;
  openPasswordResetEmailModal: (email?: string) => void;
  openPasswordResetCodeModal: (payload: {
    email: string;
    resendAvailableAt: number;
    attempts?: number;
  }) => void;
  openPasswordResetPasswordModal: (payload?: { email?: string }) => void;
  closePasswordResetFlow: () => void;
  setPasswordResetStatus: (status: OtpStatus) => void;
  setPasswordResetResendAvailableAt: (timestamp: number) => void;
  setPasswordResetAttempts: (attempts: number) => void;
  showSnackbar: (message: string, tone?: SnackbarTone) => void;
};

const initialOtpModal: OtpModalState = {
  visible: false,
  email: "",
  mode: "sign-in",
  resendAvailableAt: 0,
  status: "idle",
};

const initialPasswordResetFlow: PasswordResetFlowState = {
  phase: "idle",
  email: "",
  resendAvailableAt: 0,
  attempts: 0,
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
  isSendingPasswordReset: false,
  isVerifyingPasswordResetCode: false,
  isUpdatingPasswordReset: false,
  otpModal: initialOtpModal,
  passwordResetFlow: initialPasswordResetFlow,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setOfflineUser: (user) =>
    set({
      session: null,
      user: user as User | null,
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
  setSendingPasswordReset: (value) => set({ isSendingPasswordReset: value }),
  setVerifyingPasswordResetCode: (value) =>
    set({ isVerifyingPasswordResetCode: value }),
  setUpdatingPasswordReset: (value) => set({ isUpdatingPasswordReset: value }),
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
  setPasswordResetFlow: (payload) =>
    set({
      passwordResetFlow: payload,
    }),
  openPasswordResetEmailModal: (email = "") =>
    set({
      passwordResetFlow: {
        ...initialPasswordResetFlow,
        phase: "email",
        email,
      },
    }),
  openPasswordResetCodeModal: (payload) =>
    set({
      passwordResetFlow: {
        phase: "code",
        email: payload.email,
        resendAvailableAt: payload.resendAvailableAt,
        attempts: payload.attempts ?? 0,
        status: "idle",
      },
    }),
  openPasswordResetPasswordModal: (payload) =>
    set((state) => ({
      passwordResetFlow: {
        phase: "password",
        email: payload?.email ?? state.passwordResetFlow.email,
        resendAvailableAt: state.passwordResetFlow.resendAvailableAt,
        attempts: state.passwordResetFlow.attempts,
        status: "idle",
      },
    })),
  closePasswordResetFlow: () =>
    set({
      passwordResetFlow: initialPasswordResetFlow,
      isSendingPasswordReset: false,
      isVerifyingPasswordResetCode: false,
      isUpdatingPasswordReset: false,
    }),
  setPasswordResetStatus: (status) =>
    set((state) => ({
      passwordResetFlow: {
        ...state.passwordResetFlow,
        status,
      },
    })),
  setPasswordResetResendAvailableAt: (timestamp) =>
    set((state) => ({
      passwordResetFlow: {
        ...state.passwordResetFlow,
        resendAvailableAt: timestamp,
      },
    })),
  setPasswordResetAttempts: (attempts) =>
    set((state) => ({
      passwordResetFlow: {
        ...state.passwordResetFlow,
        attempts,
      },
    })),
  showSnackbar: (message, tone = "info") =>
    showToast({
      variant: tone,
      title: message,
      source: "auth-store-compat",
    }),
}));
