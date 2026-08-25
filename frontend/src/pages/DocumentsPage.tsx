import { useState, useEffect } from 'react'

interface Document {
  id: number
  entityType: string
  entityId: number
  fileName: string
  filePath: string
  fileType: string
  description: string
  uploadedBy: number | null
  createdAt: string
}

const ENTITY_LABELS: Record<string, string> = {
  supplier: 'Supplier',
  product: 'Product',
  sourcing_request: 'Sourcing Request',
  tender: 'Tender',
  quotation: 'Quotation',
  purchase_order: 'Purchase Order',
  customer: 'Customer',
}

const FILE_ICONS: Record<string, string> = {
  pdf: '📄',
  csv: '📊',
  xlsx: '📊',
  xls: '📊',
  png: '🖼️',
  jpg: '🖼️',
  jpeg: '🖼️',
  txt: '📝',
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [filterEntity, setFilterEntity] = useState<string>('all')

  useEffect(() => { loadDocuments() }, [])

  async function loadDocuments() {
    try {
      const docs = await window.go.main.App.GetDocuments()
      setDocuments(docs || [])
    } catch (err) {
      console.error('Failed to load documents:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this document record?')) return
    try {
      await window.go.main.App.DeleteDocument(id)
      setDocuments(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const filtered = filterEntity === 'all'
    ? documents
    : documents.filter(d => d.entityType === filterEntity)

  const entityTypes = [...new Set(documents.map(d => d.entityType))].sort()

  function getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || ''
    return FILE_ICONS[ext] || '📄'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading documents...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Documents</h1>
          <p className="text-gray-400 mt-1">{documents.length} file(s) imported</p>
        </div>
      </div>

      {entityTypes.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilterEntity('all')}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              filterEntity === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:text-white'
            }`}
          >
            All ({documents.length})
          </button>
          {entityTypes.map(et => (
            <button
              key={et}
              onClick={() => setFilterEntity(et)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filterEntity === et
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {ENTITY_LABELS[et] || et} ({documents.filter(d => d.entityType === et).length})
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <span className="text-4xl">📄</span>
          <p className="text-gray-400 mt-3">No documents found</p>
          <p className="text-gray-500 text-sm mt-1">
            Import documents via the Document Import page
          </p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">File</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Entity</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Description</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase">Date</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getFileIcon(doc.fileName)}</span>
                      <div>
                        <p className="text-sm font-medium text-white">{doc.fileName}</p>
                        <p className="text-xs text-gray-400">{doc.fileType || 'unknown type'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">
                        {ENTITY_LABELS[doc.entityType] || doc.entityType}
                      </span>
                      <span className="text-xs text-gray-500">#{doc.entityId}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-300">
                    {doc.description || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
