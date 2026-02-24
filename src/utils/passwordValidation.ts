export interface PasswordRequirement {
  label: string
  met: boolean
}

export function validatePassword(password: string): PasswordRequirement[] {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'At least 1 uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'At least 1 lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'At least 1 number (0-9)', met: /\d/.test(password) },
    { label: 'At least 1 special character (!@#$%^&*)', met: /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password) },
  ]
}

export function isPasswordValid(password: string): boolean {
  return validatePassword(password).every(r => r.met)
}
