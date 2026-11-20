import { useEffect, useState } from 'react'
import { subscribe } from '../lib/realtime'
import { Pencil, Plus, Trash2, UserRoundCheck } from 'lucide-react'
import { api } from '../lib/api'
import Layout from '../components/Layout'
import { PageHeader, FilterBar } from '../components/PageParts'
import BlacklistForm, { AREAS, REASONS, SOURCES } from '../components/BlacklistForm'
import SearchBar from '../components/SearchBar'
import { matchesSearch } from '../lib/search'

const PAGE_SIZE = 20 // rows shown per page

const ACCOUNT_BLOCKED = 'Account blocked' // reason shown for customer accounts blocked in WheelSync
const NEW_FOR_DAYS = 7 // a record the admin added is highlighted as newly added for this many days

// A record the admin added by hand. Records loaded from Pardz's printed list were saved together in one
// database transaction, so they share the same created_at to the second; a record added through this page
// has a time of its own.
function addedByAdmin(record, sharedTimes) {
  return !sharedTimes.has(record.created_at.slice(0, 19))
}

function isRecent(value) {
  return Date.now() - new Date(value).getTime() < NEW_FOR_DAYS * 24 * 60 * 60 * 1000
}

// Previous / Next bar under the table
function Pager({ page, total, onChange }) {
  if (total === 0) return null
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const from = (currentPage - 1) * PAGE_SIZE + 1
  const to = Math.min(currentPage * PAGE_SIZE, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm" style={{ borderTop: '1px solid var(--border-soft)', color: 'var(--text-muted)' }}>
      <span>Showing {from}–{to} of {total}</span>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange(currentPage - 1)} disabled={currentPage <= 1} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">Previous</button>
        <span>Page {currentPage} of {pageCount}</span>
        <button onClick={() => onChange(currentPage + 1)} disabled={currentPage >= pageCount} className="btn-ghost px-3 py-1.5 text-xs disabled:opacity-40">Next</button>
      </div>
    </div>
  )
}

export default function Blacklist() {
  const [customers, setCustomers] = useState([])
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [editing, setEditing] = useState(null) // null = closed, {} = adding, record = editing
  const [page, setPage] = useState(1)
  const [sharedGroups, setSharedGroups] = useState([]) // accounts that share an ID number
  const [customerNames, setCustomerNames] = useState({})

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true)
    try {
      const [blocked, list, all, shared] = await Promise.all([
        api.get('/admin/customers', { blacklisted: true }),
        api.get('/admin/blacklist-records'),
        api.get('/admin/customers').catch(() => []),
        api.get('/admin/customers/shared-ids').catch(() => []),
      ])
      setCustomers(blocked)
      setRecords(list)
      setCustomerNames(Object.fromEntries(all.map((customer) => [customer.id, customer.full_name])))
      setSharedGroups(shared)
    } catch (loadError) {
      console.error('Unable to load blacklist:', loadError.message)
    }
    setLoading(false)
  }

  useEffect(() => { load(); return subscribe('*', () => load({ silent: true })) }, [])

  // Back to page 1 whenever the search or the reason filter changes.
  useEffect(() => { setPage(1) }, [search, reasonFilter])

  async function removeFromBlacklist(customer) {
    if (!window.confirm(`Unblock ${customer.full_name}? The account can sign in and book again.`)) return
    try {
      await api.patch(`/admin/customers/${customer.id}/blacklist`, { is_blacklisted: false })
    } catch (updateError) {
      console.error('Unable to update blacklist:', updateError.message)
    }
    load()
  }

  function openForm(record = null) {
    setEditing(record || {})
  }

  async function deleteRecord(record) {
    if (!window.confirm(`Remove ${record.full_name} from the blacklist records?`)) return
    try {
      await api.delete(`/admin/blacklist-records/${record.id}`)
    } catch (deleteError) {
      console.error('Unable to remove blacklist record:', deleteError.message)
    }
    load()
  }

  const reasons = [...new Set([...REASONS, ...records.map((record) => record.reason)])]

  // One table for everyone on the blacklist: the customer accounts blocked in WheelSync and the records
  // the admin added recently come first and are highlighted as newly added; Pardz's list follows.
  const timeCounts = records.reduce((counts, record) => {
    const second = record.created_at.slice(0, 19)
    counts.set(second, (counts.get(second) || 0) + 1)
    return counts
  }, new Map())
  const sharedTimes = new Set([...timeCounts].filter(([, count]) => count > 1).map(([second]) => second))

  // A blocked account whose ID number is also on a record (e.g. blacklisted from the Customers page) is one
  // person: it is shown once, on its record, with an Unblock button for the account.
  const bareId = (value) => String(value || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
  const accountByRecord = new Map()
  const unmatchedAccounts = customers.filter((customer) => {
    const ids = [customer.id_number, customer.second_id_number].map(bareId).filter(Boolean)
    const record = records.find((item) => item.id_number && ids.includes(bareId(item.id_number)))
    if (record) accountByRecord.set(record.id, customer)
    return !record
  })

  const accountRows = unmatchedAccounts.map((customer) => ({
    key: `account-${customer.id}`,
    kind: 'account',
    isNew: true,
    name: customer.full_name,
    detail: [customer.email, customer.phone].filter(Boolean).join(' · '),
    idNumbers: [customer.id_number, customer.second_id_number].filter(Boolean),
    area: '',
    source: '',
    reason: ACCOUNT_BLOCKED,
    customer,
  }))
  const recordRows = records.map((record) => ({
    key: `record-${record.id}`,
    kind: 'record',
    isNew: accountByRecord.has(record.id) || (addedByAdmin(record, sharedTimes) && isRecent(record.created_at)),
    name: record.full_name,
    detail: record.notes || '',
    idNumbers: record.id_number ? [record.id_number] : [],
    area: record.area || '',
    source: record.source || '',
    reason: record.reason,
    createdAt: record.created_at,
    record,
    customer: accountByRecord.get(record.id) || null,
  }))
  const newestFirst = (a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  const rows = [
    ...accountRows,
    ...recordRows.filter((row) => row.isNew).sort(newestFirst),
    ...recordRows.filter((row) => !row.isNew),
  ]

  const visibleRows = rows
    .filter((row) => !reasonFilter || row.reason === reasonFilter)
    .filter((row) => matchesSearch(
      search, row.name, row.detail, row.customer?.email, row.customer?.phone, ...row.idNumbers, row.reason, row.area, AREAS[row.area], row.source, SOURCES[row.source],
      row.kind === 'account' ? 'WheelSync account' : '', row.isNew ? 'new newly added' : '',
    ))
  const newCount = rows.filter((row) => row.isNew).length

  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pagedRows = visibleRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <Layout>
      <PageHeader
        title="Blacklist"
        description="Everyone Pardz does not transact with: the renters on Pardz's list and the customer accounts blocked in WheelSync. A customer whose ID number is on the list cannot book; a customer whose name matches is flagged for review. Newly added entries are highlighted at the top."
        actions={(
          <button onClick={() => openForm()} className="btn-primary px-4 py-2 text-sm flex items-center gap-2">
            <Plus size={16} /> Add to list
          </button>
        )}
      />

      {editing && (
        <BlacklistForm
          record={editing.id ? editing : null}
          reasons={reasons}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}

      <FilterBar>
        <SearchBar value={search} onChange={setSearch} placeholder="Search name, ID number, email, phone, reason, or area" />
        <select value={reasonFilter} onChange={(e) => setReasonFilter(e.target.value)} className="px-3 py-2 text-sm" aria-label="Filter by reason">
          <option value="">All reasons</option>
          {reasons.map((reason) => <option key={reason}>{reason}</option>)}
          {customers.length > 0 && <option value={ACCOUNT_BLOCKED}>{ACCOUNT_BLOCKED}</option>}
        </select>
      </FilterBar>

      {sharedGroups.length > 0 && (
        <section className="card p-5 mb-6" style={{ borderColor: 'var(--warning)' }}>
          <h2 className="font-display font-semibold mb-1">Same ID number on more than one account</h2>
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>Someone else may be using this ID number. Check the ID before approving these customers.</p>
          <ul className="flex flex-col gap-2 text-sm">
            {sharedGroups.map((group) => (
              <li key={group.customer_id} className="rounded-lg p-3" style={{ background: 'var(--bg-surface-2)' }}>
                <p className="font-medium">
                  {customerNames[group.customer_id] || 'Customer account'}
                  {group.blacklisted_share && <span className="badge badge-rejected ml-2">Shares with a blacklisted account</span>}
                </p>
                <p style={{ color: 'var(--text-muted)' }}>
                  Same ID number as: {group.shares_with.map((other) => `${other.full_name} (${other.matching_numbers.join(', ')})`).join('; ')}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {loading ? <p style={{ color: 'var(--text-muted)' }}>Loading...</p> : (
        <section>
          <h2 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold">
            Blacklist ({visibleRows.length}{visibleRows.length !== rows.length ? ` of ${rows.length}` : ''})
            {newCount > 0 && <span className="badge-new">{newCount} newly added</span>}
          </h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left" style={{ color: 'var(--text-muted)' }}>
                <th className="py-3 px-5 font-medium">#</th>
                <th className="py-3 px-5 font-medium">Name</th>
                <th className="py-3 px-5 font-medium">ID number</th>
                <th className="py-3 px-5 font-medium">Area</th>
                <th className="py-3 px-5 font-medium">Source</th>
                <th className="py-3 px-5 font-medium">Reason</th>
                <th className="py-3 px-5 font-medium text-right">Actions</th>
              </tr></thead>
              <tbody>
                {pagedRows.map((row, index) => (
                  <tr key={row.key} className={row.isNew ? 'row-new' : undefined} style={{ borderTop: '1px solid var(--border-soft)' }}>
                    <td className="py-3 px-5" style={{ color: 'var(--text-muted)' }}>{(currentPage - 1) * PAGE_SIZE + index + 1}</td>
                    <td className="py-3 px-5 font-medium">
                      <span className="flex flex-wrap items-center gap-2">
                        {row.name}
                        {row.isNew && <span className="badge-new">Newly added</span>}
                        {row.kind === 'record' && row.customer && <span className="badge badge-rejected">Account blocked</span>}
                      </span>
                      {row.kind === 'record' && row.customer && <span className="block text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{[row.customer.email, row.customer.phone].filter(Boolean).join(' · ')}</span>}
                      {row.detail && <span className="block text-xs font-normal" style={{ color: 'var(--text-muted)' }}>{row.detail}</span>}
                    </td>
                    <td className="py-3 px-5 whitespace-nowrap">
                      {row.idNumbers.length ? row.idNumbers.map((number) => <span key={number} className="block">{number}</span>) : '—'}
                    </td>
                    <td className="py-3 px-5" title={AREAS[row.area]}>{row.area || '—'}</td>
                    <td className="py-3 px-5" title={SOURCES[row.source]}>{row.kind === 'account' || row.source === 'WS' ? 'WheelSync account' : row.source || '—'}</td>
                    <td className="py-3 px-5"><span className="badge badge-rejected">{row.reason}</span></td>
                    <td className="py-3 px-5 text-right whitespace-nowrap">
                      {row.kind === 'account' ? (
                        <button onClick={() => removeFromBlacklist(row.customer)} className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"><UserRoundCheck size={13} /> Unblock</button>
                      ) : (
                        <>
                          {row.customer && <button onClick={() => removeFromBlacklist(row.customer)} className="btn-ghost mr-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" title="Let this account sign in again; the record stays on the list"><UserRoundCheck size={13} /> Unblock</button>}
                          <button onClick={() => openForm(row.record)} className="btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"><Pencil size={13} /> Edit</button>
                          <button onClick={() => deleteRecord(row.record)} className="btn-ghost ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs" style={{ color: 'var(--danger)' }}><Trash2 size={13} /> Remove</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
                {visibleRows.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    {rows.length ? 'No one on the blacklist matches this search.' : 'The blacklist is empty.'}
                  </td></tr>
                )}
              </tbody>
            </table>
            <Pager page={currentPage} total={visibleRows.length} onChange={setPage} />
          </div>
        </section>
      )}
    </Layout>
  )
}
