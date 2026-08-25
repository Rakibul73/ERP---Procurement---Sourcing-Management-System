import { useState, useEffect } from 'react'

interface Supplier {
  id: number
  companyName: string
  country: string
  address: string
  website: string
  email: string
  phone: string
  supplierType: string
  notes: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    companyName: '',
    country: '',
    address: '',
    website: '',
    email: '',
    phone: '',
    supplierType: '',
    notes: '',
  })

  useEffect(() => {
    loadSuppliers()
  }, [])

  const loadSuppliers = async () => {
    try {
      const data = await window.go.main.App.GetSuppliers(search)
      setSuppliers(data || [])
    } catch (err) {
      console.error('Failed to load suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    await loadSuppliers()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await window.go.main.App.UpdateSupplier(editingId, form)
      } else {
        await window.go.main.App.CreateSupplier(form)
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadSuppliers()
    } catch (err) {
      console.error('Failed to save supplier:', err)
    }
  }

  const handleEdit = (supplier: Supplier) => {
    setForm({
      companyName: supplier.companyName,
      country: supplier.country,
      address: supplier.address,
      website: supplier.website,
      email: supplier.email,
      phone: supplier.phone,
      supplierType: supplier.supplierType,
      notes: supplier.notes,
    })
    setEditingId(supplier.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      try {
        await window.go.main.App.DeleteSupplier(id)
        loadSuppliers()
      } catch (err) {
        console.error('Failed to delete supplier:', err)
      }
    }
  }

  const resetForm = () => {
    setForm({
      companyName: '',
      country: '',
      address: '',
      website: '',
      email: '',
      phone: '',
      supplierType: '',
      notes: '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Suppliers</h1>
          <p className="text-gray-400 mt-1">Manage your supplier database.</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setShowForm(true) }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          Add Supplier
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search suppliers..."
          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button onClick={handleSearch} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Search</button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">{editingId ? 'Edit Supplier' : 'Add Supplier'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Company Name *</label>
                <input type="text" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Country</label>
                <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
              <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
                <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Supplier Type</label>
                <select value={form.supplierType} onChange={(e) => setForm({ ...form, supplierType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500">
                  <option value="">Select type</option>
                  <option value="manufacturer">Manufacturer</option>
                  <option value="distributor">Distributor</option>
                  <option value="trader">Trader</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" rows={3} />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); setEditingId(null) }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Company</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Country</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Contact</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No suppliers found</td></tr>
            ) : (
              suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{s.companyName}</div>
                    <div className="text-sm text-gray-400">{s.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{s.country}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{s.phone}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded-full capitalize">{s.supplierType || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button onClick={() => handleEdit(s)} className="text-primary-400 hover:text-primary-300 mr-3">Edit</button>
                    <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
