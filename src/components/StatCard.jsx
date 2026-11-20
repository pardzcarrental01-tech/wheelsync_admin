import { useEffect, useRef, useState } from 'react'

// A dashboard number. With `options` ([{ key, label, value, hint }]) it shows small toggle buttons
// (e.g. Today / Week / Month / Total) and the value of the selected one; `defaultOption` picks the first shown.
// A `hint` (description) is not printed under the number. Tap or click the card's icon to open it;
// it closes with another click on the icon, a click outside, or Esc.
export default function StatCard({ label, value, icon: Icon, options, defaultOption, hint }) {
  const [chosen, setChosen] = useState(null)
  const [showInfo, setShowInfo] = useState(false)
  const infoRef = useRef(null)
  // Until the admin picks one, follow the default (the options may arrive after the first render).
  const selected = chosen ?? defaultOption ?? options?.[0]?.key
  const current = options?.find((option) => option.key === selected)
  const description = current?.hint ?? hint

  useEffect(() => {
    if (!showInfo) return undefined
    const close = (event) => {
      if (event.type === 'keydown' ? event.key === 'Escape' : !infoRef.current?.contains(event.target)) setShowInfo(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [showInfo])

  const iconBox = (
    <div
      className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center"
      style={{ background: 'var(--gradient-primary)' }}
    >
      <Icon size={20} color="white" />
    </div>
  )

  return (
    <div className="card relative p-5 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</p>
        <p className="text-3xl font-display font-semibold mt-1">{current ? current.value : value}</p>
        {options && (
          <div className="mt-3 inline-flex rounded-lg p-0.5" style={{ border: '1px solid var(--border-soft)' }} role="group" aria-label={`${label} period`}>
            {options.map((option) => {
              const active = option.key === selected
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setChosen(option.key)}
                  aria-pressed={active}
                  className="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                  style={active ? { background: 'var(--gradient-primary)', color: 'white' } : { color: 'var(--text-muted)' }}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        )}
      </div>
      {Icon && (
        <div ref={infoRef} className="relative shrink-0">
          {description ? (
            <button
              type="button"
              onClick={() => setShowInfo((open) => !open)}
              aria-label={`About ${label}`}
              aria-expanded={showInfo}
              className="rounded-xl transition-opacity hover:opacity-90 focus-visible:outline-2"
            >
              {iconBox}
            </button>
          ) : iconBox}
          {showInfo && description && (
            <div
              role="tooltip"
              className="absolute right-0 top-full z-10 mt-2 w-56 rounded-xl px-3 py-2 text-xs leading-relaxed shadow-xl"
              style={{ background: 'var(--bg-surface-2)', border: '1px solid var(--border-soft)', color: 'var(--text-primary)' }}
            >
              {description}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
