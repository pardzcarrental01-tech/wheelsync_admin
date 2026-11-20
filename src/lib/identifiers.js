// ID number rules for the Philippine IDs accepted by Pardz Car Rental. The number rule follows the ID type
// the customer chose, and the number is saved in the same grouping as it is printed on the card.
//   Driver's License (LTO)  1 letter + 10 digits          A12-34-567890
//   Passport (DFA)          1-2 letters + 6-7 digits (+ 1 letter on ePassports), 7-9 characters   P1234567A
//   National ID (PhilSys)   16-digit PhilSys Card Number (PCN) on the front of the card   1234-5678-9012-3456
//                           (not the 12-digit PSN, which the PSA asks businesses not to collect)
//   UMID                    12-digit Common Reference Number (CRN)   0111-1234567-8
//   SSS ID                  10 digits                                34-1234567-8
//   TIN ID                  9 digits, or 12 with the branch code     123-456-789 / 123-456-789-000
//   PhilHealth ID           12-digit PhilHealth Identification Number (PIN)   12-345678901-2
//   Pag-IBIG ID             12-digit Membership ID (MID)             1234-5678-9012
//   PRC ID                  7-digit registration number              0123456
//   Others                  4 to 20 letters, digits or dashes
// Keep this file the same in the customer website and the admin console, and in step with
// app/services/identifiers.py on the server.

export const ID_TYPES = ["Driver's License", 'Passport', 'National ID', 'UMID', 'SSS ID', 'TIN ID', 'PhilHealth ID', 'Pag-IBIG ID', 'PRC ID']

const DIGIT_RULES = {
  philsys: { groups: [4, 4, 4, 4], hint: 'Enter the 16-digit PhilSys Card Number (PCN) printed on the front of the card, e.g. 1234-5678-9012-3456.' },
  umid: { groups: [4, 7, 1], hint: 'Enter the 12-digit Common Reference Number (CRN), e.g. 0111-1234567-8.' },
  sss: { groups: [2, 7, 1], hint: 'Enter the 10-digit SSS number, e.g. 34-1234567-8.' },
  tin: { groups: [3, 3, 3, 3], optionalLast: true, hint: 'Enter the 9-digit TIN, or 12 digits with the branch code, e.g. 123-456-789-000.' },
  philhealth: { groups: [2, 9, 1], hint: 'Enter the 12-digit PhilHealth Identification Number (PIN), e.g. 12-345678901-2.' },
  pagibig: { groups: [4, 4, 4], hint: 'Enter the 12-digit Pag-IBIG Membership ID (MID), e.g. 1234-5678-9012.' },
  prc: { groups: [7], hint: 'Enter the 7-digit PRC registration number, e.g. 0123456.' },
}

const NAMES = {
  drivers_license: ["driver's license", 'driver’s license', 'drivers license', 'driver license'],
  passport: ['passport'],
  philsys: ['national id', 'philippine national id', 'philsys id', 'philid'],
  umid: ['umid', 'umid id', 'unified multi-purpose id'],
  sss: ['sss id', 'sss'],
  tin: ['tin id', 'tin'],
  philhealth: ['philhealth id', 'philhealth'],
  pagibig: ['pag-ibig id', 'pag-ibig', 'pagibig id', 'pagibig'],
  prc: ['prc id', 'prc'],
}

function kindOf(idType) {
  const type = String(idType || '').trim().toLowerCase()
  return Object.keys(NAMES).find((kind) => NAMES[kind].includes(type)) || 'other'
}

const groupsPattern = (groups) => groups.map((n) => `[0-9]{${n}}`).join('-')
const digitCount = (groups) => groups.reduce((sum, n) => sum + n, 0)

export function idNumberRule(idType) {
  const kind = kindOf(idType)
  if (kind === 'drivers_license') {
    return { kind, maxLength: 13, inputMode: 'text', pattern: '[A-Z][0-9]{2}-[0-9]{2}-[0-9]{6}', hint: 'Enter the LTO license number as printed, e.g. A12-34-567890.' }
  }
  if (kind === 'passport') {
    return { kind, maxLength: 9, inputMode: 'text', pattern: '[A-Z]{1,2}[0-9]{6,7}[A-Z]?', hint: 'Enter the passport number as printed, e.g. P1234567A (7 to 9 letters and digits).' }
  }
  if (DIGIT_RULES[kind]) {
    const { groups, optionalLast, hint } = DIGIT_RULES[kind]
    const full = groupsPattern(groups)
    const pattern = optionalLast ? `${groupsPattern(groups.slice(0, -1))}(?:-[0-9]{${groups[groups.length - 1]}})?` : full
    return { kind, maxLength: digitCount(groups) + groups.length - 1, inputMode: 'numeric', pattern, hint }
  }
  return { kind: 'other', maxLength: 20, inputMode: 'text', pattern: '[A-Za-z0-9-]{4,20}', hint: 'Enter 4 to 20 letters, digits, or dashes.' }
}

// Format what the user types: keep only allowed characters and add the dashes where the card has them.
export function normalizeIdNumber(idType, value) {
  const kind = kindOf(idType)
  const text = String(value || '')
  if (kind === 'drivers_license') {
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11)
    let out = cleaned.slice(0, 3)
    if (cleaned.length > 3) out += `-${cleaned.slice(3, 5)}`
    if (cleaned.length > 5) out += `-${cleaned.slice(5, 11)}`
    return out
  }
  if (kind === 'passport') return text.replace(/[^a-z0-9]/gi, '').slice(0, 9).toUpperCase()
  if (DIGIT_RULES[kind]) {
    const { groups } = DIGIT_RULES[kind]
    const digits = text.replace(/\D/g, '').slice(0, digitCount(groups))
    const parts = []
    let start = 0
    for (const size of groups) {
      if (start >= digits.length) break
      parts.push(digits.slice(start, start + size))
      start += size
    }
    return parts.join('-')
  }
  return text.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20)
}

export function validIdNumber(idType, value) {
  const rule = idNumberRule(idType)
  return new RegExp(`^(?:${rule.pattern})$`).test(String(value || ''))
}
