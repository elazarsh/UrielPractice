import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../../api/dashboard'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'
import { ProcessInstance } from '../../types'
import { Link } from 'react-router-dom'

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL')
}

function OverdueRow({ p }: { p: ProcessInstance & { overdueDays: number } }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-1 rounded">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-red-500 font-bold text-sm shrink-0">{p.overdueDays}י'</span>
        <div className="min-w-0">
          <Link to={`/clients/${p.client.id}`} className="font-medium text-gray-900 text-sm hover:text-blue-600 truncate block">{p.client.name}</Link>
          <span className="text-xs text-gray-500">{p.template.name} · {p.periodLabel}</span>
        </div>
      </div>
      <Link to={`/processes/${p.id}`}>
        <Badge variant="red">פתח</Badge>
      </Link>
    </div>
  )
}

function DueSoonRow({ p }: { p: ProcessInstance & { daysUntilDue: number } }) {
  const variant = p.daysUntilDue <= 3 ? 'red' : p.daysUntilDue <= 7 ? 'yellow' : 'green'
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0 hover:bg-gray-50 px-1 rounded">
      <div className="flex items-center gap-3 min-w-0">
        <Badge variant={variant} size="sm">{p.daysUntilDue}י'</Badge>
        <div className="min-w-0">
          <Link to={`/clients/${p.client.id}`} className="font-medium text-gray-900 text-sm hover:text-blue-600 truncate block">{p.client.name}</Link>
          <span className="text-xs text-gray-500">{p.template.name} · {formatDate(p.dueDate)}</span>
        </div>
      </div>
      <Link to={`/processes/${p.id}`}>
        <Badge variant="blue">פתח</Badge>
      </Link>
    </div>
  )
}

function StatCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={`rounded-xl p-4 ${color}`}>
      <p className="text-2xl font-bold">{count}</p>
      <p className="text-sm mt-1 font-medium">{label}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.getSummary,
    refetchInterval: 60_000,
  })

  if (isLoading) return <div className="flex items-center justify-center h-64 text-gray-500">טוען נתונים...</div>
  if (error || !data) return <div className="text-red-600 p-4">שגיאה בטעינת הדשבורד</div>

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="בחריגה"        count={data.counts.overdue}        color="bg-red-50 text-red-800" />
        <StatCard label="בקרוב"         count={data.counts.dueSoon}        color="bg-yellow-50 text-yellow-800" />
        <StatCard label="ממתין ללקוח"   count={data.counts.waitingClient}  color="bg-blue-50 text-blue-800" />
        <StatCard label="לבדיקה"        count={data.counts.readyForReview} color="bg-purple-50 text-purple-800" />
        <StatCard label="המשימות שלי"   count={data.counts.myTasks}        color="bg-green-50 text-green-800" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Overdue */}
        <Card title={`🔴 חריגים (${data.overdue.length})`}>
          {data.overdue.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">אין חריגים 🎉</p>
            : data.overdue.slice(0, 8).map(p => <OverdueRow key={p.id} p={p} />)
          }
        </Card>

        {/* Due Soon */}
        <Card title={`🟡 מתקרבים (${data.dueSoon.length})`}>
          {data.dueSoon.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">הכל בסדר ✅</p>
            : data.dueSoon.slice(0, 8).map(p => <DueSoonRow key={p.id} p={p} />)
          }
        </Card>

        {/* Waiting on client */}
        <Card title={`🔵 ממתין ללקוח (${data.waitingClient.length})`}>
          {data.waitingClient.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">אין המתנות ✅</p>
            : data.waitingClient.slice(0, 6).map(p => (
                <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div>
                    <Link to={`/clients/${p.client.id}`} className="font-medium text-sm text-gray-900 hover:text-blue-600">{p.client.name}</Link>
                    <p className="text-xs text-gray-500">{p.template.name} · {p.periodLabel}</p>
                  </div>
                  <Link to={`/processes/${p.id}`}><Badge variant="blue">פתח</Badge></Link>
                </div>
              ))
          }
        </Card>

        {/* My Tasks */}
        <Card title={`✅ המשימות שלי (${data.myTasks.length})`}>
          {data.myTasks.length === 0
            ? <p className="text-gray-400 text-sm text-center py-4">אין משימות פתוחות</p>
            : data.myTasks.slice(0, 6).map(t => (
                <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                    {t.client && <p className="text-xs text-gray-500">{t.client.name}</p>}
                  </div>
                  <Badge variant={t.priority === 'URGENT' ? 'red' : t.priority === 'HIGH' ? 'yellow' : 'gray'}>
                    {priorityLabel(t.priority)}
                  </Badge>
                </div>
              ))
          }
        </Card>
      </div>

      {/* Team workload */}
      {data.teamLoad.length > 0 && (
        <Card title="👥 עומס צוות">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.teamLoad.map(t => (
              <div key={t.user.id} className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-sm text-gray-800">{t.user.firstName} {t.user.lastName}</p>
                <p className="text-xs text-gray-500 mb-2">{t.user.role}</p>
                <div className="flex gap-3 text-xs">
                  <span className="text-blue-600 font-medium">{t.total} פתוחות</span>
                  {t.overdue > 0 && <span className="text-red-600 font-medium">{t.overdue} חריגות</span>}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function priorityLabel(p: string) {
  return { URGENT: 'דחוף', HIGH: 'גבוה', MEDIUM: 'בינוני', LOW: 'נמוך' }[p] ?? p
}
