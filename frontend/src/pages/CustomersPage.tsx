import { useState, useEffect } from 'react'

interface Customer {
  id: number
  companyName: string
  address: string
  phone: string
  email: string
  website: string
  notes: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface CustomerContact {
  id: number
  customerId: number
  fullName: string
  email: string
  phone: string
  position: string
  isPrimary: boolean
  createdAt: string
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [contacts, setContacts] = useState<CustomerContact[]>([])
  const [search, setSearch] = useState('')
  const [showContactForm, setShowContactForm] = useState(false)

  const [formData, setFormData] = useState({
    companyName: '', address: '', phone: '', email: '', website: '', notes: '',
  })
  const [contactData, setContactData] = useState({
    fullName: '', email: '', phone: '', position: '', isPrimary: false,
  })

  useEffect(() => {
    fetchCustomers()
  }, [search])

  const fetchCustomers = async () => {
    try {
      const data = await window.go.main.App.GetCustomers(search)
      setCustomers(data || [])
    } catch (error) {
      console.error('Failed to fetch customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerDetails = async (id: number) => {
    try {
      const [custData, contactData] = await Promise.all([
        window.go.main.App.GetCustomer(id),
        window.go.main.App.GetCustomerContacts(id),
      ])
      setSelectedCustomer(custData)
      setContacts(contactData || [])
    } catch (error) {
      console.error('Failed to fetch customer details:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await window.go.main.App.CreateCustomer(formData)
      setShowForm(false)
      setFormData({ companyName: '', address: '', phone: '', email: '', website: '', notes: '' })
      fetchCustomers()
    } catch (error) {
      console.error('Failed to create customer:', error)
    }
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCustomer) return
    try {
      await window.go.main.App.CreateCustomerContact({ ...contactData, customerId: selectedCustomer.id })
      setShowContactForm(false)
      setContactData({ fullName: '', email: '', phone: '', position: '', isPrimary: false })
      fetchCustomerDetails(selectedCustomer.id)
    } catch (error) {
      console.error('Failed to create contact:', error)
    }
  }

  const handleDeleteContact = async (id: number) => {
    if (!confirm('Delete this contact?')) return
    try {
      await window.go.main.App.DeleteCustomerContact(id)
      if (selectedCustomer) fetchCustomerDetails(selectedCustomer.id)
    } catch (error) {
      console.error('Failed to delete contact:', error)
    }
  }

  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">New Customer</h1>
          <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6 border border-gray-700 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Company Name *</label>
              <input type="text" value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" required />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Address</label>
              <input type="text" value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
              <input type="text" value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <input type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
              <input type="text" value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-2">Notes</label>
              <textarea value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white" rows={2} />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="submit" className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg">
              Create Customer
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
          <h1 className="text-2xl font-bold text-white">Customers</h1>
          <p className="text-gray-400 mt-1">Manage customer profiles and contacts</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg">
          + New Customer
        </button>
      </div>

      <input type="text" placeholder="Search customers..." value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-primary-500" />

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
          <div className="text-4xl mb-2">👥</div>
          <p className="text-gray-400">No customers found</p>
          <button onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
            Add Your First Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            {customers.map((c) => (
              <div key={c.id}
                onClick={() => fetchCustomerDetails(c.id)}
                className={`bg-gray-800 rounded-xl p-4 border cursor-pointer transition-colors ${
                  selectedCustomer?.id === c.id ? 'border-primary-500' : 'border-gray-700 hover:border-gray-600'
                }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{c.companyName}</h3>
                    <p className="text-sm text-gray-400 mt-1">{c.email || c.phone || 'No contact info'}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${c.active ? 'bg-green-600' : 'bg-gray-600'} text-white`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            {!selectedCustomer ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">👈</div>
                <p>Select a customer to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedCustomer.companyName}</h2>
                  {selectedCustomer.address && <p className="text-gray-400 mt-1">{selectedCustomer.address}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {selectedCustomer.phone && (
                    <div><span className="text-gray-500">Phone:</span><span className="ml-2 text-white">{selectedCustomer.phone}</span></div>
                  )}
                  {selectedCustomer.email && (
                    <div><span className="text-gray-500">Email:</span><span className="ml-2 text-white">{selectedCustomer.email}</span></div>
                  )}
                  {selectedCustomer.website && (
                    <div><span className="text-gray-500">Website:</span><span className="ml-2 text-white">{selectedCustomer.website}</span></div>
                  )}
                </div>

                {selectedCustomer.notes && (
                  <div><span className="text-gray-500 text-sm">Notes:</span><p className="text-white text-sm mt-1">{selectedCustomer.notes}</p></div>
                )}

                {/* Contacts */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-300">Contacts ({contacts.length})</h3>
                    <button onClick={() => setShowContactForm(true)}
                      className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg">
                      + Add
                    </button>
                  </div>

                  {showContactForm && (
                    <form onSubmit={handleContactSubmit} className="bg-gray-700/50 rounded-lg p-3 mb-3 space-y-2">
                      <input type="text" placeholder="Full Name *" value={contactData.fullName}
                        onChange={(e) => setContactData({ ...contactData, fullName: e.target.value })}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm" required />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="email" placeholder="Email" value={contactData.email}
                          onChange={(e) => setContactData({ ...contactData, email: e.target.value })}
                          className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm" />
                        <input type="text" placeholder="Phone" value={contactData.phone}
                          onChange={(e) => setContactData({ ...contactData, phone: e.target.value })}
                          className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm" />
                      </div>
                      <input type="text" placeholder="Position" value={contactData.position}
                        onChange={(e) => setContactData({ ...contactData, position: e.target.value })}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm" />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                          <input type="checkbox" checked={contactData.isPrimary}
                            onChange={(e) => setContactData({ ...contactData, isPrimary: e.target.checked })}
                            className="rounded" />
                          Primary contact
                        </label>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setShowContactForm(false)}
                            className="px-2 py-1 text-gray-400 hover:text-white text-sm">Cancel</button>
                          <button type="submit" className="px-3 py-1 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded">Save</button>
                        </div>
                      </div>
                    </form>
                  )}

                  {contacts.length > 0 ? (
                    <div className="space-y-2">
                      {contacts.map((cc) => (
                        <div key={cc.id} className="bg-gray-700/50 rounded px-3 py-2 flex items-center justify-between text-sm">
                          <div>
                            <span className="text-white">{cc.fullName}</span>
                            {cc.isPrimary && <span className="ml-2 px-1.5 py-0.5 bg-primary-600 text-xs rounded text-white">Primary</span>}
                            {cc.position && <span className="ml-2 text-gray-400">- {cc.position}</span>}
                            <div className="text-xs text-gray-500 mt-0.5">
                              {cc.email && <span>{cc.email}</span>}
                              {cc.email && cc.phone && <span> | </span>}
                              {cc.phone && <span>{cc.phone}</span>}
                            </div>
                          </div>
                          <button onClick={() => handleDeleteContact(cc.id)}
                            className="text-red-400 hover:text-red-300 text-xs">Delete</button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No contacts yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
