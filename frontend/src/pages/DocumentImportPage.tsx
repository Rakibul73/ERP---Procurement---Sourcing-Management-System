import { useState, useRef } from 'react'
import { useAuth } from '../lib/auth'

interface ExtractedData {
  type: string
  confidence: number
  data: Record<string, any>
  rawText?: string
  extractedAt?: string
}

interface ExtractionResult {
  success: boolean
  data?: ExtractedData
  error?: string
  provider: string
  model: string
}

export default function DocumentImportPage() {
  const { token } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ExtractionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [targetType, setTargetType] = useState<'supplier' | 'product'>('supplier')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return

    // Validate file type
    if (!selected.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG)')
      return
    }

    if (selected.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setFile(selected)
    setError(null)
    setResult(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setPreview(event.target?.result as string)
    }
    reader.readAsDataURL(selected)
  }

  const handleExtract = async () => {
    if (!file) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      // Convert file to base64
      const reader = new FileReader()
      reader.onload = async (event) => {
        const data = event.target?.result as ArrayBuffer
        const uint8Array = new Uint8Array(data)
        
        const response = await fetch('/api/extract', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileName: file.name,
            fileData: Array.from(uint8Array),
            fileType: file.type,
          }),
        })

        if (!response.ok) {
          throw new Error('Extraction failed')
        }

        const extractionResult: ExtractionResult = await response.json()
        setResult(extractionResult)
        setLoading(false)
      }
      reader.readAsArrayBuffer(file)
    } catch (err: any) {
      setError(err.message || 'Extraction failed')
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!result?.data) return

    setLoading(true)
    try {
      const response = await fetch('/api/extract/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: result.data.type,
          data: result.data.data,
        }),
      })

      if (!response.ok) {
        throw new Error('Save failed')
      }

      const saveResult = await response.json()
      alert(`${result.data.type.charAt(0).toUpperCase() + result.data.type.slice(1)} created successfully! ID: ${saveResult.id}`)
      
      // Reset form
      setFile(null)
      setPreview(null)
      setResult(null)
    } catch (err: any) {
      setError(err.message || 'Save failed')
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && droppedFile.type.startsWith('image/')) {
      setFile(droppedFile)
      setError(null)
      setResult(null)

      const reader = new FileReader()
      reader.onload = (event) => {
        setPreview(event.target?.result as string)
      }
      reader.readAsDataURL(droppedFile)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Document Import</h1>
          <p className="text-gray-400 mt-1">Upload images to extract data using AI vision</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Upload Document</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Extract as
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as 'supplier' | 'product')}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="supplier">Supplier</option>
              <option value="product">Product</option>
            </select>
          </div>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-gray-600 rounded-xl p-8 text-center hover:border-primary-500 transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {preview ? (
              <div className="space-y-4">
                <img
                  src={preview}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg"
                />
                <p className="text-gray-400 text-sm">{file?.name}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setPreview(null)
                    setResult(null)
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl">📄</div>
                <p className="text-gray-300">
                  Drop an image here or click to browse
                </p>
                <p className="text-gray-500 text-sm">
                  Supports JPEG, PNG (max 10MB)
                </p>
              </div>
            )}
          </div>

          <button
            onClick={handleExtract}
            disabled={!file || loading}
            className="w-full mt-4 px-4 py-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Extracting...
              </span>
            ) : (
              'Extract Data with AI'
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Extracted Data</h2>
          
          {!result ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>Upload an image and click "Extract Data" to see results</p>
            </div>
          ) : !result.success ? (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-4">
              <p className="text-red-300">{result.error}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>Provider: {result.provider}</span>
                <span>•</span>
                <span>Model: {result.model}</span>
                <span>•</span>
                <span>Confidence: {(result.data!.confidence * 100).toFixed(0)}%</span>
              </div>

              <div className="bg-gray-700/50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-300 mb-2">
                  Detected Type: <span className="text-primary-400">{result.data!.type}</span>
                </h3>
                
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.data!.data).map(([key, value]) => (
                    value !== null && value !== undefined && value !== '' && (
                      <div key={key} className="bg-gray-600/50 rounded px-3 py-2">
                        <div className="text-xs text-gray-400">{key}</div>
                        <div className="text-sm text-white">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {result.data!.rawText && (
                <details className="bg-gray-700/50 rounded-lg">
                  <summary className="px-4 py-2 cursor-pointer text-sm text-gray-300">
                    View Raw Extracted Text
                  </summary>
                  <pre className="px-4 pb-4 text-xs text-gray-400 overflow-auto max-h-40">
                    {result.data!.rawText}
                  </pre>
                </details>
              )}

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save to Database'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-2xl mb-2">1️⃣</div>
            <h3 className="font-medium text-white">Upload</h3>
            <p className="text-gray-400">
              Upload a photo of a business card, product catalog, or quotation
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-2xl mb-2">2️⃣</div>
            <h3 className="font-medium text-white">Extract</h3>
            <p className="text-gray-400">
              AI vision analyzes the image and extracts structured data
            </p>
          </div>
          <div className="bg-gray-700/50 rounded-lg p-4">
            <div className="text-2xl mb-2">3️⃣</div>
            <h3 className="font-medium text-white">Save</h3>
            <p className="text-gray-400">
              Review the extracted data and save it to your database
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
