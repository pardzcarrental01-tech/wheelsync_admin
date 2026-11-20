// True when every word typed in the search box appears somewhere in the given values.
// Letter case is ignored, and so are spaces, dashes and dots inside numbers, so "N0123456789" finds
// "N01-23-456789" and "0936 177 7668" finds "09361777668".
const compact = (text) => text.replace(/[^a-z0-9@]/g, '')

export function matchesSearch(query, ...values) {
  const words = String(query || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const parts = values.filter((value) => value != null && value !== '').map((value) => String(value).toLowerCase())
  const text = parts.join(' ')
  const compactParts = parts.map(compact)
  return words.every((word) => {
    if (text.includes(word)) return true
    const bare = compact(word)
    return Boolean(bare) && compactParts.some((part) => part.includes(bare))
  })
}
