import { useAuth } from '../lib/auth'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'search', label: 'Search', icon: '🔍' },
  { id: 'suppliers', label: 'Suppliers', icon: '🏭' },
  { id: 'products', label: 'Products', icon: '📦' },
  { id: 'sourcing', label: 'Sourcing', icon: '🔍' },
  { id: 'tenders', label: 'Tenders / RFQs', icon: '📋' },
  { id: 'quotations', label: 'Quotations', icon: '💰' },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: '🛒' },
  { id: 'customers', label: 'Customers', icon: '👥' },
  { id: 'communications', label: 'Communications', icon: '✉️' },
  { id: 'documents', label: 'Documents', icon: '📄' },
  { id: 'import', label: 'CSV Import', icon: '📥' },
  { id: 'document-import', label: 'Document Import', icon: '📄' },
  { id: 'activity', label: 'Activity Log', icon: '📜' },
  { id: 'users', label: 'User Management', icon: '👤' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth()

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
            <span className="text-xl">📦</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">ERP</h1>
            <p className="text-xs text-gray-400">Procurement</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              currentPage === item.id
                ? 'bg-primary-600 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-gray-600 rounded-full flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {user?.fullName?.charAt(0) || user?.username?.charAt(0)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-400 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full px-3 py-2 text-sm text-gray-400 hover:bg-gray-700 hover:text-white rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </div>
  )
}
