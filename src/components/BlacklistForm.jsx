import { useState } from 'react'
import { api } from '../lib/api'
import Modal from './Modal'

// The blacklist form, used on the Blacklist page (add or edit a record) and on the Customers page
// (blacklist a customer: the form opens already filled in from that customer's account).
// Its fields follow the columns of the Blacklist table: name, ID number, area, source, reason, notes.

export const AREAS = { CDO: 'Cagayan de Oro', CEB: 'Cebu', DVO: 'Davao' }
export const SOURCES = { RN: 'RN (as written on the list)', FB: 'Facebook', WS: 'WheelSync account' }
export const REASONS = ['Bad Renter', 'Payment Issue', 'Scammer', 'Rent Sangla', 'Rent Tangay', 'Sub-Lease', 'Identity Theft', 'Drug Related']
export const EMPTY_RECORD = { full_name: '', id_number: '', area: 'CDO', source: 'RN', reason: 'Bad Renter', notes: '' }

// The form values for a customer account: name, primary ID number (or the second one), Cagayan de Oro and
// source WheelSync. Notes start empty; the admin writes them if needed.
export function recordFromCustomer(customer) {
  return {
    full_name: customer.full_name || '',
    id_number: customer.id_number || customer.second_id_number || '',
    area: 'CDO',
    source: 'WS',
    reason: 'Bad Renter',
    notes: '',
  }
}

/**
 * record   - an existing blacklist record to edit (null when adding)
 * customer - the customer account being blacklisted (Customers page); its account is blocked too
 * reasons  - reason choices (the defaults plus any reason already used in the records)
 * onClose  - closes the form without saving
 * onSaved  - called after a successful save
 */
export default function BlacklistForm({ record = null, customer = null, reasons = REASONS, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    if (record) {
      return { full_name: record.full_name, id_number: record.id_number || '', area: record.area || '', source: record.source || '', reason: record.reason, notes: record.notes || '' }
    }
    return customer ? recordFromCustomer(customer) : EMPTY_RECORD
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const editing = Boolean(record?.id)
  const reasonChoices = [...new Set([...reasons, form.reason].filter(Boolean))]
  // A record with no ID number can only match by name; for a customer account the account block itself
  // stops the bookings, so the ID number may stay empty when the customer never submitted one.
  const idRequired = customer ? false : !editing || Boolean(record?.id_number)

  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (editing) {
        await api.patch(`/admin/blacklist-records/${record.id}`, form)
      } else {
        try {
          await api.post('/admin/blacklist-records', form)
        } catch (createError) {
          // Blacklisting an account whose ID number is already on the list: the record exists, block the account.
          if (!(customer && createError.status === 409)) throw createError
        }
        if (customer) await api.patch(`/admin/customers/${customer.id}/blacklist`, { is_blacklisted: true })
      }
    } catch (saveError) {
      setBusy(false)
      setError(saveError.message)
      return
    }
    setBusy(false)
    onSaved()
  }

  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value })

  return (
    <Modal
      title={editing ? `Edit · ${record.full_name}` : customer ? `Blacklist ${customer.full_name}` : 'Add to blacklist'}
      description={customer
        ? 'The details below come from this customer\'s account. Check them, choose the reason, then press Blacklist. The account is blocked and the record is added to the Blacklist.'
        : 'A customer with this ID number cannot book. A customer with a matching name is flagged for review.'}
      onClose={() => { if (!busy) onClose() }}
      size="max-w-lg"
    >
      <form onSubmit={save} className="flex flex-col gap-3">
        {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
        <label className="flex flex-col gap-1 text-sm">Full name
          <input required autoFocus={!customer} maxLength={200} className="px-3 py-2" value={form.full_name} onChange={set('full_name')} />
        </label>
        <label className="flex flex-col gap-1 text-sm">ID number
          <input required={idRequired} maxLength={100} className="px-3 py-2" placeholder={customer ? 'No ID number submitted' : "Driver's license, passport or other ID number"} value={form.id_number} onChange={set('id_number')} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">Area
            <select className="px-3 py-2" value={form.area} onChange={set('area')}>
              <option value="">—</option>
              {Object.entries(AREAS).map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">Source
            <select className="px-3 py-2" value={form.source} onChange={set('source')}>
              <option value="">—</option>
              {Object.entries(SOURCES).map(([code, name]) => <option key={code} value={code}>{code === 'WS' ? name : code}</option>)}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">Reason
          <select autoFocus={Boolean(customer)} className="px-3 py-2" value={form.reason} onChange={set('reason')}>
            {reasonChoices.map((reason) => <option key={reason}>{reason}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">Notes (optional)
          <textarea rows={3} maxLength={2000} className="px-3 py-2" value={form.notes} onChange={set('notes')} />
        </label>
        <div className="modal-actions flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={busy} className="btn-ghost px-4 py-2 text-sm">Cancel</button>
          <button type="submit" disabled={busy} className="btn-primary px-5 py-2 text-sm">
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Blacklist'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
