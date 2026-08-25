import { useState } from 'react'

interface SearchResult {
  entityType: string
  entityId: number
  title: string
  subtitle: string
  path: string
}

const ENTITY_ICONS: Record<string, string> = {
  supplier: '🏭',
  product: '📦',
  customer: '👥',
  sourcing_request: '🔍',
  tender: '📋',
  quotation: '💰',
  purchase_order: '🛒',
}

const ENTITY_LABELS: Record<string, string> = {
  supplier: 'Supplier',
  product: 'Product',
  customer: 'Customer',
  sourcing_request: 'Sourcing Request',
  tender: 'Tender/RFQ',
  quotation: 'Quotation',
  purchase_order: 'Purchase Order',
}

interface SearchPageProps {
  onNavigate?: (page: string) => void
}

const ROUTE_MAP: Record<string, string> = {
  supplier: 'suppliers',
  product: 'products',
  customer: 'customers',
  sourcing_request: 'sourcing',
  tender: 'tenders',
  quotation: 'quotations',
  purchase_order: 'purchase-orders',
}

export default function SearchPage({ onNavigate }: SearchPageProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return
    setSearching(true)
    setHasSearched(true)
    try {
      const data = await window.go.main.App.GlobalSearch(query.trim())
      setResults(data || [])
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleItemClick = (entityType: string) => {
    const route = ROUTE_MAP[entityType]
    if (route && onNavigate) {
      onNavigate(route)
    }
  }

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.entityType]) acc[r.entityType] = []
    acc[r.entityType].push(r)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Global Search</h1>
        <p className="text-gray-400 mt-1">Search across all entities in the system</p>
      </div>

      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search suppliers, products, customers, orders, tenders..."
            className="w-full bg-gray-800 text-white px-4 py-3 pl-10 rounded-lg border border-gray-700 focus:border-primary-500 focus:outline-none text-lg"
          />
          <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !query.trim()}
          className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-lg font-medium"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Results */}
      {searching && (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        </div>
      )}

      {!searching && hasSearched && results.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">No results found for "{query}"</p>
          <p className="text-sm mt-1">Try different keywords or check your spelling</p>
        </div>
      )}

      {!searching && results.length > 0 && (
        <div className="space-y-6">
          <p className="text-sm text-gray-400">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
          
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <div className="px-4 py-3 bg-gray-750 border-b border-gray-700 flex items-center gap-2">
                <span>{ENTITY_ICONS[type] || '📄'}</span>
                <span className="font-medium text-white">{ENTITY_LABELS[type] || type}</span>
                <span className="text-sm text-gray-400">({items.length})</span>
              </div>
              <div className="divide-y divide-gray-700">
                {items.map((item) => (
                  <div
                    key={`${item.entityType}-${item.entityId}`}
                    onClick={() => handleItemClick(item.entityType)}
                    className="px-4 py-3 hover:bg-gray-750 cursor-pointer flex items-center gap-3 transition-colors"
                  >
                    <span className="text-lg">{ENTITY_ICONS[item.entityType] || '📄'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{item.title}</p>
                      {item.subtitle && <p className="text-sm text-gray-400 truncate">{item.subtitle}</p>}
                    </div>
                    <span className="text-xs text-gray-500 font-mono">#{item.entityId} →</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!hasSearched && (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">🔍</p>
          <p className="text-lg">Enter a search term to find suppliers, products, customers, orders, and more</p>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {['supplier', 'product', 'customer', 'tender', 'quotation', 'order'].map((term) => (
              <button
                key={term}
                onClick={() => { setQuery(term); }}
                className="px-3 py-1 bg-gray-800 rounded-full text-sm text-gray-400 hover:text-white hover:bg-gray-700"
              >
                Try "{term}"
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
