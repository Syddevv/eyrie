import { useAuthStore } from '@/store/useAuthStore';

export function useAuth() {
  const session = useAuthStore((state) => state.session);
  const user = useAuthStore((state) => state.user);
  const isReady = useAuthStore((state) => state.isReady);
  const isSigningIn = useAuthStore((state) => state.isSigningIn);
  const isSigningUp = useAuthStore((state) => state.isSigningUp);
  const isSendingOtp = useAuthStore((state) => state.isSendingOtp);
  const isVerifyingOtp = useAuthStore((state) => state.isVerifyingOtp);
  const isGoogleLoading = useAuthStore((state) => state.isGoogleLoading);
  const isSigningOut = useAuthStore((state) => state.isSigningOut);
  const otpModal = useAuthStore((state) => state.otpModal);
  const closeOtpModal = useAuthStore((state) => state.closeOtpModal);

  return {
    session,
    user,
    isAuthenticated: Boolean(user),
    isReady,
    isSigningIn,
    isSigningUp,
    isSendingOtp,
    isVerifyingOtp,
    isGoogleLoading,
    isSigningOut,
    otpModal,
    closeOtpModal,
  };
}
