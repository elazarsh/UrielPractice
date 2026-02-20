import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { clientsApi } from '../../api/clients'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { Client } from '../../types'

const CLIENT_TYPE_LABELS: Record<string, string> = {
  OSEK_PATUR: 'עוסק פטור', OSEK_MURSHE: 'עוסק מורשה', CHEVRA_BVM: 'חברה בע"מ',
  SHUTAFUT: 'שותפות', AMUTA: 'עמותה', KIBBUTZ: 'קיבוץ', INDIVIDUAL: 'יחיד',
}

function healthColor(score?: number) {
  if (!score) return 'gray'
  if (score >= 80) return 'green'
  if (score >= 50) return 'yellow'
  return 'red'
}

function ClientRow({ client }: { client: Client }) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <Link to={`/clients/${client.id}`} className="font-medium text-gray-900 hover:text-blue-600">
          {client.name}
        </Link>
        {client.city && <p className="text-xs text-gray-400">{client.city}</p>}
      </td>
      <td className="px-4 py-3">
        <Badge variant="default">{CLIENT_TYPE_LABELS[client.clientType] ?? client.clientType}</Badge>
      </td>
      <td className="px-4 py-3 text-sm text-gray-600 font-mono" dir="ltr">{client.taxId}</td>
      <td className="px-4 py-3">
        <div className="flex gap-1 flex-wrap">
          {client.tags?.slice(0, 3).map(t => (
            <Badge key={t.tag} variant="gray">{t.tag}</Badge>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        {client.healthScore != null && (
          <Badge variant={healthColor(client.healthScore)}>{client.healthScore}</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge variant={client.isActive ? 'green' : 'gray'}>{client.isActive ? 'פעיל' : 'לא פעיל'}</Badge>
      </td>
      <td className="px-4 py-3">
        <Link to={`/clients/${client.id}`} className="text-blue-600 hover:text-blue-800 text-sm">פרטים</Link>
      </td>
    </tr>
  )
}

export default function ClientsPage() {
  const [search, setSearch] = useState('')
  const [clientType, setClientType] = useState('')
  const [isActive, setIsActive] = useState('true')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, clientType, isActive, page],
    queryFn: () => clientsApi.list({ search: search || undefined, clientType: clientType || undefined, isActive, page, limit: 25 }),
    keepPreviousData: true,
  } as any)

  return (
    <div className="space-y-5" dir="rtl">
      {/* Filters */}
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="חיפוש שם / ת.ז / ח.פ..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1 min-w-48 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <select
            value={clientType}
            onChange={e => { setClientType(e.target.value); setPage(1) }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">כל הסוגים</option>
            {Object.entries(CLIENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select
            value={isActive}
            onChange={e => setIsActive(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="true">פעילים</option>
            <option value="false">לא פעילים</option>
            <option value="">הכל</option>
          </select>
          <Link
            to="/clients/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + לקוח חדש
          </Link>
        </div>
      </Card>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">טוען...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {['שם לקוח', 'סוג', 'ת.ז / ח.פ', 'תגיות', 'בריאות', 'סטטוס', ''].map(h => (
                      <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data?.data.map(c => <ClientRow key={c.id} client={c} />)}
                  {data?.data.length === 0 && (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">לא נמצאו לקוחות</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {data && data.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <span className="text-sm text-gray-500">סה"כ {data.total} לקוחות</span>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="px-3 py-1.5 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">הקודם</button>
                  <span className="px-3 py-1.5 text-sm">{page} / {data.totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
                    className="px-3 py-1.5 text-sm border rounded disabled:opacity-40 hover:bg-gray-50">הבא</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
