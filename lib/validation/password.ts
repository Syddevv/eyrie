export type PasswordValidationResult = {
  isValid: boolean;
  errors: string[];
};

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Use at least 8 characters.");
  }

  if (!/[A-Za-z]/.test(password)) {
    errors.push("Include at least one letter.");
  }

  if (!/\d/.test(password)) {
    errors.push("Include at least one number.");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

export function validatePasswordConfirmation(password: string, confirmation: string) {
  if (!confirmation) {
    return "Confirm your new password.";
  }

  if (password !== confirmation) {
    return "Passwords do not match.";
  }

  return null;
}

