import { useState, useEffect } from 'react'

interface PurchaseOrder {
  id: number
  quotationId: number | null
  supplierId: number
  supplierName: string
  poNumber: string
  status: string
  totalAmount: number
  currency: string
  orderDate: string | null
  expectedDelivery: string | null
  actualDelivery: string | null
  paymentTerms: string
  shippingTerms: string
  deliveryAddress: string
  notes: string
  createdBy: number | null
  createdByName: string
  createdAt: string
  updatedAt: string
}

interface POLineItem {
  id: number
  purchaseOrderId: number
  productName: string
  specifications: string
  quantity: number
  unitPrice: number
  totalPrice: number
  notes: string
  createdAt: string
}

interface Supplier {
  id: number
  companyName: string
}

interface Quotation {
  id: number
  title: string
  supplierId: number
  supplierName: string
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-600',
  approved: 'bg-blue-600',
  sent: 'bg-purple-600',
  confirmed: 'bg-yellow-600',
  delivered: 'bg-green-600',
  cancelled: 'bg-red-600',
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['approved', 'cancelled'],
  approved: ['sent', 'cancelled'],
  sent: ['confirmed'],
  confirmed: ['delivered'],
  delivered: [],
  cancelled: [],
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null)
  const [lineItems, setLineItems] = useState<POLineItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const [formData, setFormData] = useState({
    quotationId: 0,
    supplierId: 0,
    currency: 'USD',
    expectedDelivery: '',
    paymentTerms: '',
    shippingTerms: '',
    deliveryAddress: '',
    notes: '',
  })
  const [formItems, setFormItems] = useState<Array<{
    productName: string
    specifications: string
    quantity: number
    unitPrice: number
    notes: string
  }>>([])

  useEffect(() => {
    fetchPurchaseOrders()
    fetchSuppliers()
    fetchQuotations()
  }, [statusFilter, search])

  const fetchPurchaseOrders = async () => {
    try {
      const data = await window.go.main.App.GetPurchaseOrders(statusFilter, search)
      setPurchaseOrders(data || [])
    } catch (error) {
      console.error('Failed to fetch POs:', error)
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

  const fetchQuotations = async () => {
    try {
      const data = await window.go.main.App.GetQuotations('accepted', '')
      setQuotations(data || [])
    } catch (error) {
      console.error('Failed to fetch quotations:', error)
    }
  }

  const fetchPODetails = async (id: number) => {
    try {
      const [poData, itemsData] = await Promise.all([
        window.go.main.App.GetPurchaseOrder(id),
        window.go.main.App.GetPurchaseOrderLineItems(id),
      ])
      setSelectedPO(poData)
      setLineItems(itemsData || [])
    } catch (error) {
      console.error('Failed to fetch PO details:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const po = {
        ...formData,
        quotationId: formData.quotationId || null,
        expectedDelivery: formData.expectedDelivery || null,
      }
      await window.go.main.App.CreatePurchaseOrder(po, formItems)
      setShowForm(false)
      resetForm()
      fetchPurchaseOrders()
    } catch (error) {
      console.error('Failed to create PO:', error)
    }
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await window.go.main.App.UpdatePurchaseOrderStatus(id, newStatus)
      fetchPurchaseOrders()
      if (selectedPO?.id === id) {
        fetchPODetails(id)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      quotationId: 0,
      supplierId: 0,
      currency: 'USD',
      expectedDelivery: '',
      paymentTerms: '',
      shippingTerms: '',
      deliveryAddress: '',
      notes: '',
    })
    setFormItems([])
  }

  const handleQuotationSelect = async (quotationId: number) => {
    if (quotationId === 0) {
      setFormData({ ...formData, quotationId: 0, supplierId: 0 })
      setFormItems([])
      return
    }

    try {
      const quot = quotations.find(q => q.id === quotationId)
      if (quot) {
        setFormData({ ...formData, quotationId, supplierId: quot.supplierId })

        // Auto-populate items from quotation
        const items = await window.go.main.App.GetQuotationLineItems(quotationId)
        setFormItems((items || []).map((item: any) => ({
          productName: item.productName,
          specifications: item.specifications,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          notes: item.notes || '',
        })))
      }
    } catch (error) {
      console.error('Failed to load quotation items:', error)
    }
  }

  const addItem = () => {
    setFormItems([
      ...formItems,
      { productName: '', specifications: '', quantity: 1, unitPrice: 0, notes: '' },
    ])
  }

  const updateFormItem = (index: number, field: string, value: any) => {
    const updated = [...formItems]
    updated[index] = { ...updated[index], [field]: value }
    setFormItems(updated)
  }

  const removeFormItem = (index: number) => {
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0)

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">New Purchase Order</h1>
          <button onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2 text-gray-400 hover:text-white">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">From Quotation (optional)</label>
              <select value={formData.quotationId} onChange={(e) => handleQuotationSelect(Number(e.target.value))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                <option value={0}>Create manually</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>{q.title || `Q#${q.id}`} - {q.supplierName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Supplier *</label>
              <select value={formData.supplierId} onChange={(e) => setFormData({ ...formData, supplierId: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" required>
                <option value={0}>Select supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.companyName}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Currency</label>
              <select value={formData.currency} onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="CNY">CNY</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Expected Delivery</label>
              <input type="date" value={formData.expectedDelivery}
                onChange={(e) => setFormData({ ...formData, expectedDelivery: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms</label>
              <input type="text" value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. Net 30" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Shipping Terms</label>
              <input type="text" value={formData.shippingTerms}
                onChange={(e) => setFormData({ ...formData, shippingTerms: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. FOB" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Delivery Address</label>
              <input type="text" value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary-500" rows={2} />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Line Items</h3>
              <button type="button" onClick={addItem}
                className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
                + Add Item
              </button>
            </div>

            {formItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No items added yet</p>
            ) : (
              <div className="space-y-3">
                {formItems.map((item, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4 grid grid-cols-5 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Product Name</label>
                      <input type="text" value={item.productName}
                        onChange={(e) => updateFormItem(index, 'productName', e.target.value)}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Qty</label>
                      <input type="number" value={item.quantity}
                        onChange={(e) => updateFormItem(index, 'quantity', Number(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm" min="0" />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Unit Price</label>
                      <input type="number" value={item.unitPrice}
                        onChange={(e) => updateFormItem(index, 'unitPrice', Number(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm" min="0" step="0.01" />
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={() => removeFormItem(index)}
                        className="px-2 py-1 text-red-400 hover:text-red-300 text-sm">Remove</button>
                    </div>
                  </div>
                ))}
                <div className="bg-gray-700/30 rounded px-3 py-2 flex items-center justify-between text-sm font-medium">
                  <span className="text-gray-300">Estimated Total</span>
                  <span className="text-primary-400">
                    ${formItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button type="submit"
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg">
              Create Purchase Order
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
          <h1 className="text-2xl font-bold text-white">Purchase Orders</h1>
          <p className="text-gray-400 mt-1">Manage purchase orders and track deliveries</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg">
          + New Purchase Order
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input type="text" placeholder="Search POs..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="sent">Sent</option>
          <option value="confirmed">Confirmed</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* PO List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : purchaseOrders.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <div className="text-4xl mb-2">📦</div>
          <p className="text-gray-400">No purchase orders found</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
            Create Your First PO
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* PO Cards */}
          <div className="space-y-3">
            {purchaseOrders.map((po) => (
              <div key={po.id}
                onClick={() => fetchPODetails(po.id)}
                className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-colors ${
                  selectedPO?.id === po.id
                    ? 'border-primary-500'
                    : 'border-gray-700 hover:border-gray-600'
                }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{po.poNumber}</h3>
                    <p className="text-sm text-gray-400 mt-1">{po.supplierName}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 text-xs rounded ${STATUS_COLORS[po.status] || 'bg-gray-600'} text-white`}>
                      {po.status}
                    </span>
                    <p className="text-white font-medium mt-1">${po.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>{po.currency}</span>
                  {po.expectedDelivery && <span>Expected: {new Date(po.expectedDelivery).toLocaleDateString()}</span>}
                  {po.createdByName && <span>By: {po.createdByName}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            {!selectedPO ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <p>Select a PO to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedPO.poNumber}</h2>
                    <p className="text-gray-400 mt-1">{selectedPO.supplierName}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 text-sm rounded ${STATUS_COLORS[selectedPO.status] || 'bg-gray-600'} text-white`}>
                      {selectedPO.status}
                    </span>
                    <p className="text-2xl text-primary-400 font-bold mt-2">
                      ${selectedPO.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2">
                  {(STATUS_TRANSITIONS[selectedPO.status] || []).map((status) => (
                    <button key={status}
                      onClick={() => handleStatusChange(selectedPO.id, status)}
                      className={`px-3 py-1 text-sm rounded ${
                        status === 'cancelled' ? 'bg-red-600 hover:bg-red-700'
                        : status === 'approved' ? 'bg-blue-600 hover:bg-blue-700'
                        : status === 'delivered' ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-primary-600 hover:bg-primary-700'
                      } text-white`}>
                      {status === 'approved' ? '✓ Approve' : status === 'delivered' ? '📦 Mark Delivered' : `Move to ${status}`}
                    </button>
                  ))}
                </div>

                {/* PO Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Currency:</span><span className="ml-2 text-white">{selectedPO.currency}</span></div>
                  {selectedPO.orderDate && (
                    <div><span className="text-gray-500">Order Date:</span><span className="ml-2 text-white">{new Date(selectedPO.orderDate).toLocaleDateString()}</span></div>
                  )}
                  {selectedPO.expectedDelivery && (
                    <div><span className="text-gray-500">Expected Delivery:</span><span className="ml-2 text-white">{new Date(selectedPO.expectedDelivery).toLocaleDateString()}</span></div>
                  )}
                  {selectedPO.actualDelivery && (
                    <div><span className="text-gray-500">Actual Delivery:</span><span className="ml-2 text-white">{new Date(selectedPO.actualDelivery).toLocaleDateString()}</span></div>
                  )}
                  {selectedPO.paymentTerms && (
                    <div><span className="text-gray-500">Payment:</span><span className="ml-2 text-white">{selectedPO.paymentTerms}</span></div>
                  )}
                  {selectedPO.shippingTerms && (
                    <div><span className="text-gray-500">Shipping:</span><span className="ml-2 text-white">{selectedPO.shippingTerms}</span></div>
                  )}
                  {selectedPO.quotationId && (
                    <div><span className="text-gray-500">Quotation:</span><span className="ml-2 text-white">#{selectedPO.quotationId}</span></div>
                  )}
                  {selectedPO.createdByName && (
                    <div><span className="text-gray-500">Created by:</span><span className="ml-2 text-white">{selectedPO.createdByName}</span></div>
                  )}
                </div>

                {selectedPO.deliveryAddress && (
                  <div className="text-sm">
                    <span className="text-gray-500">Delivery Address:</span>
                    <span className="ml-2 text-white">{selectedPO.deliveryAddress}</span>
                  </div>
                )}

                {/* Line Items */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Line Items ({lineItems.length})</h3>
                  {lineItems.length > 0 ? (
                    <div className="space-y-2">
                      {lineItems.map((item) => (
                        <div key={item.id} className="bg-gray-700/50 rounded px-3 py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-white">{item.productName}</span>
                            <span className="text-white font-medium">${item.totalPrice.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            <span>Qty: {item.quantity}</span>
                            <span>Unit: ${item.unitPrice.toFixed(2)}</span>
                            {item.specifications && <span>({item.specifications})</span>}
                          </div>
                        </div>
                      ))}
                      <div className="bg-gray-700/30 rounded px-3 py-2 flex items-center justify-between text-sm font-medium">
                        <span className="text-gray-300">Total</span>
                        <span className="text-primary-400">${subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No line items</p>
                  )}
                </div>

                {selectedPO.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-1">Notes</h3>
                    <p className="text-gray-400 text-sm">{selectedPO.notes}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500 space-y-1">
                  <p>Created: {new Date(selectedPO.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedPO.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
