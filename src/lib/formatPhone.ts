/**
 * Auto-format a phone number as (XXX) XXX-XXXX as the user types.
 */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10)
  if (digits.length === 0) return ''
  if (digits.length <= 3) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
}

/**
 * Strip formatting, returning raw digits for storage.
 */
export function stripPhone(formatted: string): string {
  return formatted.replace(/\D/g, '')
}
