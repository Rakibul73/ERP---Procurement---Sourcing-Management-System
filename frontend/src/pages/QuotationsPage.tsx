import { useState, useEffect } from 'react'

interface Quotation {
  id: number
  tenderId: number | null
  supplierId: number
  supplierName: string
  sourcingRequestId: number | null
  title: string
  status: string
  currency: string
  validityDate: string | null
  shippingTerms: string
  paymentTerms: string
  leadTimeDays: number | null
  notes: string
  createdAt: string
  updatedAt: string
}

interface QuotationLineItem {
  id: number
  quotationId: number
  productName: string
  specifications: string
  quantity: number
  unitPrice: number
  moq: number | null
  leadTimeDays: number | null
  notes: string
  createdAt: string
}

interface Tender {
  id: number
  title: string
  status: string
}

interface Supplier {
  id: number
  companyName: string
}

interface ComparisonRow {
  supplierName: string
  productName: string
  unitPrice: number
  quantity: number
  totalPrice: number
  moq: number | null
  leadTimeDays: number | null
  paymentTerms: string
  shippingTerms: string
  currency: string
  quotationId: number
  status: string
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-600',
  received: 'bg-blue-600',
  reviewed: 'bg-purple-600',
  accepted: 'bg-green-600',
  rejected: 'bg-red-600',
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['received'],
  received: ['reviewed'],
  reviewed: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
}

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [lineItems, setLineItems] = useState<QuotationLineItem[]>([])
  const [tenders, setTenders] = useState<Tender[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'list' | 'comparison'>('list')
  const [comparisonTenderId, setComparisonTenderId] = useState<number>(0)
  const [comparisonData, setComparisonData] = useState<ComparisonRow[]>([])

  const [formData, setFormData] = useState({
    tenderId: 0,
    supplierId: 0,
    title: '',
    currency: 'USD',
    validityDate: '',
    shippingTerms: '',
    paymentTerms: '',
    leadTimeDays: 0,
    notes: '',
  })
  const [formItems, setFormItems] = useState<Array<{
    productName: string
    specifications: string
    quantity: number
    unitPrice: number
    moq: number
    leadTimeDays: number
    notes: string
  }>>([])

  useEffect(() => {
    fetchQuotations()
    fetchTenders()
    fetchSuppliers()
  }, [statusFilter, search])

  const fetchQuotations = async () => {
    try {
      const data = await window.go.main.App.GetQuotations(statusFilter, search)
      setQuotations(data || [])
    } catch (error) {
      console.error('Failed to fetch quotations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTenders = async () => {
    try {
      const data = await window.go.main.App.GetTenders('all', '')
      setTenders(data || [])
    } catch (error) {
      console.error('Failed to fetch tenders:', error)
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

  const fetchQuotationDetails = async (id: number) => {
    try {
      const [quotData, itemsData] = await Promise.all([
        window.go.main.App.GetQuotation(id),
        window.go.main.App.GetQuotationLineItems(id),
      ])
      setSelectedQuotation(quotData)
      setLineItems(itemsData || [])
    } catch (error) {
      console.error('Failed to fetch quotation details:', error)
    }
  }

  const fetchComparison = async (tenderId: number) => {
    try {
      const data = await window.go.main.App.GetQuotationComparison(tenderId)
      setComparisonData(data || [])
    } catch (error) {
      console.error('Failed to fetch comparison:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const quotation = {
        ...formData,
        tenderId: formData.tenderId || null,
        supplierId: formData.supplierId,
        validityDate: formData.validityDate || null,
        leadTimeDays: formData.leadTimeDays || null,
      }
      await window.go.main.App.CreateQuotation(quotation, formItems)
      setShowForm(false)
      resetForm()
      fetchQuotations()
    } catch (error) {
      console.error('Failed to create quotation:', error)
    }
  }

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await window.go.main.App.UpdateQuotationStatus(id, newStatus)
      fetchQuotations()
      if (selectedQuotation?.id === id) {
        fetchQuotationDetails(id)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      tenderId: 0,
      supplierId: 0,
      title: '',
      currency: 'USD',
      validityDate: '',
      shippingTerms: '',
      paymentTerms: '',
      leadTimeDays: 0,
      notes: '',
    })
    setFormItems([])
  }

  const addItem = () => {
    setFormItems([
      ...formItems,
      { productName: '', specifications: '', quantity: 1, unitPrice: 0, moq: 0, leadTimeDays: 0, notes: '' },
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

  const subtotal = lineItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

  if (viewMode === 'comparison') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Quotation Comparison</h1>
            <p className="text-gray-400 mt-1">Compare supplier quotations side by side</p>
          </div>
          <button
            onClick={() => { setViewMode('list'); setComparisonData([]) }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            ← Back to List
          </button>
        </div>

        <div className="flex gap-4">
          <select
            value={comparisonTenderId}
            onChange={(e) => {
              const id = Number(e.target.value)
              setComparisonTenderId(id)
              if (id > 0) fetchComparison(id)
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
          >
            <option value={0}>Select Tender</option>
            {tenders.map((t) => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
        </div>

        {comparisonData.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-gray-400">
              {comparisonTenderId === 0
                ? 'Select a tender to compare quotations'
                : 'No quotations found for this tender'}
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-300 font-medium">Supplier</th>
                  <th className="text-left px-4 py-3 text-gray-300 font-medium">Product</th>
                  <th className="text-right px-4 py-3 text-gray-300 font-medium">Qty</th>
                  <th className="text-right px-4 py-3 text-gray-300 font-medium">Unit Price</th>
                  <th className="text-right px-4 py-3 text-gray-300 font-medium">Total</th>
                  <th className="text-right px-4 py-3 text-gray-300 font-medium">MOQ</th>
                  <th className="text-right px-4 py-3 text-gray-300 font-medium">Lead Time</th>
                  <th className="text-left px-4 py-3 text-gray-300 font-medium">Payment</th>
                  <th className="text-left px-4 py-3 text-gray-300 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {comparisonData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-700/30">
                    <td className="px-4 py-3 text-white font-medium">{row.supplierName}</td>
                    <td className="px-4 py-3 text-gray-300">{row.productName}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.quantity}</td>
                    <td className="px-4 py-3 text-right text-white">${row.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-white font-medium">${row.totalPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.moq ?? '-'}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{row.leadTimeDays ? `${row.leadTimeDays}d` : '-'}</td>
                    <td className="px-4 py-3 text-gray-300">{row.paymentTerms || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded ${STATUS_COLORS[row.status] || 'bg-gray-600'} text-white`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-700/30">
                <tr>
                  <td className="px-4 py-3 text-gray-300 font-medium" colSpan={4}>Totals by Supplier:</td>
                  <td className="px-4 py-3 text-right text-white font-bold" colSpan={5}></td>
                </tr>
                {Object.entries(
                  comparisonData.reduce((acc, row) => {
                    if (!acc[row.supplierName]) acc[row.supplierName] = 0
                    acc[row.supplierName] += row.totalPrice
                    return acc
                  }, {} as Record<string, number>)
                ).map(([supplier, total]) => (
                  <tr key={supplier} className="border-t border-gray-600">
                    <td className="px-4 py-2 text-white font-medium" colSpan={3}>{supplier}</td>
                    <td className="px-4 py-2 text-right text-gray-300" colSpan={2}>
                      <span className="text-primary-400 font-bold">${total.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-2" colSpan={5}></td>
                  </tr>
                ))}
              </tfoot>
            </table>
          </div>
        )}
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">New Quotation</h1>
          <button onClick={() => { setShowForm(false); resetForm() }} className="px-4 py-2 text-gray-400 hover:text-white">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Title *</label>
              <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary-500" required />
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Tender (optional)</label>
              <select value={formData.tenderId} onChange={(e) => setFormData({ ...formData, tenderId: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white">
                <option value={0}>None</option>
                {tenders.filter((t) => t.status === 'open' || t.status === 'evaluating').map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">Validity Date</label>
              <input type="date" value={formData.validityDate} onChange={(e) => setFormData({ ...formData, validityDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Lead Time (days)</label>
              <input type="number" value={formData.leadTimeDays} onChange={(e) => setFormData({ ...formData, leadTimeDays: Number(e.target.value) })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" min="0" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Payment Terms</label>
              <input type="text" value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. Net 30" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Shipping Terms</label>
              <input type="text" value={formData.shippingTerms} onChange={(e) => setFormData({ ...formData, shippingTerms: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" placeholder="e.g. FOB Shanghai" />
            </div>

            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  <div key={index} className="bg-gray-700/50 rounded-lg p-4 grid grid-cols-6 gap-3">
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
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">MOQ</label>
                      <input type="number" value={item.moq}
                        onChange={(e) => updateFormItem(index, 'moq', Number(e.target.value))}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm" min="0" />
                    </div>
                    <div className="flex items-end">
                      <button type="button" onClick={() => removeFormItem(index)}
                        className="px-2 py-1 text-red-400 hover:text-red-300 text-sm">Remove</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button type="submit"
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg">
              Create Quotation
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
          <h1 className="text-2xl font-bold text-white">Quotations</h1>
          <p className="text-gray-400 mt-1">Manage supplier quotations and compare pricing</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setViewMode('comparison')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg">
            📊 Compare
          </button>
          <button onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg">
            + New Quotation
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input type="text" placeholder="Search quotations..." value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="received">Received</option>
          <option value="reviewed">Reviewed</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Quotation List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <div className="text-4xl mb-2">💰</div>
          <p className="text-gray-400">No quotations found</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
            Add Your First Quotation
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Quotation Cards */}
          <div className="space-y-3">
            {quotations.map((quot) => (
              <div key={quot.id}
                onClick={() => fetchQuotationDetails(quot.id)}
                className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-colors ${
                  selectedQuotation?.id === quot.id
                    ? 'border-primary-500'
                    : 'border-gray-700 hover:border-gray-600'
                }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white">{quot.title || `Quotation #${quot.id}`}</h3>
                    <p className="text-sm text-gray-400 mt-1">{quot.supplierName}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${STATUS_COLORS[quot.status] || 'bg-gray-600'} text-white`}>
                    {quot.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>{quot.currency}</span>
                  {quot.validityDate && <span>Valid until: {new Date(quot.validityDate).toLocaleDateString()}</span>}
                  {quot.leadTimeDays && <span>Lead: {quot.leadTimeDays}d</span>}
                  {quot.tenderId && <span>Tender #{quot.tenderId}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Detail Panel */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            {!selectedQuotation ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <p>Select a quotation to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{selectedQuotation.title || `Quotation #${selectedQuotation.id}`}</h2>
                    <p className="text-gray-400 mt-1">{selectedQuotation.supplierName}</p>
                  </div>
                  <span className={`px-3 py-1 text-sm rounded ${STATUS_COLORS[selectedQuotation.status] || 'bg-gray-600'} text-white`}>
                    {selectedQuotation.status}
                  </span>
                </div>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2">
                  {(STATUS_TRANSITIONS[selectedQuotation.status] || []).map((status) => (
                    <button key={status}
                      onClick={() => handleStatusChange(selectedQuotation.id, status)}
                      className={`px-3 py-1 text-sm rounded ${
                        status === 'rejected' ? 'bg-red-600 hover:bg-red-700' : 'bg-primary-600 hover:bg-primary-700'
                      } text-white`}>
                      {status === 'accepted' ? '✓ Accept' : status === 'rejected' ? '✗ Reject' : `Move to ${status}`}
                    </button>
                  ))}
                </div>

                {/* Terms */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-gray-500">Currency:</span><span className="ml-2 text-white">{selectedQuotation.currency}</span></div>
                  {selectedQuotation.validityDate && (
                    <div><span className="text-gray-500">Valid until:</span><span className="ml-2 text-white">{new Date(selectedQuotation.validityDate).toLocaleDateString()}</span></div>
                  )}
                  {selectedQuotation.paymentTerms && (
                    <div><span className="text-gray-500">Payment:</span><span className="ml-2 text-white">{selectedQuotation.paymentTerms}</span></div>
                  )}
                  {selectedQuotation.shippingTerms && (
                    <div><span className="text-gray-500">Shipping:</span><span className="ml-2 text-white">{selectedQuotation.shippingTerms}</span></div>
                  )}
                  {selectedQuotation.leadTimeDays && (
                    <div><span className="text-gray-500">Lead Time:</span><span className="ml-2 text-white">{selectedQuotation.leadTimeDays} days</span></div>
                  )}
                  {selectedQuotation.tenderId && (
                    <div><span className="text-gray-500">Tender:</span><span className="ml-2 text-white">#{selectedQuotation.tenderId}</span></div>
                  )}
                </div>

                {/* Line Items */}
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Line Items ({lineItems.length})</h3>
                  {lineItems.length > 0 ? (
                    <div className="space-y-2">
                      {lineItems.map((item) => (
                        <div key={item.id} className="bg-gray-700/50 rounded px-3 py-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-white">{item.productName}</span>
                            <span className="text-white font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            <span>Qty: {item.quantity}</span>
                            <span>Unit: ${item.unitPrice.toFixed(2)}</span>
                            {item.moq && item.moq > 0 && <span>MOQ: {item.moq}</span>}
                            {item.leadTimeDays && item.leadTimeDays > 0 && <span>Lead: {item.leadTimeDays}d</span>}
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

                {/* Notes */}
                {selectedQuotation.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-300 mb-1">Notes</h3>
                    <p className="text-gray-400 text-sm">{selectedQuotation.notes}</p>
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Created: {new Date(selectedQuotation.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(selectedQuotation.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
