import { useState } from 'react'
import { useAuth } from '../lib/auth'

export default function LoginPage() {
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await login(username, password)
      } else {
        await login(username, password)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <span className="text-3xl">📦</span>
          </div>
          <h1 className="text-3xl font-bold text-white">ERP System</h1>
          <p className="text-gray-400 mt-2">Procurement & Sourcing</p>
        </div>

        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <div className="flex mb-6 bg-gray-700 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                isLogin ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                !isLogin ? 'bg-primary-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Register
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your full name"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your username"
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required={!isLogin}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
            >
              {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-700">
            <p className="text-xs text-gray-500 mb-3 text-center">Quick Demo Login</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { username: 'admin', label: 'Admin', color: 'bg-red-500/10 hover:bg-red-500/20 text-red-300 border-red-500/30' },
                { username: 'sarah.chen', label: 'Procurement Mgr', color: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30' },
                { username: 'mike.jones', label: 'Buyer', color: 'bg-green-500/10 hover:bg-green-500/20 text-green-300 border-green-500/30' },
                { username: 'lisa.wong', label: 'Viewer', color: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border-purple-500/30' },
              ].map((u) => (
                <button
                  key={u.username}
                  type="button"
                  disabled={loading}
                  onClick={async () => {
                    setError('')
                    setLoading(true)
                    try {
                      await login(u.username, 'admin123')
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'An error occurred')
                    } finally {
                      setLoading(false)
                    }
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${u.color} disabled:opacity-50`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Procurement & Sourcing ERP v1.0.0
        </p>
      </div>
    </div>
  )
}
