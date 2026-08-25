import { useState, useEffect } from 'react'

interface Communication {
  id: number
  entityType: string
  entityId: number
  direction: string
  channel: string
  subject: string
  content: string
  contactName: string
  contactEmail: string
  contactPhone: string
  attachments: string
  createdBy: number | null
  createdByName: string
  createdAt: string
}

const CHANNELS = ['email', 'phone', 'meeting', 'note']
const DIRECTIONS = ['inbound', 'outbound']
const ENTITY_TYPES = ['supplier', 'customer', 'sourcing_request', 'tender', 'purchase_order', 'quotation']

const CHANNEL_ICONS: Record<string, string> = {
  email: '📧', phone: '📞', meeting: '🤝', note: '📝',
}

const ENTITY_LABELS: Record<string, string> = {
  supplier: 'Supplier',
  customer: 'Customer',
  sourcing_request: 'Sourcing',
  tender: 'Tender',
  purchase_order: 'PO',
  quotation: 'Quotation',
}

export default function CommunicationsPage() {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [viewMode, setViewMode] = useState<'all' | 'filtered'>('all')
  const [entityType, setEntityType] = useState('supplier')
  const [entityId, setEntityId] = useState('')

  const [formData, setFormData] = useState({
    direction: 'outbound', channel: 'email', subject: '', content: '',
    contactName: '', contactEmail: '', contactPhone: '',
  })

  useEffect(() => {
    if (viewMode === 'all') {
      fetchAllCommunications()
    } else if (entityId) {
      fetchCommunications()
    }
  }, [viewMode, entityType, entityId])

  const fetchAllCommunications = async () => {
    setLoading(true)
    try {
      const data = await window.go.main.App.GetAllCommunications()
      setCommunications(data || [])
    } catch (error) {
      console.error('Failed to fetch communications:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCommunications = async () => {
    if (!entityId) return
    setLoading(true)
    try {
      const data = await window.go.main.App.GetCommunications(entityType, Number(entityId))
      setCommunications(data || [])
    } catch (error) {
      console.error('Failed to fetch communications:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.go.main.App.CreateCommunication({
        ...formData,
        entityType,
        entityId: Number(entityId) || 0,
        createdBy: null,
      })
      setShowForm(false)
      setFormData({ direction: 'outbound', channel: 'email', subject: '', content: '', contactName: '', contactEmail: '', contactPhone: '' })
      if (viewMode === 'all') fetchAllCommunications()
      else fetchCommunications()
    } catch (error) {
      console.error('Failed to create communication:', error)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this communication log?')) return
    try {
      await window.go.main.App.DeleteCommunication(id)
      if (viewMode === 'all') fetchAllCommunications()
      else fetchCommunications()
    } catch (error) {
      console.error('Failed to delete communication:', error)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Communications</h1>
        <p className="text-gray-400 mt-1">Track emails, calls, and meetings with suppliers and customers</p>
      </div>

      {/* View Mode Toggle */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
              All Communications
            </button>
            <button
              onClick={() => setViewMode('filtered')}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                viewMode === 'filtered' ? 'bg-primary-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}>
              Filter by Entity
            </button>
          </div>

          {viewMode === 'filtered' && (
            <>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Entity Type</label>
                <select value={entityType} onChange={(e) => { setEntityType(e.target.value); setEntityId(''); setCommunications([]) }}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                  {ENTITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Entity ID</label>
                <input type="number" value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white w-32" min="1"
                  placeholder="e.g. 1" />
              </div>
            </>
          )}

          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg">
            + Log Communication
          </button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Direction</label>
              <select value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                {DIRECTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Channel</label>
              <select value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
              <input type="text" value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Subject *</label>
            <input type="text" value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" required />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Content *</label>
            <textarea value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={3} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Email</label>
              <input type="email" value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contact Phone</label>
              <input type="text" value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg">Log Communication</button>
          </div>
        </form>
      )}

      {/* Communications List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : communications.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <div className="text-4xl mb-2">📭</div>
          <p className="text-gray-400">
            {viewMode === 'all'
              ? 'No communications logged yet'
              : 'No communications logged for this entity'}
          </p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
            Log First Communication
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {communications.map((comm) => (
            <div key={comm.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{CHANNEL_ICONS[comm.channel] || '📝'}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 text-xs rounded ${
                        comm.direction === 'inbound' ? 'bg-blue-600' : 'bg-purple-600'
                      } text-white`}>{comm.direction}</span>
                      <span className="text-xs text-gray-500 uppercase">{comm.channel}</span>
                      {viewMode === 'all' && (
                        <span className="px-2 py-0.5 text-xs rounded bg-gray-600 text-gray-200">
                          {ENTITY_LABELS[comm.entityType] || comm.entityType} #{comm.entityId}
                        </span>
                      )}
                    </div>
                    <h3 className="text-white font-medium mt-1">{comm.subject}</h3>
                    <p className="text-gray-400 text-sm mt-1 whitespace-pre-wrap">{comm.content}</p>
                    {comm.contactName && (
                      <p className="text-xs text-gray-500 mt-2">
                        Contact: {comm.contactName}
                        {comm.contactEmail && ` (${comm.contactEmail})`}
                        {comm.contactPhone && ` | ${comm.contactPhone}`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{new Date(comm.createdAt).toLocaleString()}</span>
                  <button onClick={() => handleDelete(comm.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
