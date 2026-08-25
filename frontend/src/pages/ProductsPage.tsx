import { useState, useEffect } from 'react'

interface Product {
  id: number
  name: string
  category: string
  specifications: string
  gradeType: string
  manufacturer: string
  countryOfOrigin: string
  notes: string
  createdAt: string
  updatedAt: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({
    name: '',
    category: '',
    specifications: '',
    gradeType: '',
    manufacturer: '',
    countryOfOrigin: '',
    notes: '',
  })

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const data = await window.go.main.App.GetProducts(search)
      setProducts(data || [])
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    setLoading(true)
    await loadProducts()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await window.go.main.App.UpdateProduct(editingId, form)
      } else {
        await window.go.main.App.CreateProduct(form)
      }
      setShowForm(false)
      setEditingId(null)
      resetForm()
      loadProducts()
    } catch (err) {
      console.error('Failed to save product:', err)
    }
  }

  const handleEdit = (product: Product) => {
    setForm({
      name: product.name,
      category: product.category,
      specifications: product.specifications,
      gradeType: product.gradeType,
      manufacturer: product.manufacturer,
      countryOfOrigin: product.countryOfOrigin,
      notes: product.notes,
    })
    setEditingId(product.id)
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      try {
        await window.go.main.App.DeleteProduct(id)
        loadProducts()
      } catch (err) {
        console.error('Failed to delete product:', err)
      }
    }
  }

  const resetForm = () => {
    setForm({
      name: '',
      category: '',
      specifications: '',
      gradeType: '',
      manufacturer: '',
      countryOfOrigin: '',
      notes: '',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Products</h1>
          <p className="text-gray-400 mt-1">Manage your product catalog.</p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingId(null); setShowForm(true) }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          Add Product
        </button>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search products..."
          className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button onClick={handleSearch} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">Search</button>
      </div>

      {showForm && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">{editingId ? 'Edit Product' : 'Add Product'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Product Name *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
                <input type="text" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Grade Type</label>
                <input type="text" value={form.gradeType} onChange={(e) => setForm({ ...form, gradeType: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Manufacturer</label>
                <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Specifications</label>
              <textarea value={form.specifications} onChange={(e) => setForm({ ...form, specifications: e.target.value })}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Country of Origin</label>
                <input type="text" value={form.countryOfOrigin} onChange={(e) => setForm({ ...form, countryOfOrigin: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500" />
              </div>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Manufacturer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Origin</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {loading ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No products found</td></tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="hover:bg-gray-750">
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{p.name}</div>
                    <div className="text-sm text-gray-400">{p.gradeType}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300">{p.category}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{p.manufacturer}</td>
                  <td className="px-6 py-4 text-sm text-gray-300">{p.countryOfOrigin}</td>
                  <td className="px-6 py-4 text-sm">
                    <button onClick={() => handleEdit(p)} className="text-primary-400 hover:text-primary-300 mr-3">Edit</button>
                    <button onClick={() => handleDelete(p.id)} className="text-red-400 hover:text-red-300">Delete</button>
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
