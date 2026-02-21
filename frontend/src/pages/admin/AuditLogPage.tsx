import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditLogApi, AuditLog } from '../../api/auditLog'
import { Card } from '../../components/ui/Card'

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const ACTION_COLORS: Record<string, string> = {
  CREATED: 'text-green-700 bg-green-50',
  UPDATED: 'text-blue-700 bg-blue-50',
  DELETED: 'text-red-700 bg-red-50',
  SUBMITTED: 'text-purple-700 bg-purple-50',
  LOGIN: 'text-gray-700 bg-gray-100',
}
function actionColor(action: string) {
  for (const [key, val] of Object.entries(ACTION_COLORS)) {
    if (action.includes(key)) return val
  }
  return 'text-gray-600 bg-gray-50'
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ entityType: '', action: '', dateFrom: '', dateTo: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['audit-log', page, filters],
    queryFn: () => auditLogApi.list({
      page,
      limit: 50,
      entityType: filters.entityType || undefined,
      action: filters.action || undefined,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom).toISOString() : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo).toISOString() : undefined,
    }),
  })
  const { data: actions = [] } = useQuery({ queryKey: ['audit-actions'], queryFn: auditLogApi.getActions })

  const logs = data?.data ?? []

  return (
    <div className="space-y-6" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">לוג ביקורת</h1>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500">סוג ישות</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5"
              placeholder="Client, Document, ..."
              value={filters.entityType}
              onChange={e => { setFilters(p => ({ ...p, entityType: e.target.value })); setPage(1) }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">פעולה</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5"
              value={filters.action}
              onChange={e => { setFilters(p => ({ ...p, action: e.target.value })); setPage(1) }}
            >
              <option value="">הכל</option>
              {actions.map((a: string) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">מתאריך</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5"
              value={filters.dateFrom} onChange={e => { setFilters(p => ({ ...p, dateFrom: e.target.value })); setPage(1) }} />
          </div>
          <div>
            <label className="text-xs text-gray-500">עד תאריך</label>
            <input type="date" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm mt-0.5"
              value={filters.dateTo} onChange={e => { setFilters(p => ({ ...p, dateTo: e.target.value })); setPage(1) }} />
          </div>
        </div>
      </Card>

      <Card title={`רשומות (${data?.total ?? 0})`}>
        {isLoading ? (
          <p className="text-gray-400 text-sm text-center py-8">טוען...</p>
        ) : logs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">אין רשומות</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-right border-b border-gray-100">
                    <th className="pb-2 font-semibold text-gray-600">תאריך</th>
                    <th className="pb-2 font-semibold text-gray-600">משתמש</th>
                    <th className="pb-2 font-semibold text-gray-600">פעולה</th>
                    <th className="pb-2 font-semibold text-gray-600">ישות</th>
                    <th className="pb-2 font-semibold text-gray-600">לקוח</th>
                    <th className="pb-2 font-semibold text-gray-600">מקור</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: AuditLog) => (
                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                      <td className="py-2 text-gray-700">
                        {log.user ? `${log.user.firstName} ${log.user.lastName}` : '—'}
                      </td>
                      <td className="py-2">
                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${actionColor(log.action)}`}>{log.action}</span>
                      </td>
                      <td className="py-2 text-gray-600 text-xs">{log.entityType}{log.entityId ? ` #${log.entityId.slice(-6)}` : ''}</td>
                      <td className="py-2 text-gray-600">{log.client?.name ?? '—'}</td>
                      <td className="py-2 text-gray-400 text-xs">{log.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {(data?.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  הקודם
                </button>
                <span className="text-sm text-gray-500">עמוד {page} מתוך {data?.totalPages}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages ?? 1)}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">
                  הבא
                </button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}
