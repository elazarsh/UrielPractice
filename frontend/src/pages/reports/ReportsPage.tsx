import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../../api/client'
import { Card } from '../../components/ui/Card'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(n)
}

interface KPI {
  totalClients: number
  activeProcesses: number
  overdueProcesses: number
  overdueRate: number
  openTasks: number
  pendingDocuments: number
  monthlyBillingTotal: number
  totalUnpaidBilling: number
  overduePayments: number
}

export default function ReportsPage() {
  const [year, setYear] = useState(new Date().getFullYear())

  const { data: kpi } = useQuery({
    queryKey: ['kpi'],
    queryFn: () => apiClient.get<KPI>('/reports/kpi').then(r => r.data),
  })

  const downloadCsv = (path: string, filename: string) => {
    const url = `/api${path}`
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    // Include auth cookie automatically (withCredentials handled by browser)
    a.click()
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">דוחות וייצוא</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">שנה:</label>
          <input type="number" className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-24"
            value={year} onChange={e => setYear(+e.target.value)} />
        </div>
      </div>

      {/* KPI Cards */}
      {kpi && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="text-center">
            <p className="text-3xl font-bold text-blue-600">{kpi.totalClients}</p>
            <p className="text-sm text-gray-500 mt-1">לקוחות פעילים</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-orange-600">{kpi.overdueProcesses}</p>
            <p className="text-sm text-gray-500 mt-1">תהליכים באיחור</p>
            <p className="text-xs text-gray-400">{kpi.overdueRate}% מהפעילים</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-red-600">{formatCurrency(kpi.totalUnpaidBilling)}</p>
            <p className="text-sm text-gray-500 mt-1">יתרת גביה</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-purple-600">{kpi.overduePayments}</p>
            <p className="text-sm text-gray-500 mt-1">תשלומי מס באיחור</p>
          </Card>
        </div>
      )}

      {/* Additional KPIs */}
      {kpi && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-700">{kpi.activeProcesses}</p>
            <p className="text-sm text-gray-500">תהליכים פעילים</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-700">{kpi.openTasks}</p>
            <p className="text-sm text-gray-500">משימות פתוחות</p>
          </Card>
          <Card className="text-center">
            <p className="text-2xl font-bold text-gray-700">{kpi.pendingDocuments}</p>
            <p className="text-sm text-gray-500">מסמכים ממתינים</p>
          </Card>
        </div>
      )}

      {/* Export buttons */}
      <Card title="ייצוא דוחות (CSV)">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'רשימת לקוחות', icon: '👥', path: '/reports/clients', filename: `clients-${year}.csv`, desc: 'כל הלקוחות הפעילים' },
            { label: 'דוח חיוב', icon: '💰', path: `/reports/billing?year=${year}`, filename: `billing-${year}.csv`, desc: `חיובים ותשלומים ${year}` },
            { label: 'דוח תהליכים', icon: '📋', path: `/reports/processes?year=${year}`, filename: `processes-${year}.csv`, desc: `כל התהליכים ${year}` },
            { label: 'תשלומי מסים', icon: '🏛️', path: `/reports/tax-payments?year=${year}`, filename: `tax-payments-${year}.csv`, desc: `VAT, ניכויים, בל"ל ${year}` },
          ].map(r => (
            <button
              key={r.path}
              onClick={() => downloadCsv(r.path, r.filename)}
              className="flex flex-col items-center gap-2 p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors group"
            >
              <span className="text-3xl">{r.icon}</span>
              <span className="font-medium text-gray-800 text-sm group-hover:text-blue-700">{r.label}</span>
              <span className="text-xs text-gray-400">{r.desc}</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">הורד CSV</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Payroll summary */}
      <PayrollSummarySection year={year} />
    </div>
  )
}

function PayrollSummarySection({ year }: { year: number }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const MONTHS = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-summary-report', year, month],
    queryFn: () => apiClient.get<{
      year: number
      month: number
      clientCount: number
      totalGross: number
      totalNet: number
      totalForm102: number
      clients: Array<{ clientId: string; clientName: string; employeeCount: number; totalGross: number; totalNet: number; form102Amount: number }>
    }>(`/reports/payroll-summary?year=${year}&month=${month}`).then(r => r.data),
  })

  return (
    <Card title="סיכום שכר" action={
      <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm" value={month} onChange={e => setMonth(+e.target.value)}>
        {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
      </select>
    }>
      {isLoading ? <p className="text-gray-400 text-sm text-center py-4">טוען...</p> :
        !data || data.clientCount === 0 ? <p className="text-gray-400 text-sm text-center py-4">אין נתוני שכר</p> : (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-lg font-bold">{new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(data.totalGross)}</p>
                <p className="text-xs text-gray-500">סה"כ ברוטו</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-lg font-bold text-green-700">{new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(data.totalNet)}</p>
                <p className="text-xs text-gray-500">סה"כ נטו</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <p className="text-lg font-bold text-purple-700">{new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(data.totalForm102)}</p>
                <p className="text-xs text-gray-500">סה"כ טופס 102</p>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b border-gray-100">
                  <th className="pb-1 font-semibold text-gray-600">לקוח</th>
                  <th className="pb-1 font-semibold text-gray-600">עובדים</th>
                  <th className="pb-1 font-semibold text-gray-600">ברוטו</th>
                  <th className="pb-1 font-semibold text-gray-600">טופס 102</th>
                </tr>
              </thead>
              <tbody>
                {data.clients.map(c => (
                  <tr key={c.clientId} className="border-b border-gray-50">
                    <td className="py-1.5">{c.clientName}</td>
                    <td className="py-1.5 text-gray-500">{c.employeeCount}</td>
                    <td className="py-1.5">{new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(c.totalGross)}</td>
                    <td className="py-1.5 text-purple-600">{new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(c.form102Amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
    </Card>
  )
}
