import { useState, useEffect } from 'react'

interface ActivityLogEntry {
  id: number
  userId: number | null
  action: string
  entityType: string
  entityId: number | null
  details: string
  createdAt: string
}

export default function ActivityLogPage() {
  const [entries, setEntries] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadActivityLog()
  }, [])

  const loadActivityLog = async () => {
    try {
      const data = await window.go.main.App.GetActivityLog(100)
      setEntries(data || [])
    } catch (err) {
      console.error('Failed to load activity log:', err)
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return '🔑'
      case 'register': return '👤'
      case 'create': return '➕'
      case 'update': return '✏️'
      case 'delete': return '🗑️'
      default: return '📝'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity Log</h1>
        <p className="text-gray-400 mt-1">Track all system activities and changes.</p>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <span className="text-4xl mb-4 block">📜</span>
            No activity recorded yet
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {entries.map((entry) => (
              <div key={entry.id} className="px-6 py-4 hover:bg-gray-750">
                <div className="flex items-center gap-4">
                  <div className="text-2xl">{getActionIcon(entry.action)}</div>
                  <div className="flex-1">
                    <p className="text-white">{entry.details}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      {entry.entityType && <span className="capitalize">{entry.entityType}</span>}
                      {entry.entityId && <span> #{entry.entityId}</span>}
                    </p>
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(entry.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
