import { useState, useEffect } from 'react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [form, setForm] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    website: '',
  })

  useEffect(() => {
    loadOrganization()
  }, [])

  const loadOrganization = async () => {
    try {
      const data = await window.go.main.App.GetOrganization()
      if (data) {
        setForm({
          name: data.name || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
        })
      }
    } catch (err) {
      console.error('Failed to load organization:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await window.go.main.App.SaveOrganization(
        form.name,
        form.address,
        form.phone,
        form.email,
        form.website
      )
      alert('Organization profile saved!')
    } catch (err) {
      console.error('Failed to save organization:', err)
      alert('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSeedData = async () => {
    setDeleting(true)
    try {
      await window.go.main.App.DeleteSeedData()
      setShowConfirm(false)
      alert('All demo data deleted. Users and organization preserved.')
    } catch (err) {
      console.error('Failed to delete seed data:', err)
      alert('Failed to delete seed data')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your organization profile and system settings.</p>
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">Organization Profile</h2>
        
        {loading ? (
          <div className="text-gray-400">Loading...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter company address"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
              <input
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="https://example.com"
              />
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 max-w-2xl">
        <h2 className="text-lg font-semibold text-white mb-4">System Information</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Version</span>
            <span className="text-white">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Database</span>
            <span className="text-white">SQLite</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Backend</span>
            <span className="text-white">Go + Wails v2</span>
          </div>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="bg-gray-800 rounded-xl p-6 border-2 border-red-600/50 max-w-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-600/20 rounded-lg flex items-center justify-center">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
            <p className="text-sm text-gray-400">Irreversible actions. Proceed with caution.</p>
          </div>
        </div>

        <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-red-300 mb-2">Delete All Demo Data</h3>
          <p className="text-sm text-gray-400 mb-4">
            This will permanently delete all suppliers, products, sourcing requests, tenders,
            quotations, purchase orders, customers, communications, and activity logs.
            User accounts and organization settings will be preserved.
          </p>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
            >
              Delete All Demo Data
            </button>
          ) : (
            <div className="space-y-3">
              <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
                <p className="text-sm text-red-300 font-medium">
                  Are you absolutely sure? This action cannot be undone.
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  All transactional data will be permanently removed from the database.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteSeedData}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Everything'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={deleting}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
