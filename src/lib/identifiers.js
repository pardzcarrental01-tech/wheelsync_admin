// The number rule follows the ID type the customer chose.
// Driver's License (LTO): one letter, 2 digits, dash, 2 digits, dash, 6 digits, e.g. A12-34-567890
// Passport: exactly 9 letters or digits
// National ID (PhilSys): exactly 12 digits
// Others: 4 to 20 letters, digits or dashes
const DRIVERS_LICENSE_TYPES = ["driver's license", 'drivers license', 'driver license', 'driver’s license']
const PHILSYS_TYPES = ['national id', 'philippine national id', 'philsys id']

export function idNumberRule(idType) {
  const type = String(idType || '').trim().toLowerCase()
  if (DRIVERS_LICENSE_TYPES.includes(type)) {
    return { kind: 'drivers_license', maxLength: 13, inputMode: 'text', pattern: '[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}', hint: 'Enter the LTO number as printed, for example A12-34-567890.' }
  }
  if (type === 'passport') {
    return { kind: 'passport', maxLength: 9, inputMode: 'text', pattern: '[A-Za-z0-9]{9}', hint: 'Enter exactly 9 letters or digits.' }
  }
  if (PHILSYS_TYPES.includes(type)) {
    return { kind: 'philsys', maxLength: 12, inputMode: 'numeric', pattern: '[0-9]{12}', hint: 'Enter the 12-digit PhilSys Number (PSN).' }
  }
  return { kind: 'other', maxLength: 20, inputMode: 'text', pattern: '[A-Za-z0-9-]{4,20}', hint: 'Enter 4 to 20 letters, digits, or dashes.' }
}

export function normalizeIdNumber(idType, value) {
  const rule = idNumberRule(idType)
  if (rule.kind === 'drivers_license') {
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11)
    let out = cleaned.slice(0, 3)
    if (cleaned.length > 3) out += `-${cleaned.slice(3, 5)}`
    if (cleaned.length > 5) out += `-${cleaned.slice(5, 11)}`
    return out
  }
  if (rule.kind === 'passport') return value.replace(/[^a-z0-9]/gi, '').slice(0, 9).toUpperCase()
  if (rule.kind === 'philsys') return value.replace(/\D/g, '').slice(0, 12)
  return value.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20)
}

export function validIdNumber(idType, value) {
  const rule = idNumberRule(idType)
  return new RegExp(`^(?:${rule.pattern})$`).test(value)
}
