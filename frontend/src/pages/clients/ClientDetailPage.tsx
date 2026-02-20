import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '../../api/clients'
import { Card } from '../../components/ui/Card'
import { Badge } from '../../components/ui/Badge'

const CLIENT_TYPE_LABELS: Record<string, string> = {
  OSEK_PATUR: 'עוסק פטור', OSEK_MURSHE: 'עוסק מורשה', CHEVRA_BVM: 'חברה בע"מ',
  SHUTAFUT: 'שותפות', AMUTA: 'עמותה', KIBBUTZ: 'קיבוץ', INDIVIDUAL: 'יחיד',
}

const STATUS_MAP: Record<string, { label: string; variant: 'default'|'red'|'yellow'|'green'|'blue'|'purple'|'gray' }> = {
  OPEN:          { label: 'פתוח',           variant: 'blue' },
  IN_PROGRESS:   { label: 'בעבודה',         variant: 'blue' },
  WAITING_CLIENT:{ label: 'ממתין ללקוח',    variant: 'yellow' },
  READY_REVIEW:  { label: 'מוכן לבדיקה',   variant: 'purple' },
  SUBMITTED:     { label: 'הוגש',           variant: 'green' },
  CLOSED:        { label: 'נסגר',           variant: 'gray' },
  OVERDUE:       { label: 'חריגה',          variant: 'red' },
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: client, isLoading } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientsApi.get(id!),
    enabled: !!id,
  })
  const { data: health } = useQuery({
    queryKey: ['client-health', id],
    queryFn: () => clientsApi.health(id!),
    enabled: !!id,
  })

  if (isLoading) return <div className="py-12 text-center text-gray-400">טוען...</div>
  if (!client) return <div className="text-red-600 p-4">לקוח לא נמצא</div>

  const healthColor = health ? (health.score >= 80 ? 'text-green-600' : health.score >= 50 ? 'text-yellow-600' : 'text-red-600') : ''

  return (
    <div className="space-y-5 max-w-6xl" dir="rtl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <Badge variant={client.isActive ? 'green' : 'gray'}>{client.isActive ? 'פעיל' : 'לא פעיל'}</Badge>
            {client.isFrozen && <Badge variant="red">מוקפא</Badge>}
          </div>
          <p className="text-gray-500">{CLIENT_TYPE_LABELS[client.clientType]} · ת.ז/ח.פ: {client.taxId}</p>
        </div>
        <div className="flex gap-2">
          <Link to={`/processes?clientId=${client.id}`} className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700">תהליכים</Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Details */}
        <Card title="פרטי לקוח" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['שם משפטי', client.legalName],
              ['מספר עוסק', client.vatNumber],
              ['מספר חברה', client.companyNumber],
              ['ענף', client.industry],
              ['אימייל', client.email],
              ['טלפון', client.phone],
              ['נייד', client.mobile],
              ['עיר', client.city],
              ['תדירות מע"מ', client.vatFrequency],
              ['יש שכר?', client.hasPayroll ? 'כן' : 'לא'],
              ['ייפוי כוח פעיל', client.powerOfAttorneyActive ? 'כן' : 'לא'],
            ].filter(([, v]) => v != null && v !== '').map(([label, value]) => (
              <div key={String(label)}>
                <span className="text-gray-500">{label}: </span>
                <span className="text-gray-900 font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
          {client.tags?.length > 0 && (
            <div className="mt-4 flex gap-2 flex-wrap">
              {client.tags.map(t => <Badge key={t.tag} variant="gray">{t.tag}</Badge>)}
            </div>
          )}
          {client.internalNotes && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              📝 {client.internalNotes}
            </div>
          )}
          {client.riskNotes && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {client.riskNotes}
            </div>
          )}
        </Card>

        {/* Health + Contacts */}
        <div className="space-y-4">
          {health && (
            <Card title="בריאות תיק">
              <div className="text-center">
                <div className={`text-5xl font-bold mb-2 ${healthColor}`}>{health.score}</div>
                <p className="text-sm text-gray-500 mb-3">{health.recommendation}</p>
                <div className="space-y-1 text-xs text-right">
                  <div className="flex justify-between"><span>חריגות 90 יום:</span><span>{health.components.overdueCount}</span></div>
                  <div className="flex justify-between"><span>מסמכים חסרים:</span><span>{health.components.openMissing}</span></div>
                  <div className="flex justify-between"><span>חובות פתוחים:</span><span>{health.components.openDebt}</span></div>
                </div>
              </div>
            </Card>
          )}

          {client.contacts && client.contacts.length > 0 && (
            <Card title="אנשי קשר">
              {client.contacts.map(c => (
                <div key={c.id} className="py-2 border-b last:border-0 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.isPrimary && <Badge variant="blue">ראשי</Badge>}
                  </div>
                  {c.role && <p className="text-gray-500 text-xs">{c.role}</p>}
                  {c.email && <p className="text-gray-600">{c.email}</p>}
                  {c.phone && <p className="text-gray-600">{c.phone}</p>}
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>

      {/* Recent processes */}
      {(client as any).processInstances?.length > 0 && (
        <Card title="תהליכים אחרונים">
          <div className="divide-y divide-gray-100">
            {(client as any).processInstances.slice(0, 5).map((p: any) => {
              const s = STATUS_MAP[p.status] ?? { label: p.status, variant: 'gray' as const }
              return (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <span className="font-medium text-sm">{p.template?.name}</span>
                    <span className="text-gray-500 text-sm mx-2">·</span>
                    <span className="text-gray-600 text-sm">{p.periodLabel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{new Date(p.dueDate).toLocaleDateString('he-IL')}</span>
                    <Badge variant={s.variant}>{s.label}</Badge>
                    <Link to={`/processes/${p.id}`} className="text-blue-600 text-sm hover:underline">פתח</Link>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
