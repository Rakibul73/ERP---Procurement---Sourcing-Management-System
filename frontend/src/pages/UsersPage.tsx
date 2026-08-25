import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'

interface User {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  active: boolean
  createdAt: string
  updatedAt: string
}

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  // Form states
  const [addForm, setAddForm] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'buyer',
  })

  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    role: 'buyer',
    active: true,
  })

  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await window.go.main.App.GetUsers()
      setUsers(data || [])
    } catch (err: any) {
      console.error('Failed to load users:', err)
      setError(err?.message || 'Failed to load user accounts')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdd = () => {
    setAddForm({
      username: '',
      email: '',
      fullName: '',
      password: '',
      role: 'buyer',
    })
    setModalError(null)
    setShowAddModal(true)
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addForm.username || !addForm.email || !addForm.password || !addForm.fullName) {
      setModalError('Please fill in all required fields.')
      return
    }
    setSubmitting(true)
    setModalError(null)
    try {
      if (window.go?.main?.App?.CreateUser) {
        await window.go.main.App.CreateUser(addForm)
      } else {
        await window.go.main.App.Register({
          username: addForm.username,
          email: addForm.email,
          password: addForm.password,
          fullName: addForm.fullName,
        })
      }
      setShowAddModal(false)
      setSuccess(`User ${addForm.username} created successfully!`)
      loadUsers()
    } catch (err: any) {
      console.error('Failed to create user:', err)
      setModalError(err?.message || 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEdit = (user: User) => {
    setEditingUser(user)
    setEditForm({
      fullName: user.fullName || '',
      email: user.email || '',
      role: user.role || 'viewer',
      active: user.active ?? true,
    })
    setModalError(null)
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    if (!editForm.fullName || !editForm.email) {
      setModalError('Full Name and Email are required.')
      return
    }
    setSubmitting(true)
    setModalError(null)
    try {
      await window.go.main.App.UpdateUser(
        editingUser.id,
        editForm.fullName,
        editForm.email,
        editForm.role,
        editForm.active
      )
      setEditingUser(null)
      setSuccess(`User ${editingUser.username} updated successfully!`)
      loadUsers()
    } catch (err: any) {
      console.error('Failed to update user:', err)
      setModalError(err?.message || 'Failed to update user')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      await window.go.main.App.UpdateUser(
        user.id,
        user.fullName,
        user.email,
        user.role,
        !user.active
      )
      setSuccess(`User ${user.username} is now ${!user.active ? 'Active' : 'Inactive'}.`)
      loadUsers()
    } catch (err: any) {
      console.error('Failed to toggle active status:', err)
      setError(err?.message || 'Failed to update user status')
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return
    setSubmitting(true)
    try {
      await window.go.main.App.DeleteUser(deletingUser.id)
      setDeletingUser(null)
      setSuccess(`User ${deletingUser.username} deleted successfully!`)
      loadUsers()
    } catch (err: any) {
      console.error('Failed to delete user:', err)
      setError(err?.message || 'Failed to delete user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray-400 mt-1">Manage system accounts, assign roles, and control access permissions.</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-primary-600/20"
        >
          <span>➕</span>
          <span>Add User</span>
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="bg-emerald-900/40 border border-emerald-500/50 rounded-xl p-4 flex items-center justify-between text-emerald-200 text-sm">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-400 hover:text-white text-xs uppercase font-bold">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-900/40 border border-red-500/50 rounded-xl p-4 flex items-center justify-between text-red-200 text-sm">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white text-xs uppercase font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-850">
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/60">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500"></div>
                    <span>Loading system users...</span>
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                  No users found in the system.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = currentUser?.id === u.id
                return (
                  <tr key={u.id} className="hover:bg-gray-750/70 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-900/60 border border-primary-500/30 rounded-full flex items-center justify-center font-bold text-primary-300">
                          {u.fullName?.charAt(0) || u.username.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            <span>{u.fullName || u.username}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-primary-500/20 text-primary-400 px-1.5 py-0.5 rounded font-normal">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize border ${
                        u.role === 'admin'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : u.role === 'procurement_manager'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : u.role === 'buyer'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : 'bg-gray-700/50 text-gray-300 border-gray-600/30'
                      }`}>
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(u)}
                        title="Click to toggle active status"
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full border transition-all ${
                          u.active
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                            : 'bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25'
                        }`}
                      >
                        {u.active ? '● Active' : '○ Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-650 text-primary-300 hover:text-white rounded-lg text-xs font-medium transition-colors border border-gray-600"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => setDeletingUser(u)}
                        disabled={isSelf}
                        title={isSelf ? 'Cannot delete your own account' : 'Delete user'}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                          isSelf
                            ? 'bg-gray-800 text-gray-600 border-gray-750 cursor-not-allowed'
                            : 'bg-red-900/30 hover:bg-red-800/40 text-red-400 hover:text-red-300 border-red-500/30'
                        }`}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h2 className="text-lg font-bold text-white">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            {modalError && (
              <div className="bg-red-900/40 border border-red-500/50 rounded-lg p-3 text-xs text-red-200">
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  placeholder="e.g. john.doe"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={addForm.fullName}
                  onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="john@company.com"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Role *</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="procurement_manager">Procurement Manager</option>
                  <option value="buyer">Buyer</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
              <h2 className="text-lg font-bold text-white">Edit User: {editingUser.username}</h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white text-lg">
                ✕
              </button>
            </div>

            {modalError && (
              <div className="bg-red-900/40 border border-red-500/50 rounded-lg p-3 text-xs text-red-200">
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Role *</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary-500"
                >
                  <option value="admin">Administrator (Full Access)</option>
                  <option value="procurement_manager">Procurement Manager</option>
                  <option value="buyer">Buyer</option>
                  <option value="viewer">Viewer (Read Only)</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user-active"
                  checked={editForm.active}
                  onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
                  className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="user-active" className="text-sm font-medium text-white cursor-pointer">
                  Account Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-700">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-bold text-white">Confirm Delete User</h2>
            </div>
            <p className="text-sm text-gray-300">
              Are you sure you want to permanently delete account{' '}
              <strong className="text-white font-semibold">{deletingUser.fullName || deletingUser.username}</strong> ({deletingUser.email})?
            </p>
            <p className="text-xs text-gray-400 bg-red-950/30 p-2.5 rounded-lg border border-red-900/50">
              This action cannot be undone. All user permissions and session data for this user will be removed.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-700">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {submitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
