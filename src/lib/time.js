// Times are shown in 12-hour form with AM/PM everywhere ("21:00" -> "9:00 PM").
export function time12(value, fallback = '') {
  if (!value) return fallback
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return fallback
  return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'AM' : 'PM'}`
}
