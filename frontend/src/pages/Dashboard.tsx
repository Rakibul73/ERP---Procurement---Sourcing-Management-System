import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'

interface DashboardStats {
  totalSuppliers: number
  activeSuppliers: number
  totalProducts: number
  totalCustomers: number
  pendingPOs: number
  totalPOValue: number
  draftPOs: number
  approvedPOs: number
  sentPOs: number
  confirmedPOs: number
  deliveredPOs: number
  openSourcing: number
  openTenders: number
  receivedQuotations: number
}

interface SpendingBySupplier {
  supplierName: string
  totalSpend: number
  poCount: number
}

interface MonthlySpend {
  month: string
  amount: number
}

interface TenderPerformance {
  tenderTitle: string
  quoteCount: number
  status: string
  lowestQuote: number
  avgQuote: number
}

interface ActivityLogEntry {
  id: number
  userName: string
  action: string
  entityType: string
  details: string
  createdAt: string
}

export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [spending, setSpending] = useState<SpendingBySupplier[]>([])
  const [monthlySpend, setMonthlySpend] = useState<MonthlySpend[]>([])
  const [tenderPerf, setTenderPerf] = useState<TenderPerformance[]>([])
  const [activity, setActivity] = useState<ActivityLogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [statsData, spendingData, monthlyData, tenderData, activityData] = await Promise.all([
        window.go.main.App.GetDashboardStats(),
        window.go.main.App.GetSpendingBySupplier(),
        window.go.main.App.GetMonthlySpend(),
        window.go.main.App.GetTenderPerformance(),
        window.go.main.App.GetActivityLog(10),
      ])
      setStats(statsData)
      setSpending(spendingData || [])
      setMonthlySpend(monthlyData || [])
      setTenderPerf(tenderData || [])
      setActivity(activityData || [])
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    )
  }

  const maxSpend = spending.length > 0 ? Math.max(...spending.map(s => s.totalSpend)) : 1
  const maxMonthly = monthlySpend.length > 0 ? Math.max(...monthlySpend.map(m => m.amount)) : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back, {user?.fullName || user?.username}</h1>
        <p className="text-gray-400 mt-1">Here's what's happening with your procurement today.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {[
          { label: 'Suppliers', value: stats?.totalSuppliers || 0, icon: '🏭', color: 'bg-blue-500' },
          { label: 'Products', value: stats?.totalProducts || 0, icon: '📦', color: 'bg-green-500' },
          { label: 'Customers', value: stats?.totalCustomers || 0, icon: '👥', color: 'bg-cyan-500' },
          { label: 'Pending POs', value: stats?.pendingPOs || 0, icon: '🛒', color: 'bg-yellow-500' },
          { label: 'Open Tenders', value: stats?.openTenders || 0, icon: '📋', color: 'bg-purple-500' },
          { label: 'PO Value', value: `$${(stats?.totalPOValue || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, icon: '💰', color: 'bg-emerald-500' },
        ].map((stat) => (
          <div key={stat.label} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center`}>
                <span className="text-xl">{stat.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PO Pipeline */}
      <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
        <h2 className="text-lg font-semibold text-white mb-4">Purchase Order Pipeline</h2>
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Draft', value: stats?.draftPOs || 0, color: 'bg-gray-500' },
            { label: 'Approved', value: stats?.approvedPOs || 0, color: 'bg-blue-500' },
            { label: 'Sent', value: stats?.sentPOs || 0, color: 'bg-purple-500' },
            { label: 'Confirmed', value: stats?.confirmedPOs || 0, color: 'bg-yellow-500' },
            { label: 'Delivered', value: stats?.deliveredPOs || 0, color: 'bg-green-500' },
          ].map((stage) => (
            <div key={stage.label} className="text-center">
              <div className={`${stage.color} rounded-lg h-16 flex items-center justify-center mb-2`}>
                <span className="text-2xl font-bold text-white">{stage.value}</span>
              </div>
              <span className="text-xs text-gray-400">{stage.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spending by Supplier */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Top Suppliers by Spend</h2>
          {spending.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No spending data yet</p>
          ) : (
            <div className="space-y-3">
              {spending.map((s) => (
                <div key={s.supplierName}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-300 truncate">{s.supplierName}</span>
                    <span className="text-white font-medium">${s.totalSpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div className="bg-primary-500 h-2 rounded-full transition-all"
                      style={{ width: `${(s.totalSpend / maxSpend) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Spend Trend */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Monthly Spend Trend</h2>
          {monthlySpend.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No spend data yet</p>
          ) : (
            <div className="flex items-end gap-1 h-40">
              {monthlySpend.map((m) => (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-400">
                    ${m.amount >= 1000 ? `${(m.amount / 1000).toFixed(0)}k` : m.amount.toFixed(0)}
                  </span>
                  <div className="w-full bg-primary-500 rounded-t"
                    style={{ height: `${(m.amount / maxMonthly) * 120}px`, minHeight: '2px' }}></div>
                  <span className="text-[9px] text-gray-500 rotate-45 origin-left">{m.month.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tender Performance */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Tender Performance</h2>
          {tenderPerf.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tender data yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-700">
                    <th className="text-left pb-2">Tender</th>
                    <th className="text-right pb-2">Quotes</th>
                    <th className="text-right pb-2">Lowest</th>
                    <th className="text-right pb-2">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {tenderPerf.map((t) => (
                    <tr key={t.tenderTitle} className="border-b border-gray-700/50">
                      <td className="py-2 text-white truncate max-w-[150px]">{t.tenderTitle}</td>
                      <td className="py-2 text-right text-gray-300">{t.quoteCount}</td>
                      <td className="py-2 text-right text-green-400">${t.lowestQuote.toLocaleString()}</td>
                      <td className="py-2 text-right text-gray-300">${t.avgQuote.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
          {activity.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No activity yet</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {activity.map((a) => (
                <div key={a.id} className="flex items-start gap-3 py-2 border-b border-gray-700/50 last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-2 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{a.details || `${a.action} ${a.entityType}`}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleString()}</span>
                      {a.userName && <span className="text-xs text-gray-500">by {a.userName}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
