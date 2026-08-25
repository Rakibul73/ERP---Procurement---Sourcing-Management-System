import { AuthProvider, useAuth } from './lib/auth'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import SuppliersPage from './pages/SuppliersPage'
import ProductsPage from './pages/ProductsPage'
import ImportPage from './pages/ImportPage'
import DocumentImportPage from './pages/DocumentImportPage'
import SourcingPage from './pages/SourcingPage'
import TendersPage from './pages/TendersPage'
import QuotationsPage from './pages/QuotationsPage'
import PurchaseOrdersPage from './pages/PurchaseOrdersPage'
import CustomersPage from './pages/CustomersPage'
import CommunicationsPage from './pages/CommunicationsPage'
import DocumentsPage from './pages/DocumentsPage'
import SearchPage from './pages/SearchPage'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import ActivityLogPage from './pages/ActivityLogPage'
import Sidebar from './components/Sidebar'
import { useState } from 'react'

function AppContent() {
  const { user, isLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'suppliers':
        return <SuppliersPage />
      case 'products':
        return <ProductsPage />
      case 'import':
        return <ImportPage />
      case 'document-import':
        return <DocumentImportPage />
      case 'sourcing':
        return <SourcingPage />
      case 'tenders':
        return <TendersPage />
      case 'quotations':
        return <QuotationsPage />
      case 'purchase-orders':
        return <PurchaseOrdersPage />
      case 'customers':
        return <CustomersPage />
      case 'communications':
        return <CommunicationsPage />
      case 'documents':
        return <DocumentsPage />
      case 'search':
        return <SearchPage />
      case 'users':
        return <UsersPage />
      case 'settings':
        return <SettingsPage />
      case 'activity':
        return <ActivityLogPage />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="h-screen bg-gray-900 flex overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6">
          {renderPage()}
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
