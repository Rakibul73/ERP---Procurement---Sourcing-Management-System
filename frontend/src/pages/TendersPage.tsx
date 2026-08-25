import { useState, useEffect } from 'react'

interface Tender {
  id: number
  title: string
  sourcingRequestId: number | null
  deadline: string
  status: string
  notes: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

interface TenderSupplier {
  id: number
  tenderId: number
  supplierId: number
  supplierName: string
  status: string
  responseDate: string | null
  createdAt: string
}

interface Supplier {
  id: number
  companyName: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-600',
  open: 'bg-blue-600',
  evaluating: 'bg-purple-600',
  awarded: 'bg-green-600',
  completed: 'bg-green-800',
  cancelled: 'bg-red-600',
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['open', 'cancelled'],
  open: ['evaluating', 'cancelled'],
  evaluating: ['awarded', 'cancelled'],
  awarded: ['completed', 'cancelled'],
  completed: [],
  cancelled: ['draft'],
}

export default function TendersPage() {
  const [tenders, setTenders] = useState<Tender[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedTender, setSelectedTender] = useState<Tender | null>(null)
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formData, setFormData] = useState({
    title: '',
    deadline: '',
    notes: '',
    sourcingRequestId: 0,
  })
  const [tenderItems, setTenderItems] = useState<Array<{
    productName: string
    specifications: string
    quantity: number
    unit: string
  }>>([])
  const [tenderSuppliers, setTenderSuppliers] = useState<TenderSupplier[]>([])

  useEffect(() => {
    fetchTenders()
    fetchSuppliers()
  }, [statusFilter, search])

  const fetchTenders = async () => {
    try {
      const data = await window.go.main.App.GetTenders(statusFilter, search)
      setTenders(data || [])
    } catch (error) {
      console.error('Failed to fetch tenders:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSuppliers = async () => {
    try {
      const data = await window.go.main.App.GetSuppliers('')
      setSuppliers(data || [])
    } catch (error) {
      console.error('Failed to fetch suppliers:', error)
    }
  }

  const fetchTenderDetails = async (id: number) => {
    try {
      const [tenderData, itemsData, suppliersData] = await Promise.all([
        window.go.main.App.GetTender(id),
        window.go.main.App.GetTenderItems(id),
        window.go.main.App.GetTenderSuppliers(id),
      ])
      setSelectedTender(tenderData)
      setTenderItems(itemsData || [])
      setTenderSuppliers(suppliersData || [])
    } catch (error) {
      console.error('Failed to fetch tender details:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const tender = {
        ...formData,
        sourcingRequestId: formData.sourcingRequestId || null,
      }
      await window.go.main.App.CreateTender(tender, tenderItems)
      setShowForm(false)
      setFormData({ title: '', deadline: '', notes: '', sourcingRequestId: 0 })
      setTenderItems([])
      fetchTenders()
    } catch (error) {
      console.error('Failed to create tender:', error)
    }
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await window.go.main.App.UpdateTenderStatus(id, newStatus)
      fetchTenders()
      if (selectedTender?.id === id) {
        fetchTenderDetails(id)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleInviteSupplier = async (supplierId: number) => {
    if (!selectedTender) return

    try {
      await window.go.main.App.InviteSupplierToTender(selectedTender.id, supplierId)
      fetchTenderDetails(selectedTender.id)
    } catch (error) {
      console.error('Failed to invite supplier:', error)
    }
  }

  const handleRemoveSupplier = async (supplierTenderId: number) => {
    if (!selectedTender) return

    try {
      await window.go.main.App.RemoveSupplierFromTender(supplierTenderId)
      fetchTenderDetails(selectedTender.id)
    } catch (error) {
      console.error('Failed to remove supplier:', error)
    }
  }

  const addItem = () => {
    setTenderItems([
      ...tenderItems,
      { productName: '', specifications: '', quantity: 1, unit: 'pcs' },
    ])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...tenderItems]
    updated[index] = { ...updated[index], [field]: value }
    setTenderItems(updated)
  }

  const removeItem = (index: number) => {
    setTenderItems(tenderItems.filter((_, i) => i !== index))
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">New Tender / RFQ</h1>
          <button
            onClick={() => setShowForm(false)}
            className="px-4 py-2 text-gray-400 hover:text-white"
          >
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Deadline</label>
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Sourcing Request ID</label>
              <input
                type="number"
                value={formData.sourcingRequestId || ''}
                onChange={(e) => setFormData({ ...formData, sourcingRequestId: e.target.value ? Number(e.target.value) : 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                placeholder="Optional"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"
              >
                + Add Item
              </button>
            </div>

            {tenderItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No items added yet</p>
            ) : (
              <div className="space-y-3">
                {tenderItems.map((item, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4 grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Product Name</label>
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItem(index, 'productName', e.target.value)}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Specifications</label>
                      <input
                        type="text"
                        value={item.specifications}
                        onChange={(e) => updateItem(index, 'specifications', e.target.value)}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-2 py-1 text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg"
            >
              Create Tender
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tenders / RFQs</h1>
          <p className="text-gray-400 mt-1">Manage request for quotations and tender processes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg"
        >
          + New Tender
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search tenders..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="evaluating">Evaluating</option>
          <option value="awarded">Awarded</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Tender List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : tenders.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-400">No tenders found</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
          >
            Create Your First Tender
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tender Cards */}
          <div className="space-y-3">
            {tenders.map((tender) => (
              <div
                key={tender.id}
                onClick={() => fetchTenderDetails(tender.id)}
                className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-colors ${
                  selectedTender?.id === tender.id
                    ? 'border-primary-500'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{tender.title}</h3>
                    {tender.notes && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{tender.notes}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${STATUS_COLORS[tender.status] || 'bg-gray-600'} text-white`}>
                    {tender.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  {tender.deadline && <span>Deadline: {new Date(tender.deadline).toLocaleDateString()}</span>}
                  {tender.sourcingRequestId && <span>SR: #{tender.sourcingRequestId}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            {!selectedTender ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <p>Select a tender to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedTender.title}</h2>
                    {selectedTender.notes && (
                      <p className="text-gray-400 mt-1">{selectedTender.notes}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 text-sm rounded ${STATUS_COLORS[selectedTender.status] || 'bg-gray-600'} text-white`}>
                    {selectedTender.status}
                  </span>
                </div>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2">
                  {(STATUS_TRANSITIONS[selectedTender.status] || []).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedTender.id, status)}
                      className={`px-3 py-1 text-sm rounded ${
                        status === 'cancelled'
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-primary-600 hover:bg-primary-700'
                      } text-white`}
                    >
                      Move to {status}
                    </button>
                  ))}
                </div>

                {/* Items */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Items ({tenderItems.length})</h3>
                  {tenderItems.length > 0 ? (
                    <div className="space-y-2">
                      {tenderItems.map((item, i) => (
                        <div key={i} className="bg-gray-700/50 rounded px-3 py-2 text-sm">
                          <span className="text-white">{item.productName}</span>
                          <span className="text-gray-400 ml-2">× {item.quantity} {item.unit}</span>
                          {item.specifications && (
                            <span className="text-gray-500 ml-2">({item.specifications})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No items</p>
                  )}
                </div>

                {/* Invited Suppliers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-300">
                      Invited Suppliers ({tenderSuppliers.length})
                    </h3>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleInviteSupplier(Number(e.target.value))
                          e.target.value = ''
                        }
                      }}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                      defaultValue=""
                    >
                      <option value="">+ Invite Supplier</option>
                      {suppliers
                        .filter((s) => !tenderSuppliers.some((ts) => ts.supplierId === s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.companyName}</option>
                        ))}
                    </select>
                  </div>

                  {tenderSuppliers.length > 0 ? (
                    <div className="space-y-2">
                      {tenderSuppliers.map((ts) => (
                        <div key={ts.id} className="bg-gray-700/50 rounded px-3 py-2 flex items-center justify-between">
                          <div>
                            <span className="text-white text-sm">{ts.supplierName}</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                              ts.status === 'responded' ? 'bg-green-600' :
                              ts.status === 'selected' ? 'bg-blue-600' :
                              ts.status === 'rejected' ? 'bg-red-600' : 'bg-gray-600'
                            } text-white`}>
                              {ts.status}
                            </span>
                            {ts.responseDate && (
                              <span className="ml-2 text-xs text-gray-500">
                                Responded: {new Date(ts.responseDate).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveSupplier(ts.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No suppliers invited</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Created: {new Date(selectedTender.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedTender.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
