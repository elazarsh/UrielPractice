import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { processesApi } from '../../api/processes'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'

const STATUS_LABELS: Record<string, { label: string; color: 'default'|'red'|'yellow'|'green'|'blue'|'purple'|'gray' }> = {
  PENDING:        { label: 'ממתין',         color: 'gray'   },
  OPEN:           { label: 'פתוח',          color: 'blue'   },
  IN_PROGRESS:    { label: 'בעבודה',        color: 'blue'   },
  WAITING_CLIENT: { label: 'ממתין ללקוח',   color: 'yellow' },
  READY_REVIEW:   { label: 'לבדיקה',       color: 'purple' },
  UNDER_REVIEW:   { label: 'בבדיקה',       color: 'purple' },
  APPROVED:       { label: 'אושר',          color: 'green'  },
  SUBMITTED:      { label: 'הוגש',          color: 'green'  },
  CLOSED:         { label: 'נסגר',          color: 'gray'   },
  CANCELLED:      { label: 'בוטל',          color: 'gray'   },
}

export default function ProcessesPage() {
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState(searchParams.get('status') ?? '')
  const [isOverdue, setIsOverdue] = useState(searchParams.get('overdue') ?? '')
  const [clientId] = useState(searchParams.get('clientId') ?? '')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['processes', status, isOverdue, clientId, page],
    queryFn: () => processesApi.list({
      status: status || undefined,
      isOverdue: isOverdue || undefined,
      clientId: clientId || undefined,
      page, limit: 25,
    }),
    keepPreviousData: true,
  } as any)

  return (
    <div className="space-y-5" dir="rtl">
      <Card>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">כל הסטטוסים</option>
            {Object.entries(STATUS_LABELS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <select value={isOverdue} onChange={e => setIsOverdue(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">הכל</option>
            <option value="true">חריגים בלבד</option>
            <option value="false">ללא חריגים</option>
          </select>
        </div>
      </Card>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">טוען...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['לקוח', 'תהליך', 'תקופה', 'דדליין', 'סטטוס', 'חריגה', ''].map(h => (
                  <th key={h} className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.data.map(p => {
                const s = STATUS_LABELS[p.status] ?? { label: p.status, color: 'gray' as const }
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/clients/${p.client.id}`} className="font-medium text-gray-900 hover:text-blue-600 text-sm">{p.client.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.template.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.periodLabel}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{new Date(p.dueDate).toLocaleDateString('he-IL')}</td>
                    <td className="px-4 py-3"><Badge variant={s.color}>{s.label}</Badge></td>
                    <td className="px-4 py-3">
                      {p.isOverdue && <Badge variant="red">{p.overdueDays}י' חריגה</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/processes/${p.id}`} className="text-blue-600 hover:text-blue-800 text-sm">פרטים</Link>
                    </td>
                  </tr>
                )
              })}
              {!data?.data.length && (
                <tr><td colSpan={7} className="py-12 text-center text-gray-400">לא נמצאו תהליכים</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
