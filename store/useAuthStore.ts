import type { Session, User } from '@supabase/supabase-js';
import { create } from 'zustand';

export type AuthMode = 'sign-in' | 'sign-up';
export type SnackbarTone = 'success' | 'error' | 'info';
export type OtpStatus = 'idle' | 'error' | 'success';

export type OtpModalState = {
  visible: boolean;
  email: string;
  mode: AuthMode;
  fullName?: string;
  resendAvailableAt: number;
  status: OtpStatus;
};

type SnackbarState = {
  visible: boolean;
  message: string;
  tone: SnackbarTone;
};

type AuthStoreState = {
  session: Session | null;
  user: User | null;
  isReady: boolean;
  isSigningIn: boolean;
  isSigningUp: boolean;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  isGoogleLoading: boolean;
  isSigningOut: boolean;
  otpModal: OtpModalState;
  snackbar: SnackbarState | null;
  setSession: (session: Session | null) => void;
  setReady: (isReady: boolean) => void;
  setSigningIn: (value: boolean) => void;
  setSigningUp: (value: boolean) => void;
  setSendingOtp: (value: boolean) => void;
  setVerifyingOtp: (value: boolean) => void;
  setGoogleLoading: (value: boolean) => void;
  setSigningOut: (value: boolean) => void;
  openOtpModal: (payload: Omit<OtpModalState, 'visible' | 'status'>) => void;
  closeOtpModal: () => void;
  setOtpModalStatus: (status: OtpStatus) => void;
  setOtpResendAvailableAt: (timestamp: number) => void;
  showSnackbar: (message: string, tone?: SnackbarTone) => void;
  hideSnackbar: () => void;
};

const initialOtpModal: OtpModalState = {
  visible: false,
  email: '',
  mode: 'sign-in',
  resendAvailableAt: 0,
  status: 'idle',
};

export const useAuthStore = create<AuthStoreState>((set) => ({
  session: null,
  user: null,
  isReady: false,
  isSigningIn: false,
  isSigningUp: false,
  isSendingOtp: false,
  isVerifyingOtp: false,
  isGoogleLoading: false,
  isSigningOut: false,
  otpModal: initialOtpModal,
  snackbar: null,
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
    }),
  setReady: (isReady) => set({ isReady }),
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
        status: 'idle',
        ...payload,
      },
    }),
  closeOtpModal: () =>
    set({
      otpModal: initialOtpModal,
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
  showSnackbar: (message, tone = 'info') =>
    set({
      snackbar: {
        visible: true,
        message,
        tone,
      },
    }),
  hideSnackbar: () => set({ snackbar: null }),
}));
