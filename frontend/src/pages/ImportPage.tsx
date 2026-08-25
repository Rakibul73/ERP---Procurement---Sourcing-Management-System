import { useState, useEffect, useRef } from 'react'

interface ImportPreview {
  headers: string[]
  rows: string[][]
  totalRows: number
  targetType: string
  fileName: string
}

interface ColumnMapping {
  columnIndex: number
  columnName: string
  fieldName: string
}

interface ImportResult {
  importId: number
  totalRows: number
  importedRows: number
  skippedRows: number
  errorRows: number
  status: string
}

interface ImportJob {
  id: number
  fileName: string
  fileType: string
  entityType: string
  status: string
  totalRows: number
  successfulRows: number
  failedRows: number
  createdAt: string
  completedAt?: string
}

const SUPPLIER_FIELDS = [
  { value: '', label: '-- Skip --' },
  { value: 'companyName', label: 'Company Name *' },
  { value: 'country', label: 'Country' },
  { value: 'address', label: 'Address' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'supplierType', label: 'Supplier Type' },
  { value: 'notes', label: 'Notes' },
]

const PRODUCT_FIELDS = [
  { value: '', label: '-- Skip --' },
  { value: 'name', label: 'Product Name *' },
  { value: 'category', label: 'Category' },
  { value: 'specifications', label: 'Specifications' },
  { value: 'gradeType', label: 'Grade Type' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'countryOfOrigin', label: 'Country of Origin' },
  { value: 'notes', label: 'Notes' },
]

export default function ImportPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'result' | 'history'>('upload')
  const [targetType, setTargetType] = useState<'suppliers' | 'products'>('suppliers')
  const [preview, setPreview] = useState<ImportPreview | null>(null)
  const [mappings, setMappings] = useState<ColumnMapping[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [history, setHistory] = useState<ImportJob[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  const loadHistory = async () => {
    try {
      const data = await window.go.main.App.GetImportHistory(50)
      setHistory(data || [])
    } catch (err) {
      console.error('Failed to load import history:', err)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setError('')

    try {
      const reader = new FileReader()
      reader.onload = async (event) => {
        const data = event.target?.result as ArrayBuffer
        const uint8Array = new Uint8Array(data)
        const numberArray = Array.from(uint8Array)
        const previewData = await window.go.main.App.ParseFile(file.name, numberArray, targetType)
        setPreview(previewData)
        
        // Auto-map columns based on header names
        const autoMappings: ColumnMapping[] = previewData.headers.map((header: string, index: number) => {
          const fields = targetType === 'suppliers' ? SUPPLIER_FIELDS : PRODUCT_FIELDS
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '')
          
          const matchedField = fields.find(f => {
            const normalizedField = f.label.toLowerCase().replace(/[^a-z0-9]/g, '').replace('*', '')
            return normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader)
          })

          return {
            columnIndex: index,
            columnName: header,
            fieldName: matchedField?.value || '',
          }
        })
        setMappings(autoMappings)
        setStep('preview')
        setLoading(false)
      }
      reader.readAsArrayBuffer(file)
    } catch (err: any) {
      setError(err.message || 'Failed to parse file')
      setLoading(false)
    }
  }

  const handleMappingChange = (columnIndex: number, fieldName: string) => {
    setMappings(prev => prev.map(m => 
      m.columnIndex === columnIndex ? { ...m, fieldName } : m
    ))
  }

  const handleImport = async () => {
    if (!preview) return

    setLoading(true)
    setError('')

    try {
      const importResult = await window.go.main.App.ExecuteImport({
        fileName: preview.fileName,
        targetType: preview.targetType,
        mappings: mappings,
        rows: preview.rows,
      })
      setResult(importResult)
      setStep('result')
      loadHistory()
    } catch (err: any) {
      setError(err.message || 'Failed to import')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const template = await window.go.main.App.GetImportTemplate(targetType)
      const csvContent = template.headers.join(',') + '\n'
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = template.fileName
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download template:', err)
    }
  }

  const resetUpload = () => {
    setStep('upload')
    setPreview(null)
    setMappings([])
    setResult(null)
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Import Data</h1>
          <p className="text-gray-400 mt-1">Import suppliers or products from CSV/Excel files.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setStep('history')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            Import History
          </button>
          <button onClick={downloadTemplate} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            Download Template
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
          <div className="max-w-xl mx-auto text-center">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">Import Type</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as 'suppliers' | 'products')}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="suppliers">Suppliers</option>
                <option value="products">Products</option>
              </select>
            </div>

            <div className="border-2 border-dashed border-gray-600 rounded-xl p-12 hover:border-primary-500 transition-colors">
              <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-gray-400 mb-4">Drag and drop your file here, or click to browse</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
              >
                {loading ? 'Parsing...' : 'Select File'}
              </button>
              <p className="text-sm text-gray-500 mt-4">Supports CSV and Excel (.xlsx) files</p>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && preview && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-white">Preview: {preview.fileName}</h2>
              <p className="text-gray-400">{preview.totalRows} rows found, showing first {preview.rows.length}</p>
            </div>
            <button onClick={resetUpload} className="text-gray-400 hover:text-white">← Back</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  {preview.headers.map((header, i) => (
                    <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-400">
                      <div>{header}</div>
                      <select
                        value={mappings[i]?.fieldName || ''}
                        onChange={(e) => handleMappingChange(i, e.target.value)}
                        className="mt-1 w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs"
                      >
                        {(targetType === 'suppliers' ? SUPPLIER_FIELDS : PRODUCT_FIELDS).map(f => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {preview.rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-750">
                    {row.map((cell, j) => (
                      <td key={j} className="px-4 py-3 text-gray-300">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.totalRows > 10 && (
            <p className="text-gray-400 text-sm mt-4">... and {preview.totalRows - 10} more rows</p>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={resetUpload} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
              Cancel
            </button>
            <button
              onClick={() => setStep('mapping')}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg"
            >
              Configure Mappings →
            </button>
          </div>
        </div>
      )}

      {step === 'mapping' && preview && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Column Mappings</h2>
          <p className="text-gray-400 mb-6">Map each CSV column to the corresponding database field.</p>

          <div className="space-y-4">
            {preview.headers.map((header, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-1/3 text-gray-300">{header}</div>
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <select
                  value={mappings[i]?.fieldName || ''}
                  onChange={(e) => handleMappingChange(i, e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500"
                >
                  {(targetType === 'suppliers' ? SUPPLIER_FIELDS : PRODUCT_FIELDS).map(f => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setStep('preview')} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
              ← Back
            </button>
            <button
              onClick={handleImport}
              disabled={loading}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? 'Importing...' : `Import ${preview.totalRows} Rows`}
            </button>
          </div>
        </div>
      )}

      {step === 'result' && result && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Import Complete</h2>
          
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{result.totalRows}</div>
              <div className="text-sm text-gray-400">Total Rows</div>
            </div>
            <div className="bg-green-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{result.importedRows}</div>
              <div className="text-sm text-gray-400">Imported</div>
            </div>
            <div className="bg-yellow-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400">{result.skippedRows}</div>
              <div className="text-sm text-gray-400">Skipped</div>
            </div>
            <div className="bg-red-900/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{result.errorRows}</div>
              <div className="text-sm text-gray-400">Errors</div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={resetUpload} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
              Import Another File
            </button>
            <button onClick={() => setStep('history')} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
              View History
            </button>
          </div>
        </div>
      )}

      {step === 'history' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Import History</h2>
            <button onClick={resetUpload} className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg">
              New Import
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">File</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Results</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {history.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No import history</td></tr>
              ) : (
                history.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{job.fileName}</div>
                      <div className="text-sm text-gray-400 uppercase">{job.fileType}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300 capitalize">{job.entityType}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                        job.status === 'completed_with_errors' ? 'bg-yellow-900/50 text-yellow-400' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      <span className="text-green-400">{job.successfulRows}</span> /{' '}
                      <span className="text-red-400">{job.failedRows}</span> /{' '}
                      <span>{job.totalRows}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(job.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
