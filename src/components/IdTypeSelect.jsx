import { useState } from 'react'
import { ID_TYPES } from '../lib/identifiers'

// ID type dropdown (same as the customer website), used when the admin corrects a customer's IDs.
// "Others (please specify)" shows a text box; what the customer types is saved as the ID type.
export { ID_TYPES }
const OTHERS = '__others__'

export default function IdTypeSelect({ label, value, onChange, className = '' }) {
  // A saved value that is not on the list (e.g. "Postal ID") was typed under Others.
  const [others, setOthers] = useState(Boolean(value) && !ID_TYPES.includes(value))
  const showOthers = others || (Boolean(value) && !ID_TYPES.includes(value))

  return (
    <div className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <label className="flex flex-col gap-1.5">{label}
        <select
          required
          value={showOthers ? OTHERS : value}
          onChange={(e) => {
            const choice = e.target.value
            setOthers(choice === OTHERS)
            onChange(choice === OTHERS ? '' : choice)
          }}
          className="px-3 py-2.5"
        >
          <option value="">Select ID type</option>
          {ID_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          <option value={OTHERS}>Others (please specify)</option>
        </select>
      </label>
      {showOthers && (
        <input
          required
          autoFocus={!value}
          maxLength={100}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Specify the ID type, e.g. Postal ID"
          aria-label={`${label}: specify`}
          className="px-3 py-2.5"
        />
      )}
    </div>
  )
}
