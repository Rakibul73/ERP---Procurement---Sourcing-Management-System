import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'

interface SourcingRequest {
  id: number
  title: string
  description: string
  status: string
  priority: string
  targetDate: string
  budget: number
  currency: string
  createdBy: number
  createdAt: string
  updatedAt: string
}

interface SupplierShortlist {
  id: number
  sourcingRequestId: number
  supplierId: number
  supplierName: string
  status: string
  notes: string
  ranking: number
  createdAt: string
}

interface Product {
  id: number
  name: string
  category: string
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

export default function SourcingPage() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<SourcingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<SourcingRequest | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    targetDate: '',
    budget: 0,
    currency: 'USD',
  })
  const [requestProducts, setRequestProducts] = useState<Array<{
    productId: number
    quantity: number
    unit: string
    specifications: string
    estimatedBudget: number
  }>>([])
  const [shortlistedSuppliers, setShortlistedSuppliers] = useState<SupplierShortlist[]>([])

  useEffect(() => {
    fetchRequests()
    fetchProducts()
    fetchSuppliers()
  }, [statusFilter, search])

  const fetchRequests = async () => {
    try {
      const data = await window.go.main.App.GetSourcingRequests(statusFilter, search)
      setRequests(data || [])
    } catch (error) {
      console.error('Failed to fetch sourcing requests:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProducts = async () => {
    try {
      const data = await window.go.main.App.GetProducts('')
      setProducts(data || [])
    } catch (error) {
      console.error('Failed to fetch products:', error)
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

  const fetchRequestDetails = async (id: number) => {
    try {
      const [reqData, productsData, shortlistData] = await Promise.all([
        window.go.main.App.GetSourcingRequest(id),
        window.go.main.App.GetSourcingRequestProducts(id),
        window.go.main.App.GetShortlistedSuppliers(id),
      ])
      setSelectedRequest(reqData)
      setRequestProducts(productsData || [])
      setShortlistedSuppliers(shortlistData || [])
    } catch (error) {
      console.error('Failed to fetch request details:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.go.main.App.CreateSourcingRequest(
        { ...formData, createdBy: user?.id || 0 },
        requestProducts
      )
      setShowForm(false)
      setFormData({ title: '', description: '', priority: 'medium', targetDate: '', budget: 0, currency: 'USD' })
      setRequestProducts([])
      fetchRequests()
    } catch (error) {
      console.error('Failed to create sourcing request:', error)
    }
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await window.go.main.App.UpdateSourcingRequestStatus(id, newStatus)
      fetchRequests()
      if (selectedRequest?.id === id) {
        fetchRequestDetails(id)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const handleAddToShortlist = async (supplierId: number) => {
    if (!selectedRequest) return

    try {
      await window.go.main.App.AddSupplierToShortlist(selectedRequest.id, supplierId, '')
      fetchRequestDetails(selectedRequest.id)
    } catch (error) {
      console.error('Failed to add to shortlist:', error)
    }
  }

  const handleRemoveFromShortlist = async (shortlistId: number) => {
    if (!selectedRequest) return

    try {
      await window.go.main.App.RemoveSupplierFromShortlist(shortlistId)
      fetchRequestDetails(selectedRequest.id)
    } catch (error) {
      console.error('Failed to remove from shortlist:', error)
    }
  }

  const addProduct = () => {
    setRequestProducts([
      ...requestProducts,
      { productId: 0, quantity: 1, unit: 'pcs', specifications: '', estimatedBudget: 0 },
    ])
  }

  const updateProduct = (index: number, field: string, value: any) => {
    const updated = [...requestProducts]
    updated[index] = { ...updated[index], [field]: value }
    setRequestProducts(updated)
  }

  const removeProduct = (index: number) => {
    setRequestProducts(requestProducts.filter((_, i) => i !== index))
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">New Sourcing Request</h1>
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

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Target Date</label>
              <input
                type="date"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Budget</label>
              <input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
              <select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CNY">CNY</option>
              </select>
            </div>
          </div>

          {/* Products Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Products</h3>
              <button
                type="button"
                onClick={addProduct}
                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"
              >
                + Add Product
              </button>
            </div>

            {requestProducts.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No products added yet</p>
            ) : (
              <div className="space-y-3">
                {requestProducts.map((product, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4 grid grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Product</label>
                      <select
                        value={product.productId}
                        onChange={(e) => updateProduct(index, 'productId', Number(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                      >
                        <option value={0}>Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Quantity</label>
                      <input
                        type="number"
                        value={product.quantity}
                        onChange={(e) => updateProduct(index, 'quantity', Number(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Budget</label>
                      <input
                        type="number"
                        value={product.estimatedBudget}
                        onChange={(e) => updateProduct(index, 'estimatedBudget', Number(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeProduct(index)}
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
              Create Request
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
          <h1 className="text-2xl font-bold text-white">Sourcing Requests</h1>
          <p className="text-gray-400 mt-1">Manage procurement sourcing requests</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg"
        >
          + New Request
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search requests..."
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

      {/* Request List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <div className="text-4xl mb-2">🔍</div>
          <p className="text-gray-400">No sourcing requests found</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
          >
            Create Your First Request
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Request Cards */}
          <div className="space-y-3">
            {requests.map((req) => (
              <div
                key={req.id}
                onClick={() => fetchRequestDetails(req.id)}
                className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-colors ${
                  selectedRequest?.id === req.id
                    ? 'border-primary-500'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{req.title}</h3>
                    {req.description && (
                      <p className="text-sm text-gray-400 mt-1 line-clamp-2">{req.description}</p>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${STATUS_COLORS[req.status] || 'bg-gray-600'} text-white`}>
                    {req.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span className={`px-2 py-0.5 rounded ${
                    req.priority === 'urgent' ? 'bg-red-600' :
                    req.priority === 'high' ? 'bg-orange-600' :
                    req.priority === 'medium' ? 'bg-yellow-600' : 'bg-gray-600'
                  } text-white`}>{req.priority}</span>
                  {req.targetDate && <span>Due: {new Date(req.targetDate).toLocaleDateString()}</span>}
                  {req.budget > 0 && <span>Budget: ${req.budget.toLocaleString()}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            {!selectedRequest ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <p>Select a request to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedRequest.title}</h2>
                    {selectedRequest.description && (
                      <p className="text-gray-400 mt-1">{selectedRequest.description}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 text-sm rounded ${STATUS_COLORS[selectedRequest.status] || 'bg-gray-600'} text-white`}>
                    {selectedRequest.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Priority:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded ${
                      selectedRequest.priority === 'urgent' ? 'bg-red-600' :
                      selectedRequest.priority === 'high' ? 'bg-orange-600' :
                      selectedRequest.priority === 'medium' ? 'bg-yellow-600' : 'bg-gray-600'
                    } text-white`}>{selectedRequest.priority}</span>
                  </div>
                  {selectedRequest.targetDate && (
                    <div>
                      <span className="text-gray-500">Target Date:</span>
                      <span className="ml-2 text-white">{new Date(selectedRequest.targetDate).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedRequest.budget > 0 && (
                    <div>
                      <span className="text-gray-500">Budget:</span>
                      <span className="ml-2 text-white">${selectedRequest.budget.toLocaleString()} {selectedRequest.currency}</span>
                    </div>
                  )}
                </div>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2">
                  {(STATUS_TRANSITIONS[selectedRequest.status] || []).map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(selectedRequest.id, status)}
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

                {/* Products */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Products ({requestProducts.length})</h3>
                  {requestProducts.length > 0 ? (
                    <div className="space-y-2">
                      {requestProducts.map((p, i) => (
                        <div key={i} className="bg-gray-700/50 rounded px-3 py-2 text-sm">
                          <span className="text-white">{products.find(prod => prod.id === p.productId)?.name || `Product #${p.productId}`}</span>
                          <span className="text-gray-400 ml-2">× {p.quantity}</span>
                          {p.estimatedBudget > 0 && (
                            <span className="text-gray-500 ml-2">(${p.estimatedBudget})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No products</p>
                  )}
                </div>

                {/* Shortlisted Suppliers */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-300">
                      Shortlisted Suppliers ({shortlistedSuppliers.length})
                    </h3>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddToShortlist(Number(e.target.value))
                          e.target.value = ''
                        }
                      }}
                      className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-sm text-white"
                      defaultValue=""
                    >
                      <option value="">+ Add Supplier</option>
                      {suppliers
                        .filter((s) => !shortlistedSuppliers.some((ss) => ss.supplierId === s.id))
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.companyName}</option>
                        ))}
                    </select>
                  </div>

                  {shortlistedSuppliers.length > 0 ? (
                    <div className="space-y-2">
                      {shortlistedSuppliers.map((ss) => (
                        <div key={ss.id} className="bg-gray-700/50 rounded px-3 py-2 flex items-center justify-between">
                          <div>
                            <span className="text-white text-sm">{ss.supplierName}</span>
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded ${
                              ss.status === 'selected' ? 'bg-green-600' :
                              ss.status === 'contacted' ? 'bg-blue-600' : 'bg-gray-600'
                            } text-white`}>
                              {ss.status}
                            </span>
                            {ss.notes && (
                              <span className="ml-2 text-xs text-gray-500">({ss.notes})</span>
                            )}
                          </div>
                          <button
                            onClick={() => handleRemoveFromShortlist(ss.id)}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No suppliers shortlisted</p>
                  )}
                </div>

                {/* Metadata */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Created: {new Date(selectedRequest.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedRequest.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
